const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large (max ${env.uploads.maxFileSizeMb} MB)`
        : `Upload error: ${err.message}`;
  } else if (err.name === 'CastError') {
    status = 404;
    message = 'Not found';
  } else if (err.name === 'ValidationError') {
    status = 422;
    message = Object.values(err.errors)[0]?.message || 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (!(err instanceof ApiError) && status === 500) {
    console.error('[error]', err);
    if (env.isProduction) message = 'Internal server error';
  }

  const body = { success: false, message };
  if (details) body.details = details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
