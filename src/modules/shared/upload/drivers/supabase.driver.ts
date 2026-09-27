import { InternalServerErrorException } from '@nestjs/common';
import { StorageDriver, StoredFile } from './storage-driver';

export interface SupabaseDriverConfig {
  /** Ex.: https://xyzcompany.supabase.co */
  url: string;
  /** Service role key (apenas no backend — nunca no frontend). */
  serviceKey: string;
  /** Bucket público do Supabase Storage. */
  bucket: string;
  pathPrefix?: string;
}

/** Usa a API REST do Supabase Storage (sem SDK). O bucket deve ser público para leitura. */
export class SupabaseStorageDriver implements StorageDriver {
  readonly name = 'supabase' as const;
  private readonly base: string;

  constructor(private readonly config: SupabaseDriverConfig) {
    this.base = `${config.url.replace(/\/$/, '')}/storage/v1`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const fullKey = `${this.config.pathPrefix ?? ''}${key}`;
    const res = await fetch(`${this.base}/object/${this.config.bucket}/${encodeURI(fullKey)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.serviceKey}`,
        apikey: this.config.serviceKey,
        'Content-Type': contentType,
        'x-upsert': 'false',
        'cache-control': 'max-age=31536000',
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Supabase Storage recusou o upload (${res.status}): ${await res.text()}`);
    }
    return {
      key: fullKey,
      url: `${this.base}/object/public/${this.config.bucket}/${encodeURI(fullKey)}`,
    };
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(`${this.base}/object/${this.config.bucket}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.config.serviceKey}`,
        apikey: this.config.serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [key] }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Supabase Storage recusou a remoção (${res.status}): ${await res.text()}`);
    }
  }
}
