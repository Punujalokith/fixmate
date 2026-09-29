import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export interface StoredFile {
  key: string; // path inside the storage, e.g. "2026/10/<uuid>.jpg"
  url: string; // public URL the app can load
}

/**
 * Saves uploads on local disk and serves them at /uploads/...
 * All storage access goes through this class, so switching to S3 / Cloudinary / R2 later
 * means changing only this file.
 */
@Injectable()
export class StorageService {
  private readonly root: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('UPLOAD_DIR', 'uploads'));
    this.baseUrl = config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  get directory() {
    return this.root;
  }

  async save(key: string, data: Buffer): Promise<StoredFile> {
    const path = this.safePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return { key, url: `${this.baseUrl}/uploads/${key}` };
  }

  async remove(key: string) {
    await unlink(this.safePath(key)).catch(() => undefined);
  }

  /** Blocks "../" tricks: the final path must stay inside the upload folder. */
  private safePath(key: string) {
    const path = resolve(join(this.root, key));
    if (!path.startsWith(this.root)) throw new Error('Invalid storage key');
    return path;
  }
}
