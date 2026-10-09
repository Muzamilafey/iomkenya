const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Public branding images (logo, hero slideshow) — served from /uploads/public.
fs.mkdirSync(env.uploads.publicDir, { recursive: true });

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploads.publicDir),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${MIME_EXT[file.mimetype]}`),
});

const publicImageUpload = multer({
  storage,
  limits: { fileSize: Math.max(env.uploads.maxFileSizeMb, 5) * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) return cb(ApiError.badRequest('Only JPG, PNG and WEBP images are allowed'));
    cb(null, true);
  },
});

module.exports = { publicImageUpload };
