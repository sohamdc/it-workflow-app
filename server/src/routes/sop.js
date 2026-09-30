const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/sopController');

router.use(authenticate); // every route below requires being logged in

router.get('/', requirePermission('sop', 'view'), ctrl.listSop);
router.post('/', requirePermission('sop', 'manage'), ctrl.createSop);
router.get('/:id', requirePermission('sop', 'view'), ctrl.getSop);
router.put('/:id', requirePermission('sop', 'manage'), ctrl.updateSop);

router.post('/:id/stages', requirePermission('sop', 'manage'), ctrl.addStage);
router.patch('/:id/stages/reorder', requirePermission('sop', 'manage'), ctrl.reorderStages);
router.patch('/:id/stages/:stageId', requirePermission('sop', 'manage'), ctrl.updateStage);
router.delete('/:id/stages/:stageId', requirePermission('sop', 'manage'), ctrl.deleteStage);

router.post('/:id/publish', requirePermission('sop', 'publish'), ctrl.publishSop);
router.post('/:id/new-draft', requirePermission('sop', 'manage'), ctrl.newDraftFromSop);

module.exports = router;