import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly uploadMode: 'local' | 's3';

  constructor(private readonly configService: ConfigService) {
    this.uploadMode = this.configService.get<string>('UPLOAD_MODE', 'local') as 'local' | 's3';

    if (this.uploadMode === 's3') {
      const region = this.configService.get<string>('AWS_REGION');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      }
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  getStorage() {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    return diskStorage({
      destination: uploadPath,
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    });
  }

  getFileFilter() {
    return (_req: any, file: Express.Multer.File, cb: any) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg|pdf)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não permitido'), false);
      }
    };
  }

  getLocalFileUrl(filename: string): string {
    return `/upload/${filename}`;
  }

  async uploadLocal(file: Express.Multer.File): Promise<UploadResult> {
    return {
      url: this.getLocalFileUrl(file.filename),
      key: file.filename,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadLocalMultiple(files: Express.Multer.File[]): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadLocal(file)));
  }

  private buildS3Key(originalName: string, options?: { folder?: string; fileName?: string }): string {
    const ext = extname(originalName);
    const baseName = options?.fileName
      ? this.sanitizeFileName(options.fileName)
      : uuid();
    const s3Path = this.configService.get<string>('AWS_S3_PATH', '');
    const folder = options?.folder ? `${this.sanitizeFileName(options.folder)}/` : '';
    return `${s3Path}${folder}${Date.now()}-${baseName}${ext}`;
  }

  private sanitizeFileName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async uploadS3(file: Express.Multer.File, options?: { folder?: string; fileName?: string }): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const key = this.buildS3Key(file.originalname, options);
    const bucket = this.configService.get<string>('AWS_BUCKET');
    const region = this.configService.get<string>('AWS_REGION');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: key,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadS3Multiple(files: Express.Multer.File[], options?: { folder?: string }): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadS3(file, options)));
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const bucket = this.configService.get<string>('AWS_BUCKET');

    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch {
      throw new Error(`Arquivo "${key}" não encontrado no bucket`);
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn: expirySeconds });
  }

  async getFileStream(key: string): Promise<{ stream: Readable; contentType: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const bucket = this.configService.get<string>('AWS_BUCKET');

    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch {
      throw new Error(`Arquivo "${key}" não encontrado no bucket`);
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    return {
      stream: response.Body as Readable,
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  async deleteS3(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const bucket = this.configService.get<string>('AWS_BUCKET');

    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch {
      throw new Error(`Arquivo "${key}" não encontrado no bucket`);
    }

    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  async upload(file: Express.Multer.File, options?: { folder?: string; fileName?: string }): Promise<UploadResult> {
    if (this.uploadMode === 's3') {
      return this.uploadS3(file, options);
    }
    return this.uploadLocal(file);
  }

  async uploadMultiple(files: Express.Multer.File[], options?: { folder?: string }): Promise<UploadResult[]> {
    if (this.uploadMode === 's3') {
      return this.uploadS3Multiple(files, options);
    }
    return this.uploadLocalMultiple(files);
  }

  async delete(key: string): Promise<void> {
    if (this.uploadMode === 's3') {
      return this.deleteS3(key);
    }
  }
}
