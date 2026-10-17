import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');

const uploadsDir = path.resolve(projectRoot, process.env.UPLOADS_DIR || 'storage/uploads');
const publicPath = `${config.basePath}${(process.env.UPLOADS_PUBLIC_PATH || '/uploads').replace(
  /\/$/,
  '',
)}`;

fs.mkdirSync(uploadsDir, { recursive: true });

export const storage = {
  root: uploadsDir,
  publicPath,

  dir(subdir = '') {
    return subdir ? path.join(uploadsDir, subdir) : uploadsDir;
  },

  ensureDir(subdir = '') {
    return fsPromises.mkdir(this.dir(subdir), { recursive: true });
  },

  ensureDirSync(subdir = '') {
    fs.mkdirSync(this.dir(subdir), { recursive: true });
  },

  relativePath(subdir, filename) {
    return [subdir, filename].filter(Boolean).join('/');
  },

  url(relativePathValue) {
    if (!relativePathValue) {
      return null;
    }
    return `${publicPath}/${relativePathValue}`;
  },

  async remove(relativePathValue) {
    if (!relativePathValue) {
      return;
    }
    const absolutePath = path.resolve(uploadsDir, relativePathValue);
    if (!absolutePath.startsWith(uploadsDir)) {
      return;
    }
    try {
      await fsPromises.unlink(absolutePath);
    } catch {
      // El archivo ya no existe; no es un error relevante.
    }
  },
};
