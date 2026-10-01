// Runs AFTER a project controller builds its response, but BEFORE it's sent.
// If the requester lacks projects:viewInternal, this strips:
//   - any stage where clientVisible is false
//   - from the remaining stages: remarks, documents, blocker, reason, assignee
//   - at the project level: internal member details
//
// This is triggered by a missing PERMISSION, never by checking role name directly —
// that's what keeps RBAC fully DB-driven (rule RX).

const { hasPermission } = require('../utils/permissions');

function sanitizeStage(stage) {
  // Only the fields a client is allowed to see survive.
  return {
    id: stage.id,
    name: stage.name,
    order: stage.order,
    status: stage.status,
    dueDate: stage.dueDate,
    completionDate: stage.completionDate,
  };
}

// function sanitizeProject(project) {
//   const visibleStages = project.stages
//     .filter((s) => s.clientVisible === true)
//     .map(sanitizeStage);

//   return {
//     id: project.id,
//     name: project.name,
//     description: project.description,
//     sopVersionId: project.sopVersionId,
//     stages: visibleStages,
//     // members/owner/createdBy intentionally omitted for client responses
//   };
// }

// Wraps res.json so that whatever the controller sends gets sanitized first,
// IF the current user lacks projects:viewInternal. This is Express middleware,
// so it must sit BEFORE the controller in the route chain to patch res.json early.

function sanitizeProject(project) {
  const visibleStages = project.stages
    .filter((s) => s.clientVisible === true)
    .map(sanitizeStage);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    sopVersionId: project.sopVersionId,
    stageCount: visibleStages.length,
    completedCount: visibleStages.filter((s) => s.status === 'Completed').length,
    stages: visibleStages,
  };
}

function filterClientData(req, res, next) {
  if (hasPermission(req.user, 'projects:viewInternal')) {
    // Internal users (SuperAdmin, Admin, ITMember) see everything — no change.
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    let sanitized = body;

    if (Array.isArray(body)) {
      // GET /projects list response
      sanitized = body.map((p) => (p.stages ? sanitizeProject(p) : p));
    } else if (body && body.stages) {
      // GET /projects/:id single project response
      sanitized = sanitizeProject(body);
    }
    // Anything else (e.g. a plain stage object from status update, which a
    // client shouldn't be calling anyway due to permission checks) passes through unchanged.

    return originalJson(sanitized);
  };

  next();
}

module.exports = filterClientData;