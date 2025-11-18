// src/services/prismaService.ts
const USE_MOCK = process.env.USE_MOCK === 'true';

// Lazy load Prisma apenas quando necessário (modo não-mock)
let prisma: any = null;

export async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

