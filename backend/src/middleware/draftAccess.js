const crypto = require('crypto');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

function tokensMatch(a, b) {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Loads the application identified by `req.params.id` (or body.applicationId)
 * and checks the draft token sent in the X-Draft-Token header. The token is
 * issued once when the draft is created and only its hash is stored.
 */
const requireDraftAccess = asyncHandler(async (req, res, next) => {
  const id = req.params.id || req.body?.applicationId;
  const token = req.get('X-Draft-Token');
  if (!id || !mongoose.isValidObjectId(id) || !token) throw ApiError.notFound('Application not found');

  const application = await Application.findById(id).select('+draftTokenHash');
  if (!application || !tokensMatch(application.draftTokenHash, hashToken(token))) {
    throw ApiError.notFound('Application not found');
  }
  req.application = application;
  next();
});

module.exports = { requireDraftAccess, hashToken };
