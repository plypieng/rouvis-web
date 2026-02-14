import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaGlobal = global as typeof global & {
    prisma?: PrismaClient;
};

// Create the base Prisma Client
const basePrisma = prismaGlobal.prisma || new PrismaClient({
    log: ['error', 'warn'],
});

// Use the extended client for the application
export const prisma = basePrisma.$extends(withAccelerate());

// Use the extended client for NextAuth as well — the DATABASE_URL points to 
// Prisma Accelerate, so the base client cannot connect without the extension.
// Type-cast is needed because PrismaAdapter expects the base PrismaClient type.
export const authPrisma = prisma as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
    prismaGlobal.prisma = basePrisma;
}
