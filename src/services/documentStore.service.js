import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');

const baseDir = path.resolve(projectRoot, config.certificates.dir);

fs.mkdirSync(baseDir, { recursive: true });

export const documentStore = {
  dir: baseDir,

  ensureDir() {
    return fsPromises.mkdir(baseDir, { recursive: true });
  },

  absolutePath(filename) {
    const resolved = path.resolve(baseDir, filename);
    if (!resolved.startsWith(baseDir)) {
      throw new Error('Ruta de documento inválida');
    }
    return resolved;
  },

  async save(filename, buffer) {
    await this.ensureDir();
    const absolutePath = this.absolutePath(filename);
    await fsPromises.writeFile(absolutePath, buffer);
    return filename;
  },

  async read(filename) {
    return fsPromises.readFile(this.absolutePath(filename));
  },

  async exists(filename) {
    try {
      await fsPromises.access(this.absolutePath(filename));
      return true;
    } catch {
      return false;
    }
  },

  async remove(filename) {
    if (!filename) return;
    try {
      await fsPromises.unlink(this.absolutePath(filename));
    } catch {
      // El archivo ya no existe.
    }
  },
};
