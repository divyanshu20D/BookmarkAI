// backend/lib/prisma.js
// const { PrismaClient } = require("@prisma/client");
const { PrismaClient } = require("../generated/prisma");

// The PrismaClient is imported from the 'generated' folder you mentioned.
// This setup ensures we have one instance of PrismaClient.
const prisma = new PrismaClient();

module.exports = prisma;
