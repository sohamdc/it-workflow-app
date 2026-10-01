const prisma = require('../config/db');
const writeAudit = require('../utils/writeAudit');
const { hasPermission } = require('../utils/permissions');
const { assertProjectAccess } = require('./projectController');

const VALID_STATUSES = ['NotStarted', 'InProgress', 'Blocked', 'OnHold', 'Completed'];

// Shared helper: loads the stage's parent project and checks the user
// is allowed to touch this project at all (reuses the same rule as viewing one).
async function loadStageWithAccess(stageId, user) {
  const stage = await prisma.projectStage.findUnique({
    where: { id: stageId },
    include: { project: { include: { members: true } } },
  });
  if (!stage) {
    const err = new Error('Stage not found');
    err.status = 404;
    throw err;
  }
  await assertProjectAccess(stage.project, user);
  return stage;
}

// PATCH /api/projects/:id/stages/:stageId/status
async function updateStatus(req, res, next) {
  try {
    const stageId = parseInt(req.params.stageId);
    const { status, blocker, reason, completionDate, dueDate } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const stage = await loadStageWithAccess(stageId, req.user);

    // Conditional field rules (R-conditional) — each status has one required field.
    if (status === 'Blocked' && !blocker) {
      return res.status(400).json({ message: 'blocker is required when status is Blocked' });
    }
    if (status === 'OnHold' && !reason) {
      return res.status(400).json({ message: 'reason is required when status is OnHold' });
    }
    if (status === 'Completed' && !completionDate) {
      return res.status(400).json({ message: 'completionDate is required when status is Completed' });
    }

    const oldStatus = stage.status;

    // Update + history row happen together — if one fails, both roll back.
    const updated = await prisma.$transaction(async (tx) => {
      const newStage = await tx.projectStage.update({
        where: { id: stageId },
        data: {
          status,
          blocker: status === 'Blocked' ? blocker : null,
          reason: status === 'OnHold' ? reason : null,
          completionDate: status === 'Completed' ? new Date(completionDate) : null,
          dueDate: dueDate !== undefined ? new Date(dueDate) : stage.dueDate,
        },
      });

      await tx.stageStatusHistory.create({
        data: {
          stageId,
          projectId: stage.projectId,
          oldStatus,
          newStatus: status,
          changedById: req.user.id,
        },
      });

      return newStage;
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'UPDATE_STATUS',
      entityType: 'ProjectStage',
      entityId: stageId,
      oldValue: { status: oldStatus },
      newValue: { status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:id/stages/:stageId/status-history
async function getStatusHistory(req, res, next) {
  try {
    const stageId = parseInt(req.params.stageId);
    await loadStageWithAccess(stageId, req.user);

    // Extra guard: even an internal-ish user without this specific permission
    // (shouldn't normally happen given current roles) can't see history.
    if (!hasPermission(req.user, 'projects:viewInternal')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const history = await prisma.stageStatusHistory.findMany({
      where: { stageId },
      orderBy: { at: 'desc' },
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:id/stages/:stageId/remarks
// Deliberately does NOT touch status — proves rule R1.
async function addRemark(req, res, next) {
  try {
    const stageId = parseInt(req.params.stageId);
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    await loadStageWithAccess(stageId, req.user);

    const remark = await prisma.stageRemark.create({
      data: { stageId, text, byId: req.user.id },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'ADD_REMARK',
      entityType: 'ProjectStage',
      entityId: stageId,
      newValue: remark,
    });

    res.status(201).json(remark);
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:id/stages/:stageId/documents
// Also does NOT touch status.
async function addDocument(req, res, next) {
  try {
    const stageId = parseInt(req.params.stageId);
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ message: 'name and url are required' });

    await loadStageWithAccess(stageId, req.user);

    const doc = await prisma.stageDocument.create({
      data: { stageId, name, url, byId: req.user.id },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'ADD_DOCUMENT',
      entityType: 'ProjectStage',
      entityId: stageId,
      newValue: doc,
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

module.exports = { updateStatus, getStatusHistory, addRemark, addDocument };