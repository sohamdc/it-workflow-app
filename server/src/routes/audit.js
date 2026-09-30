const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const { listAudit } = require('../controllers/auditController');

router.get('/', authenticate, requirePermission('audit', 'view'), listAudit);

module.exports = router;