const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const filterClientData = require('../middleware/filterClientData');
const ctrl = require('../controllers/projectController');

router.use(authenticate);

router.post('/', requirePermission('projects', 'create'), ctrl.createProject);
router.get('/', requirePermission('projects', 'view'), filterClientData, ctrl.listProjects);
router.get('/:id', requirePermission('projects', 'view'), filterClientData, ctrl.getProject);
router.patch('/:id/assign', requirePermission('projects', 'assign'), ctrl.assignProject);
router.patch('/:id/stages/:stageId/assign', requirePermission('projects', 'assign'), ctrl.assignStage);

module.exports = router;