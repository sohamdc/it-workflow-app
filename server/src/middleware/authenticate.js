// Runs on every protected route. Reads the access token from the
// Authorization header, verifies it, and attaches the full user
// (with permissions) onto req.user for later middleware/controllers to use.

const { verifyAccessToken } = require('../utils/tokens');
const { getUserWithPermissions } = require('../utils/permissions');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization; // expected format: "Bearer <token>"
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const token = header.split(' ')[1];
    const decoded = verifyAccessToken(token); // throws if invalid/expired

    const user = await getUserWithPermissions(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
}

module.exports = authenticate;