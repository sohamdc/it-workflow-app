// Blocks the request unless req.user (set by authenticate.js) has the
// given permission. Usage: requirePermission('sop', 'publish')

const { hasPermission } = require('../utils/permissions');

function requirePermission(module, action) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user, `${module}:${action}`)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = requirePermission;