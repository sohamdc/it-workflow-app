// Single shared Prisma Client instance, reused across the whole app.
// Creating a new PrismaClient per request would exhaust database connections.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;