const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { statusCheckLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/publicController');

router.get('/settings', ctrl.getPublicSettings);
router.post(
  '/status-check',
  statusCheckLimiter,
  [
    body('applicationNumber').isString().trim().isLength({ min: 3, max: 40 }).withMessage('Application number is required'),
    body('phone').isString().trim().isLength({ min: 9, max: 16 }).withMessage('Phone number is required'),
  ],
  validate,
  ctrl.statusCheck
);

module.exports = router;
