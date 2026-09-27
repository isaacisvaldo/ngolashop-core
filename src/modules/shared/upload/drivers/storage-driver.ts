export interface StoredFile {
  /** Identificador no storage (usado para apagar). */
  key: string;
  /** URL pública e absoluta do ficheiro. */
  url: string;
}

export interface StorageDriver {
  readonly name: 'local' | 's3' | 'supabase';
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}
