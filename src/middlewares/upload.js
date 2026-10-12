import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { storage } from '../services/storage.service.js';
import { AppError } from './error.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 5 * 1024 * 1024;
const SPEAKERS_SUBDIR = 'speakers';

storage.ensureDirSync(SPEAKERS_SUBDIR);

const diskStorage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, storage.dir(SPEAKERS_SUBDIR));
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = crypto.randomBytes(16).toString('hex');
    callback(null, `${name}${extension}`);
  },
});

export const uploadSpeakerPhoto = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          'Formato de imagen no permitido (usa JPG, PNG o WEBP)',
          400,
          'INVALID_FILE_TYPE',
        ),
      );
    }
    return callback(null, true);
  },
}).single('photo');
