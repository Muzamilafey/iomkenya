const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Private applicant documents. Stored under UPLOAD_DIR (never served statically).
fs.mkdirSync(env.uploads.dir, { recursive: true });

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploads.dir),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${MIME_EXT[file.mimetype]}`),
});

const documentUpload = multer({
  storage,
  limits: { fileSize: env.uploads.maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) return cb(ApiError.badRequest('Only JPG and PNG images are allowed'));
    cb(null, true);
  },
});

module.exports = { documentUpload };
