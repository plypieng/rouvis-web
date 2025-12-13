
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaGlobal = global as typeof global & {
    prisma?: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
    return new PrismaClient({
        log: ['error', 'warn'],
    }).$extends(withAccelerate());
}

export const prisma =
    prismaGlobal.prisma ||
    createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    prismaGlobal.prisma = prisma;
}
