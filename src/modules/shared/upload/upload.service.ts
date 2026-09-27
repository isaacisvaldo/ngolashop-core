import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extname, join } from 'path';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';
import { StorageDriver } from './drivers/storage-driver';
import { LocalStorageDriver } from './drivers/local.driver';
import { S3StorageDriver } from './drivers/s3.driver';
import { SupabaseStorageDriver } from './drivers/supabase.driver';

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
  driver: StorageDriver['name'];
}

export type UploadMode = 'local' | 's3' | 'supabase';

/** Tipos aceites. SVG fica de fora de propósito: pode conter scripts (XSS). */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  readonly driver: StorageDriver;

  constructor(private readonly configService: ConfigService) {
    const mode = (this.configService.get<string>('UPLOAD_MODE') || 'local').toLowerCase() as UploadMode;
    this.driver = this.createDriver(mode);
    this.logger.log(`Uploads a usar o driver "${this.driver.name}"`);
  }

  private required(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value) throw new Error(`UPLOAD_MODE requer a variável de ambiente ${name}`);
    return value;
  }

  private createDriver(mode: UploadMode): StorageDriver {
    switch (mode) {
      case 's3':
        return new S3StorageDriver({
          region: this.required('AWS_REGION'),
          bucket: this.required('AWS_BUCKET'),
          accessKeyId: this.required('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.required('AWS_SECRET_ACCESS_KEY'),
          pathPrefix: this.configService.get<string>('AWS_S3_PATH', ''),
          publicUrl: this.configService.get<string>('AWS_PUBLIC_URL') || undefined,
          endpoint: this.configService.get<string>('AWS_ENDPOINT') || undefined,
        });
      case 'supabase':
        return new SupabaseStorageDriver({
          url: this.required('SUPABASE_URL'),
          serviceKey: this.required('SUPABASE_SERVICE_ROLE_KEY'),
          bucket: this.required('SUPABASE_BUCKET'),
          pathPrefix: this.configService.get<string>('SUPABASE_PATH', ''),
        });
      case 'local': {
        const port = this.configService.get<string>('PORT', '3008');
        const publicBase = (this.configService.get<string>('API_PUBLIC_URL') || `http://localhost:${port}/api`).replace(/\/$/, '');
        return new LocalStorageDriver(
          join(process.cwd(), this.configService.get<string>('UPLOAD_LOCAL_DIR', 'uploads')),
          publicBase,
        );
      }
      default:
        throw new Error(`UPLOAD_MODE inválido: "${String(mode)}". Use local, s3 ou supabase.`);
    }
  }

  get mode(): UploadMode {
    return this.driver.name;
  }

  validate(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      throw new BadRequestException('Tipo de ficheiro não permitido (use JPG, PNG, WEBP, GIF ou PDF)');
    }
  }

  private buildKey(file: Express.Multer.File, options?: { folder?: string; fileName?: string }): string {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? (extname(file.originalname).toLowerCase() || '');
    const base = options?.fileName ? this.sanitize(options.fileName) : uuid();
    const folder = options?.folder ? `${this.sanitize(options.folder)}/` : '';
    return `${folder}${Date.now()}-${base || uuid()}${ext}`;
  }

  private sanitize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  async upload(file: Express.Multer.File, options?: { folder?: string; fileName?: string }): Promise<UploadResult> {
    this.validate(file);
    const stored = await this.driver.put(this.buildKey(file, options), file.buffer, file.mimetype);
    return {
      url: stored.url,
      key: stored.key,
      filename: stored.key,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      driver: this.driver.name,
    };
  }

  async uploadMultiple(files: Express.Multer.File[], options?: { folder?: string }): Promise<UploadResult[]> {
    files.forEach((f) => this.validate(f));
    return Promise.all(files.map((file) => this.upload(file, options)));
  }

  async delete(key: string): Promise<void> {
    await this.driver.delete(key);
  }

  /** Caminho em disco de um ficheiro local (só no modo local). */
  localPath(key: string): string | null {
    return this.driver instanceof LocalStorageDriver ? this.driver.resolve(key) : null;
  }

  private s3(): S3StorageDriver {
    if (!(this.driver instanceof S3StorageDriver)) {
      throw new BadRequestException('Disponível apenas com UPLOAD_MODE=s3');
    }
    return this.driver;
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    const s3 = this.s3();
    try {
      await s3.client.send(new HeadObjectCommand({ Bucket: s3.bucket, Key: key }));
    } catch {
      throw new BadRequestException(`Ficheiro "${key}" não encontrado no bucket`);
    }
    return getSignedUrl(s3.client, new GetObjectCommand({ Bucket: s3.bucket, Key: key }), { expiresIn: expirySeconds });
  }

  async getFileStream(key: string): Promise<{ stream: Readable; contentType: string }> {
    const s3 = this.s3();
    const response = await s3.client.send(new GetObjectCommand({ Bucket: s3.bucket, Key: key }));
    return { stream: response.Body as Readable, contentType: response.ContentType ?? 'application/octet-stream' };
  }
}
