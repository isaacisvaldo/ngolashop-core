import { NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { StorageDriver, StoredFile } from './storage-driver';

/** Guarda os ficheiros na pasta `uploads/` do servidor e serve-os via GET /api/upload/local/:key. */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const;

  constructor(
    private readonly directory: string,
    private readonly publicBaseUrl: string,
  ) {
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  }

  async put(key: string, body: Buffer): Promise<StoredFile> {
    // Localmente as chaves são planas (sem subpastas) para poderem ser servidas por :filename
    const flatKey = key.replace(/\//g, '__');
    await writeFile(this.resolve(flatKey), body);
    return { key: flatKey, url: `${this.publicBaseUrl}/upload/local/${flatKey}` };
  }

  async delete(key: string): Promise<void> {
    const path = this.resolve(key);
    if (!existsSync(path)) throw new NotFoundException('Ficheiro não encontrado');
    await unlink(path);
  }

  /** Caminho absoluto seguro (impede path traversal). */
  resolve(key: string): string {
    return join(this.directory, basename(key));
  }
}
