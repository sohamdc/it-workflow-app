const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/tokens');
const { getUserWithPermissions } = require('../utils/permissions');

// Cookie settings shared by login and refresh, so they stay identical.
const REFRESH_COOKIE_NAME = 'refreshToken';
const cookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read this cookie — protects against XSS token theft
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production', // only require HTTPS in production, not on localhost
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds
};

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userRow = await prisma.user.findUnique({ where: { email } });
    if (!userRow) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!userRow.isActive) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const passwordMatches = await bcrypt.compare(password, userRow.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(userRow);
    const refreshToken = signRefreshToken(userRow);

    // Store only the HASH of the refresh token, never the raw token itself.
    await prisma.user.update({
      where: { id: userRow.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

    const user = await getUserWithPermissions(userRow.id);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRow = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!userRow || !userRow.isActive) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Confirm the cookie's token matches the hash we have on file.
    // If it doesn't match, this refresh token was already rotated out (reused/stolen token).
    if (userRow.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Rotation: issue a brand new pair, invalidating the old refresh token immediately.
    const newAccessToken = signAccessToken(userRow);
    const newRefreshToken = signRefreshToken(userRow);

    await prisma.user.update({
      where: { id: userRow.id },
      data: { refreshTokenHash: hashToken(newRefreshToken) },
    });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);

    const user = await getUserWithPermissions(userRow.id);
    res.json({ accessToken: newAccessToken, user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        await prisma.user.update({
          where: { id: decoded.sub },
          data: { refreshTokenHash: null },
        });
      } catch {
        // token was already invalid/expired — nothing to clean up, safe to ignore
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout };