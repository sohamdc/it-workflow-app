// This script resets and fills the database with starter data:
// permissions, roles, 4 test users, and one published SOP template.
// Safe to run multiple times — it clears old data first (in the right order,
// respecting foreign keys) before recreating everything.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Every permission this app understands. Format: "module:action".
const PERMISSIONS = [
  ['sop', 'manage'],
  ['sop', 'publish'],
  ['sop', 'view'],
  ['roles', 'manage'],
  ['users', 'manage'],
  ['projects', 'create'],
  ['projects', 'assign'],
  ['projects', 'viewAll'],
  ['projects', 'view'],
  ['projects', 'viewInternal'],
  ['stages', 'update'],
  ['audit', 'view'],
];

// Which permissions each role gets. Written as "module:action" strings for readability;
// we'll match them up to real Permission rows below.
const ROLE_PERMISSIONS = {
  SuperAdmin: [
    'sop:manage', 'sop:publish', 'sop:view',
    'roles:manage',
    'projects:viewAll', 'projects:view', 'projects:viewInternal',
    'audit:view',
  ],
  Admin: [
    'sop:view',
    'users:manage',
    'projects:create', 'projects:assign', 'projects:viewAll', 'projects:view', 'projects:viewInternal',
    'audit:view',
  ],
  ITMember: [
    'projects:view', 'projects:viewInternal',
    'stages:update',
  ],
  Client: [
    'projects:view', // deliberately NOT viewInternal — this is what makes them see filtered data
  ],
};

async function main() {
  console.log('Clearing old data...');
  // Delete in child-to-parent order so foreign key constraints don't block us.
  await prisma.auditLog.deleteMany();
  await prisma.stageStatusHistory.deleteMany();
  await prisma.stageRemark.deleteMany();
  await prisma.stageDocument.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.sopStage.deleteMany();
  await prisma.sopVersion.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  console.log('Creating permissions...');
  const permissionMap = {}; // "module:action" -> Permission row
  for (const [module, action] of PERMISSIONS) {
    const perm = await prisma.permission.create({ data: { module, action } });
    permissionMap[`${module}:${action}`] = perm;
  }

  console.log('Creating roles and linking permissions...');
  const roleMap = {}; // roleName -> Role row
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.create({ data: { name: roleName } });
    roleMap[roleName] = role;

    for (const permKey of ROLE_PERMISSIONS[roleName]) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permissionMap[permKey].id,
        },
      });
    }
  }

  console.log('Creating test users...');
  const password = 'Password@123';
  const passwordHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.create({
    data: { name: 'Super Admin', email: 'superadmin@test.com', passwordHash, roleId: roleMap.SuperAdmin.id },
  });
  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@test.com', passwordHash, roleId: roleMap.Admin.id },
  });
  const itMember = await prisma.user.create({
    data: { name: 'IT Member', email: 'itmember@test.com', passwordHash, roleId: roleMap.ITMember.id },
  });
  const client = await prisma.user.create({
    data: { name: 'Client User', email: 'client@test.com', passwordHash, roleId: roleMap.Client.id },
  });

  console.log('Creating a published SOP with 5 stages...');
  const sop = await prisma.sopVersion.create({
    data: {
      name: 'Standard IT Project SOP',
      status: 'published',
      versionNumber: 1,
      publishedAt: new Date(),
      stages: {
        create: [
          { name: 'Requirements', order: 1, clientVisible: true },
          { name: 'Design', order: 2, clientVisible: true },
          { name: 'Development', order: 3, clientVisible: false },
          { name: 'Testing', order: 4, clientVisible: false },
          { name: 'Go-Live', order: 5, clientVisible: true },
        ],
      },
    },
    include: { stages: true },
  });

  console.log('Creating one demo project from that SOP...');
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project - Website Revamp',
      description: 'Sample project created by the seed script.',
      sopVersionId: sop.id,
      ownerId: admin.id,
      createdById: admin.id,
      members: {
        create: [
          { userId: itMember.id, kind: 'MEMBER' },
          { userId: client.id, kind: 'CLIENT' },
        ],
      },
      stages: {
        // Copy each SOP stage into a real ProjectStage — this is the pattern
        // every future "create project" API call will follow.
        create: sop.stages.map((s) => ({
          name: s.name,
          order: s.order,
          clientVisible: s.clientVisible,
          status: 'NotStarted',
          assigneeId: itMember.id,
        })),
      },
    },
  });

  console.log('Seed complete.');
  console.log('Test logins (all use password: Password@123):');
  console.log('  superadmin@test.com');
  console.log('  admin@test.com');
  console.log('  itmember@test.com');
  console.log('  client@test.com');
  console.log(`Demo project created: "${project.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });