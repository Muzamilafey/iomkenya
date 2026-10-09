const env = require('../config/env');
const AdminUser = require('../models/AdminUser');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../middleware/auth');

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // Frontend and API may live on different sites in production.
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  };
}

function parseExpiryMs(value) {
  const m = /^(\d+)\s*([smhd])?$/.exec(String(value));
  if (!m) return 8 * 60 * 60 * 1000;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2] || 's'];
  return Number(m[1]) * mult;
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await AdminUser.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');

  // Same message for unknown email / wrong password / inactive to avoid enumeration.
  const invalid = ApiError.unauthorized('Invalid email or password');
  if (!admin) throw invalid;
  const ok = await admin.verifyPassword(password);
  if (!ok || !admin.isActive) throw invalid;

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(admin);
  res.cookie(env.jwt.cookieName, token, { ...cookieOptions(), maxAge: parseExpiryMs(env.jwt.expiresIn) });
  res.json({ success: true, data: { admin: admin.toSafeJSON(), token } });
});

exports.logout = (req, res) => {
  res.clearCookie(env.jwt.cookieName, cookieOptions());
  res.json({ success: true, message: 'Logged out' });
};

exports.me = (req, res) => {
  res.json({ success: true, data: { admin: req.admin.toSafeJSON() } });
};
