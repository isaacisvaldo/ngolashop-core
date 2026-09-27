import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageDriver, StoredFile } from './storage-driver';

export interface S3DriverConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Prefixo dentro do bucket, ex.: "ngola-bazaar/dev/" */
  pathPrefix?: string;
  /** URL pública opcional (CloudFront / domínio próprio). Por defeito usa o endpoint do bucket. */
  publicUrl?: string;
  /** Endpoint compatível com S3 (ex.: MinIO, Cloudflare R2). Opcional. */
  endpoint?: string;
}

export class S3StorageDriver implements StorageDriver {
  readonly name = 's3' as const;
  readonly client: S3Client;

  constructor(private readonly config: S3DriverConfig) {
    this.client = new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    });
  }

  get bucket() {
    return this.config.bucket;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const fullKey = `${this.config.pathPrefix ?? ''}${key}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: fullKey, Body: body, ContentType: contentType }),
    );
    const base = this.config.publicUrl?.replace(/\/$/, '') ?? `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    return { key: fullKey, url: `${base}/${fullKey}` };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}
