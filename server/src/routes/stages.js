const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/stageController');

router.use(authenticate);

// Note: :id (project id) isn't directly used in the controller logic here —
// access is checked via the stage's own project relation — but it stays in
// the URL to match the spec's nested route shape.
router.patch('/:id/stages/:stageId/status', requirePermission('stages', 'update'), ctrl.updateStatus);
router.get('/:id/stages/:stageId/status-history', ctrl.getStatusHistory); // permission checked inside (viewInternal)
router.post('/:id/stages/:stageId/remarks', requirePermission('stages', 'update'), ctrl.addRemark);
router.post('/:id/stages/:stageId/documents', requirePermission('stages', 'update'), ctrl.addDocument);

module.exports = router;