const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message },
  });

const apiLimiter = make(
  env.rateLimit.windowMinutes * 60 * 1000,
  env.rateLimit.maxRequests,
  'Too many requests. Please try again later.'
);

const loginLimiter = make(15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.');

const paymentLimiter = make(10 * 60 * 1000, 8, 'Too many payment attempts. Please wait a few minutes and try again.');

const statusCheckLimiter = make(15 * 60 * 1000, 20, 'Too many status checks. Please try again later.');

const draftCreateLimiter = make(60 * 60 * 1000, 60, 'Too many new applications from this network. Please try again later.');

module.exports = { apiLimiter, loginLimiter, paymentLimiter, statusCheckLimiter, draftCreateLimiter };
