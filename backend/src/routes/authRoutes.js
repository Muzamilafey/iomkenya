const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/authController');

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Password is required'),
  ],
  validate,
  auth.login
);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

module.exports = router;
