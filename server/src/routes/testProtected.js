const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');

// A throwaway route just to prove the middleware chain works.
// Only someone with "users:manage" permission (currently just Admin) can reach this.
router.get('/', authenticate, requirePermission('users', 'manage'), (req, res) => {
  res.json({ message: `Hello ${req.user.name}, you are allowed here.`, yourPermissions: req.user.permissions });
});

module.exports = router;