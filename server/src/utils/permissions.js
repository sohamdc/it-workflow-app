// Loads a user's full permission list ("module:action" strings) from the database,
// by following User -> Role -> RolePermission -> Permission.
// This is the heart of "DB-driven RBAC" — nothing here is hard-coded to a role name.

const prisma = require('../config/db');

async function getUserWithPermissions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  const permissions = user.role.permissions.map(
    (rp) => `${rp.permission.module}:${rp.permission.action}`
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    role: user.role.name,
    permissions,
  };
}

function hasPermission(user, permissionKey) {
  return user.permissions.includes(permissionKey);
}

module.exports = { getUserWithPermissions, hasPermission };