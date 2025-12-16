import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = 'uploads';
const BASE_URL = 'http://localhost:3000/uploads'; // Or from env

export const storage = {
  async saveFile(file: File, folder = 'misc'): Promise<string> {
    const buffer = await file.arrayBuffer();
    const ext = file.name ? file.name.split('.').pop() : 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const path = join(UPLOADS_DIR, folder, filename);

    // Use absolute path
    const writePath = join(process.cwd(), path);
    const dir = writePath.split('/').slice(0, -1).join('/');

    // Ensure directory exists
    const fs = await import('node:fs/promises');
    if (
      !(await fs
        .access(dir)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.mkdir(dir, { recursive: true });
    }

    console.log(`[Storage] Writing ${buffer.byteLength} bytes to: ${writePath}`);

    // Write file
    await Bun.write(writePath, buffer);

    // Verify
    const exists = await fs
      .access(writePath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      const stats = await fs.stat(writePath);
      console.log(`[Storage] SUCCESS. File on disk. Size: ${stats.size}`);
    } else {
      console.error(`[Storage] CRITICAL FAILURE. File written but not found at ${writePath}`);
    }

    return `${BASE_URL}/${folder}/${filename}`;
  },

  async saveBuffer(buffer: ArrayBuffer, folder = 'misc', ext = 'png'): Promise<string> {
    const filename = `${randomUUID()}.${ext}`;
    const path = join(UPLOADS_DIR, folder, filename);
    const writePath = join(process.cwd(), path);
    const dir = writePath.split('/').slice(0, -1).join('/');

    const fs = await import('node:fs/promises');
    if (
      !(await fs
        .access(dir)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.mkdir(dir, { recursive: true });
    }

    await Bun.write(writePath, buffer);

    return `${BASE_URL}/${folder}/${filename}`;
  },
};
