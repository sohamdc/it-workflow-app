const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/userController');

router.use(authenticate);

router.get('/', requirePermission('users', 'manage'), ctrl.listUsers);
router.post('/', requirePermission('users', 'manage'), ctrl.createUser);
router.patch('/:id/deactivate', requirePermission('users', 'manage'), ctrl.deactivateUser);
router.post('/:id/reassign', requirePermission('users', 'manage'), ctrl.reassignUser);

module.exports = router;