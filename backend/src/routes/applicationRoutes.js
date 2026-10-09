const router = require('express').Router();
const { requireDraftAccess } = require('../middleware/draftAccess');
const { documentUpload } = require('../middleware/upload');
const { draftCreateLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/applicationController');

router.post('/', draftCreateLimiter, ctrl.createApplication);
router.get('/:id', requireDraftAccess, ctrl.getApplication);
router.patch('/:id', requireDraftAccess, ctrl.updateApplication);
// Token is checked before multer so unauthenticated uploads never touch disk.
router.post('/:id/documents/:type', requireDraftAccess, documentUpload.single('file'), ctrl.uploadDocument);
router.post('/:id/review', requireDraftAccess, ctrl.reviewApplication);

module.exports = router;
