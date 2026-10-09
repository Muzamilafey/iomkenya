const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AdminUser = require('../models/AdminUser');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(admin) {
  return jwt.sign({ sub: String(admin._id), role: admin.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

function extractToken(req) {
  const cookieToken = req.cookies?.[env.jwt.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
  }

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Account is inactive or no longer exists');

  req.admin = admin;
  next();
});

// Use after requireAuth. Role is read from the database, not the token.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) return next(ApiError.unauthorized());
  if (!roles.includes(req.admin.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { signToken, requireAuth, requireRole };
