const prisma = require('../config/db');
const writeAudit = require('../utils/writeAudit');

// GET /api/sop — list all versions with a stage count, newest first
async function listSop(req, res, next) {
  try {
    const versions = await prisma.sopVersion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { stages: true } } },
    });

    const result = versions.map((v) => ({
      id: v.id,
      name: v.name,
      versionNumber: v.versionNumber,
      status: v.status,
      publishedAt: v.publishedAt,
      stageCount: v._count.stages,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/sop — create a new draft
async function createSop(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const sop = await prisma.sopVersion.create({
      data: { name, status: 'draft' },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'CREATE',
      entityType: 'SopVersion',
      entityId: sop.id,
      newValue: sop,
    });

    res.status(201).json(sop);
  } catch (err) {
    next(err);
  }
}

// GET /api/sop/:id — one version with its stages, ordered
async function getSop(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const sop = await prisma.sopVersion.findUnique({
      where: { id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    if (!sop) return res.status(404).json({ message: 'SOP not found' });
    res.json(sop);
  } catch (err) {
    next(err);
  }
}

// Small internal helper: throws a 409-style error if this SOP isn't a draft.
// Used by every edit operation below, so published SOPs stay immutable (R5).
async function requireDraft(id) {
  const sop = await prisma.sopVersion.findUnique({ where: { id } });
  if (!sop) {
    const err = new Error('SOP not found');
    err.status = 404;
    throw err;
  }
  if (sop.status !== 'draft') {
    const err = new Error('Published SOP is immutable');
    err.status = 409;
    throw err;
  }
  return sop;
}

// PUT /api/sop/:id — rename a draft
async function updateSop(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await requireDraft(id);

    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const updated = await prisma.sopVersion.update({ where: { id }, data: { name } });

    await writeAudit({
      actorId: req.user.id,
      action: 'UPDATE',
      entityType: 'SopVersion',
      entityId: id,
      newValue: updated,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/sop/:id/stages — add a new stage at the end
async function addStage(req, res, next) {
  try {
    const sopVersionId = parseInt(req.params.id);
    await requireDraft(sopVersionId);

    const { name, clientVisible } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    // New stage goes at the end — find the current highest order.
    const lastStage = await prisma.sopStage.findFirst({
      where: { sopVersionId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastStage ? lastStage.order + 1 : 1;

    const stage = await prisma.sopStage.create({
      data: { sopVersionId, name, order: nextOrder, clientVisible: !!clientVisible },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'ADD_STAGE',
      entityType: 'SopVersion',
      entityId: sopVersionId,
      newValue: stage,
    });

    res.status(201).json(stage);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/sop/:id/stages/:stageId — rename or toggle clientVisible
async function updateStage(req, res, next) {
  try {
    const sopVersionId = parseInt(req.params.id);
    const stageId = parseInt(req.params.stageId);
    await requireDraft(sopVersionId);

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.clientVisible !== undefined) data.clientVisible = !!req.body.clientVisible;

    const stage = await prisma.sopStage.update({ where: { id: stageId }, data });

    await writeAudit({
      actorId: req.user.id,
      action: 'UPDATE_STAGE',
      entityType: 'SopVersion',
      entityId: sopVersionId,
      newValue: stage,
    });

    res.json(stage);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sop/:id/stages/:stageId — remove a stage and re-sequence the rest
async function deleteStage(req, res, next) {
  try {
    const sopVersionId = parseInt(req.params.id);
    const stageId = parseInt(req.params.stageId);
    await requireDraft(sopVersionId);

    await prisma.sopStage.delete({ where: { id: stageId } });

    // Re-sequence remaining stages so "order" stays a clean 1..n with no gaps.
    const remaining = await prisma.sopStage.findMany({
      where: { sopVersionId },
      orderBy: { order: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i + 1) {
        await prisma.sopStage.update({ where: { id: remaining[i].id }, data: { order: i + 1 } });
      }
    }

    await writeAudit({
      actorId: req.user.id,
      action: 'DELETE_STAGE',
      entityType: 'SopVersion',
      entityId: sopVersionId,
      oldValue: { stageId },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/sop/:id/stages/reorder — body: { orderedStageIds: [3,1,2] }
async function reorderStages(req, res, next) {
  try {
    const sopVersionId = parseInt(req.params.id);
    await requireDraft(sopVersionId);

    const { orderedStageIds } = req.body;
    if (!Array.isArray(orderedStageIds)) {
      return res.status(400).json({ message: 'orderedStageIds must be an array' });
    }

    // The array's position IS the new order — index 0 becomes order 1, etc.
    for (let i = 0; i < orderedStageIds.length; i++) {
      await prisma.sopStage.update({
        where: { id: orderedStageIds[i] },
        data: { order: i + 1 },
      });
    }

    await writeAudit({
      actorId: req.user.id,
      action: 'REORDER_STAGES',
      entityType: 'SopVersion',
      entityId: sopVersionId,
      newValue: { orderedStageIds },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/sop/:id/publish — locks the draft as an immutable, numbered version
async function publishSop(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const sop = await requireDraft(id); // also confirms it exists and is still a draft

    const stageCount = await prisma.sopStage.count({ where: { sopVersionId: id } });
    if (stageCount === 0) {
      return res.status(400).json({ message: 'Cannot publish an SOP with no stages' });
    }

    const lastPublished = await prisma.sopVersion.findFirst({
      where: { status: 'published' },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = lastPublished ? lastPublished.versionNumber + 1 : 1;

    const published = await prisma.sopVersion.update({
      where: { id },
      data: {
        status: 'published',
        versionNumber: nextVersionNumber,
        publishedAt: new Date(),
      },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'PUBLISH',
      entityType: 'SopVersion',
      entityId: id,
      oldValue: sop,
      newValue: published,
    });

    res.json(published);
  } catch (err) {
    next(err);
  }
}

// POST /api/sop/:id/new-draft — copies a version's stages into a fresh draft
async function newDraftFromSop(req, res, next) {
  try {
    const sourceId = parseInt(req.params.id);
    const source = await prisma.sopVersion.findUnique({
      where: { id: sourceId },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!source) return res.status(404).json({ message: 'SOP not found' });

    const draft = await prisma.sopVersion.create({
      data: {
        name: `${source.name} (copy)`,
        status: 'draft',
        stages: {
          create: source.stages.map((s) => ({
            name: s.name,
            order: s.order,
            clientVisible: s.clientVisible,
          })),
        },
      },
      include: { stages: true },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'CREATE_DRAFT_FROM',
      entityType: 'SopVersion',
      entityId: draft.id,
      newValue: { copiedFrom: sourceId },
    });

    res.status(201).json(draft);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSop, createSop, getSop, updateSop,
  addStage, updateStage, deleteStage, reorderStages,
  publishSop, newDraftFromSop,
};