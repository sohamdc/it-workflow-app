const prisma = require('../config/db');
const writeAudit = require('../utils/writeAudit');
const { hasPermission } = require('../utils/permissions');

// POST /api/projects — creates a project and auto-generates its stages
// from the latest published SOP. This is rule R7.
async function createProject(req, res, next) {
  try {
    const { name, description, owner, members = [], clientUsers = [] } = req.body;
    if (!name || !owner) {
      return res.status(400).json({ message: 'name and owner are required' });
    }

    // Find the most recently published SOP version.
    const latestSop = await prisma.sopVersion.findFirst({
      where: { status: 'published' },
      orderBy: { versionNumber: 'desc' },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    if (!latestSop) {
      return res.status(409).json({ message: 'No published SOP exists yet. Publish one first.' });
    }

    // Everything below happens in ONE transaction: if any step fails,
    // the whole thing rolls back — we never end up with a project that has
    // no stages, or stages without a project.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          description: description || null,
          sopVersionId: latestSop.id,
          ownerId: owner,
          createdById: req.user.id,
          members: {
            create: [
              ...members.map((userId) => ({ userId, kind: 'MEMBER' })),
              ...clientUsers.map((userId) => ({ userId, kind: 'CLIENT' })),
            ],
          },
          // The actual copy step: each SOP stage becomes a real ProjectStage,
          // starting fresh at NotStarted. sopVersionId on the parent Project
          // is what "remembers" which template version this came from.
          stages: {
            create: latestSop.stages.map((s) => ({
              name: s.name,
              order: s.order,
              clientVisible: s.clientVisible,
              status: 'NotStarted',
            })),
          },
        },
        include: { stages: true, members: true },
      });
      return created;
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'CREATE',
      entityType: 'Project',
      entityId: project.id,
      newValue: { name: project.name, sopVersionId: project.sopVersionId, stageCount: project.stages.length },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

// GET /api/projects — list projects visible to the current user
async function listProjects(req, res, next) {
  try {
    const canViewAll = hasPermission(req.user, 'projects:viewAll');

    const projects = await prisma.project.findMany({
      where: canViewAll
        ? {} // no filter — see everything
        : {
            // only projects where I'm the owner or a member (internal or client)
            OR: [
              { ownerId: req.user.id },
              { members: { some: { userId: req.user.id } } },
            ],
          },
      include: { stages: true },
      orderBy: { createdAt: 'desc' },
    });

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      sopVersionId: p.sopVersionId,
      stageCount: p.stages.length,
      completedCount: p.stages.filter((s) => s.status === 'Completed').length,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Internal helper: checks whether the current user is allowed to open this
// specific project (owner, member, or has projects:viewAll). Used by
// getProject here and reused by the stage routes in B8.
async function assertProjectAccess(project, user) {
  if (hasPermission(user, 'projects:viewAll')) return;
  if (project.ownerId === user.id) return;

  const isMember = project.members.some((m) => m.userId === user.id);
  if (isMember) return;

  const err = new Error('Not found');
  err.status = 404; // 404 rather than 403 — don't reveal that the project exists at all
  throw err;
}

// GET /api/projects/:id — full detail (filterClientData runs on this response, added in B9)
async function getProject(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order: 'asc' }, include: { remarks: true, documents: true } },
        members: true,
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    await assertProjectAccess(project, req.user);

    res.json(project);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/projects/:id/assign — change owner/members/clientUsers
async function assignProject(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { owner, members, clientUsers } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const data = {};
    if (owner !== undefined) data.ownerId = owner;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.project.update({ where: { id }, data });
      }
      // Members/clientUsers: simplest correct approach is replace-all —
      // delete existing membership rows for this project, then recreate.
      if (members !== undefined || clientUsers !== undefined) {
        await tx.projectMember.deleteMany({ where: { projectId: id } });
        const newMembers = [
          ...(members || []).map((userId) => ({ projectId: id, userId, kind: 'MEMBER' })),
          ...(clientUsers || []).map((userId) => ({ projectId: id, userId, kind: 'CLIENT' })),
        ];
        if (newMembers.length > 0) {
          await tx.projectMember.createMany({ data: newMembers });
        }
      }
    });

    const updated = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'ASSIGN',
      entityType: 'Project',
      entityId: id,
      newValue: { owner, members, clientUsers },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/projects/:id/stages/:stageId/assign — set which user owns a stage
async function assignStage(req, res, next) {
  try {
    const stageId = parseInt(req.params.stageId);
    const { assigneeId } = req.body;
    if (!assigneeId) return res.status(400).json({ message: 'assigneeId is required' });

    const stage = await prisma.projectStage.update({
      where: { id: stageId },
      data: { assigneeId },
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'ASSIGN_STAGE',
      entityType: 'ProjectStage',
      entityId: stageId,
      newValue: { assigneeId },
    });

    res.json(stage);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProject, listProjects, getProject, assignProject, assignStage, assertProjectAccess,
};