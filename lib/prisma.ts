import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaGlobal = global as typeof global & {
    prisma?: PrismaClient;
};

// Create the base Prisma Client
const basePrisma = prismaGlobal.prisma || new PrismaClient({
    log: ['error', 'warn'],
});

// Use the base client for NextAuth to avoid type and runtime issues with extensions
export const authPrisma = basePrisma;

// Use the extended client for the application
export const prisma = basePrisma.$extends(withAccelerate());

if (process.env.NODE_ENV !== 'production') {
    prismaGlobal.prisma = basePrisma;
}
