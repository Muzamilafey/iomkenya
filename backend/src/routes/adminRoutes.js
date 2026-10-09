const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { publicImageUpload } = require('../middleware/logoUpload');
const { ROLES, ADMIN_ROLES, ADMIN_SETTABLE_STATUSES } = require('../utils/constants');

const dashboard = require('../controllers/adminDashboardController');
const apps = require('../controllers/adminApplicationController');
const payments = require('../controllers/adminPaymentController');
const reports = require('../controllers/reportController');
const settings = require('../controllers/settingsController');
const users = require('../controllers/adminUserController');

const { SUPER_ADMIN, APPLICATION_OFFICER, FINANCE_OFFICER, VIEWER } = ROLES;
const canViewApps = requireRole(SUPER_ADMIN, APPLICATION_OFFICER, VIEWER);
const canEditApps = requireRole(SUPER_ADMIN, APPLICATION_OFFICER);
const canViewPayments = requireRole(SUPER_ADMIN, FINANCE_OFFICER);
const superOnly = requireRole(SUPER_ADMIN);

router.use(requireAuth);

router.get('/dashboard/stats', dashboard.getStats);

router.get('/applications', canViewApps, apps.listApplications);
router.get('/applications/:id', canViewApps, apps.getApplication);
router.get('/applications/:id/documents/:type', canViewApps, apps.streamDocument);
router.get('/applications/:id/summary.pdf', canViewApps, apps.summaryPdf);
router.patch(
  '/applications/:id/status',
  canEditApps,
  [
    body('status').isIn(ADMIN_SETTABLE_STATUSES).withMessage('Invalid status'),
    body('note').optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  apps.updateStatus
);
router.post(
  '/applications/:id/notes',
  canEditApps,
  [body('note').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Note cannot be empty')],
  validate,
  apps.addNote
);

router.get('/payments', canViewPayments, payments.listPayments);

router.get('/reports/summary', canViewApps, reports.summary);
router.get('/reports/applications.csv', canViewApps, reports.applicationsCsv);
router.get('/reports/payments.csv', canViewPayments, reports.paymentsCsv);

router.get('/settings', superOnly, settings.getSettings);
router.patch(
  '/settings',
  superOnly,
  [
    body('agencyName').optional().isString().trim().isLength({ min: 2, max: 120 }).withMessage('Agency name must be 2–120 characters'),
    body('heroHeadline').optional().isString().isLength({ max: 200 }),
    body('heroSubheadline').optional().isString().isLength({ max: 500 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid contact email'),
    body('contactPhone').optional().isString().isLength({ max: 30 }),
    body('address').optional().isString().isLength({ max: 300 }),
    body('manifestRequired').optional().isBoolean(),
    body('notifyOnSubmission').optional().isBoolean(),
    body('notifyOnPaymentFailure').optional().isBoolean(),
  ],
  validate,
  settings.updateSettings
);
router.post('/settings/test-email', superOnly, settings.sendTestEmail);
router.post('/settings/logo', superOnly, publicImageUpload.single('logo'), settings.uploadLogo);
router.delete('/settings/logo', superOnly, settings.removeLogo);
router.post('/settings/hero-images', superOnly, publicImageUpload.array('images', 6), settings.uploadHeroImages);
router.delete('/settings/hero-images', superOnly, settings.deleteHeroImage);

router.get('/users', superOnly, users.listUsers);
router.post(
  '/users',
  superOnly,
  [
    body('name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isString().isLength({ min: 8, max: 200 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(ADMIN_ROLES).withMessage('Invalid role'),
  ],
  validate,
  users.createUser
);
router.patch(
  '/users/:id',
  superOnly,
  [
    body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('role').optional().isIn(ADMIN_ROLES).withMessage('Invalid role'),
    body('isActive').optional().isBoolean(),
    body('password').optional({ values: 'falsy' }).isString().isLength({ min: 8, max: 200 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  users.updateUser
);

module.exports = router;
