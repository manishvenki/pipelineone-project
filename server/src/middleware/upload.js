import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import env from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `zip-${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'multipart/x-zip',
  ];

  if (ext !== '.zip') {
    return cb(new Error('Only ZIP files (.zip) are allowed for direct project upload'));
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`Invalid archive MIME type: ${file.mimetype}`));
  }

  cb(null, true);
};

export const uploadZipMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

export default uploadZipMiddleware;

