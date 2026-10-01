const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const writeAudit = require('../utils/writeAudit');

// GET /api/users
async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { id: 'asc' },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      isActive: u.isActive,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/roles — small helper endpoint so the frontend can populate a role dropdown
async function listRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    res.json(roles);
  } catch (err) {
    next(err);
  }
}

// POST /api/users
async function createUser(req, res, next) {
  try {
    const { name, email, password, roleId } = req.body;
    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ message: 'name, email, password, and roleId are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, roleId },
      include: { role: true },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValue: { name, email, role: user.role.name },
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role.name, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/deactivate — the key rule RD
async function deactivateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find every stage this user is still actively responsible for.
    const activeStages = await prisma.projectStage.findMany({
      where: {
        assigneeId: id,
        status: { not: 'Completed' },
      },
      include: { project: true },
    });

    if (activeStages.length > 0) {
      return res.status(409).json({
        message: 'This user has active stage assignments. Reassign them before deactivating.',
        assignments: activeStages.map((s) => ({
          stageId: s.id,
          stageName: s.name,
          projectId: s.projectId,
          projectName: s.project.name,
        })),
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false, refreshTokenHash: null }, // clearing the hash forces them out on their next refresh attempt
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'DEACTIVATE',
      entityType: 'User',
      entityId: id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/reassign — body: { toUserId }
async function reassignUser(req, res, next) {
  try {
    const fromUserId = parseInt(req.params.id);
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ message: 'toUserId is required' });

    const targetUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({ message: 'Target user must exist and be active' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const stagesToMove = await tx.projectStage.findMany({
        where: { assigneeId: fromUserId, status: { not: 'Completed' } },
      });

      await tx.projectStage.updateMany({
        where: { assigneeId: fromUserId, status: { not: 'Completed' } },
        data: { assigneeId: toUserId },
      });

      return stagesToMove.length;
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'REASSIGN',
      entityType: 'User',
      entityId: fromUserId,
      newValue: { toUserId, movedCount: result },
    });

    res.json({ moved: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, listRoles, createUser, deactivateUser, reassignUser };