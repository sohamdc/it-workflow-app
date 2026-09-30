// Reusable helper: every controller that creates/updates/deletes something
// important calls this so there's a permanent trail of who did what.
// This table is insert-only — nothing here is ever updated or deleted.

const prisma = require('../config/db');

async function writeAudit({ actorId, action, entityType, entityId, oldValue = null, newValue = null }) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,          // e.g. "CREATE", "UPDATE_STATUS", "PUBLISH", "DEACTIVATE"
      entityType,       // e.g. "Project", "ProjectStage", "SopVersion", "User"
      entityId: String(entityId),
      oldValue,          // Prisma's Json field accepts plain objects directly
      newValue,
    },
  });
}

module.exports = writeAudit;