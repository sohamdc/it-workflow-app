const prisma = require('../config/db');

async function listAudit(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.action) where.action = req.query.action;
    if (req.query.from || req.query.to) {
      where.at = {};
      if (req.query.from) where.at.gte = new Date(req.query.from);
      if (req.query.to) where.at.lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // actorId is just a number in this table (no direct relation defined),
    // so we look up the names in one extra query and attach them manually.
    const actorIds = [...new Set(items.map((i) => i.actorId))];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    const itemsWithActor = items.map((i) => ({
      ...i,
      actor: actorMap[i.actorId] || null,
    }));

    res.json({ items: itemsWithActor, total, page });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAudit };