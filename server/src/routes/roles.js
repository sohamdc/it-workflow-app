const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/userController');

router.use(authenticate);
router.get('/', requirePermission('users', 'manage'), ctrl.listRoles);

module.exports = router;