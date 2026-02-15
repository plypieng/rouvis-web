import { WorkspaceRole as PrismaWorkspaceRole } from '@prisma/client';
import { prisma } from './prisma';

export type WorkspaceRoleClaim = 'owner' | 'admin' | 'member' | 'viewer';

const PRISMA_ROLE_TO_CLAIM: Record<PrismaWorkspaceRole, WorkspaceRoleClaim> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

type EnsureWorkspaceContextOptions = {
  preferredWorkspaceId?: string | null;
  backfillLegacyRecords?: boolean;
};

function buildPersonalWorkspaceId(userId: string): string {
  return `ws_${userId}`;
}

function buildPersonalWorkspaceName(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return `${trimmedName} Workspace`;
  }

  const emailPrefix = email?.trim().split('@')[0];
  if (emailPrefix) {
    return `${emailPrefix} Workspace`;
  }

  return 'Personal Workspace';
}

async function findWorkspaceMembership(
  userId: string,
  preferredWorkspaceId?: string | null,
): Promise<{ workspaceId: string; role: PrismaWorkspaceRole } | null> {
  if (preferredWorkspaceId) {
    const preferred = await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        workspaceId: preferredWorkspaceId,
      },
      select: {
        workspaceId: true,
        role: true,
      },
    });

    if (preferred) {
      return preferred;
    }
  }

  return prisma.workspaceMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      workspaceId: true,
      role: true,
    },
  });
}

async function createPersonalWorkspaceMembership(
  userId: string,
): Promise<{ workspaceId: string; role: PrismaWorkspaceRole }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error(`Cannot create workspace membership for missing user: ${userId}`);
    }

    const workspaceId = buildPersonalWorkspaceId(userId);

    await tx.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: {
        id: workspaceId,
        name: buildPersonalWorkspaceName(user.name, user.email),
        personalForUserId: userId,
      },
    });

    return tx.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      update: {
        role: PrismaWorkspaceRole.OWNER,
      },
      create: {
        workspaceId,
        userId,
        role: PrismaWorkspaceRole.OWNER,
      },
      select: {
        workspaceId: true,
        role: true,
      },
    });
  });
}

async function backfillLegacyWorkspaceRecordsForUser(
  userId: string,
  workspaceId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.project.updateMany({
      where: {
        userId,
        workspaceId: null,
      },
      data: { workspaceId },
    }),
    prisma.field.updateMany({
      where: {
        userId,
        workspaceId: null,
      },
      data: { workspaceId },
    }),
    prisma.chatSession.updateMany({
      where: {
        userId,
        workspaceId: null,
      },
      data: { workspaceId },
    }),
  ]);
}

export async function ensureWorkspaceContextForUser(
  userId: string,
  options: EnsureWorkspaceContextOptions = {},
): Promise<{ workspaceId: string; role: WorkspaceRoleClaim }> {
  const preferredWorkspaceId = typeof options.preferredWorkspaceId === 'string'
    ? options.preferredWorkspaceId
    : null;

  let membership = await findWorkspaceMembership(userId, preferredWorkspaceId);

  if (!membership) {
    membership = await createPersonalWorkspaceMembership(userId);
  }

  if (options.backfillLegacyRecords) {
    await backfillLegacyWorkspaceRecordsForUser(userId, membership.workspaceId);
  }

  return {
    workspaceId: membership.workspaceId,
    role: PRISMA_ROLE_TO_CLAIM[membership.role],
  };
}
