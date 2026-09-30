// Helper functions for creating and checking JWT tokens.
// Keeping this logic in one place means auth.js and the authenticate
// middleware both use identical rules.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(user) {
  // "sub" (subject) is the standard JWT field for "who is this token about".
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// We never store the raw refresh token in the database — only its hash.
// If the database were ever leaked, the stolen hashes couldn't be used as real tokens.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};