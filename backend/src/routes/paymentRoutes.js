const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { requireDraftAccess } = require('../middleware/draftAccess');
const ctrl = require('../controllers/paymentController');

router.post(
  '/initiate',
  paymentLimiter,
  [
    body('applicationId').isMongoId().withMessage('Invalid application'),
    body('phone').isString().isLength({ min: 9, max: 16 }).withMessage('Phone number is required'),
  ],
  validate,
  requireDraftAccess,
  ctrl.initiatePayment
);
// POST /mpesa/callback is mounted in app.js ahead of the global rate limiter.
router.get('/status/:checkoutRequestId', ctrl.getPaymentStatus);

module.exports = router;
