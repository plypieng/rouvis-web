/**
 * NextAuth Configuration for Web App
 *
 * This is a simplified version that authenticates users.
 * Full tenant management happens in the backend.
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma, authPrisma } from "./prisma";
import { resolveFarmerUiMode } from "./farmerUiMode";
import { GOOGLE_AUTH_SCOPE, resolveSessionClaimsFromToken } from "./auth-contract";
import { evaluateAuthAdmission } from "./auth-admission";
import { ensureWorkspaceContextForUser } from "./workspaceMembership";
import * as fs from "fs";

const debugLog = (label: string, data: any) => {
  const line = `[${new Date().toISOString()}] ${label}: ${JSON.stringify(data)}\n`;
  try { fs.appendFileSync('/tmp/nextauth-debug.log', line); } catch { }
};

const normalizeEnvValue = (value?: string) => value?.replace(/\\[rn]/g, '').trim();
const googleClientId = normalizeEnvValue(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = normalizeEnvValue(process.env.GOOGLE_CLIENT_SECRET);
const isGuestSignInEnabled = process.env.NEXT_PUBLIC_GUEST_SIGNIN_ENABLED === 'true';
const hasGoogleOAuth = !!googleClientId && !!googleClientSecret;
const isProduction = process.env.NODE_ENV === 'production';
const hasAtLeastOneSignInMethod = hasGoogleOAuth || isGuestSignInEnabled;

if (!hasAtLeastOneSignInMethod) {
  throw new Error('Missing sign-in provider configuration. Set Google OAuth credentials or enable guest sign-in.');
}

const baseAdapter = PrismaAdapter(authPrisma);

export const authOptions: NextAuthOptions = {
  adapter: {
    ...baseAdapter,
    // Wrap linkAccount to handle re-authentication gracefully.
    // When using prompt:'consent', Google always re-issues tokens.
    // The default adapter's linkAccount calls create() which fails on 
    // the unique constraint. We catch that and update instead.
    linkAccount: async (account: any): Promise<void> => {
      debugLog('LINK_ACCOUNT', { provider: account.provider, providerAccountId: account.providerAccountId, userId: account.userId });
      try {
        await baseAdapter.linkAccount?.(account as any);
        return;
      } catch (err: any) {
        debugLog('LINK_ACCOUNT_ERROR', { name: err?.name, message: err?.message?.substring(0, 300) });
        // If it's a duplicate, update the existing record
        if (err?.message?.includes('Unique constraint') || err?.code === 'P2002') {
          await (authPrisma as any).account.updateMany({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
            data: {
              refresh_token: account.refresh_token ?? null,
              access_token: account.access_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: account.session_state ?? null,
            },
          });
          return;
        }
        throw err;
      }
    },
  },
  providers: [
    ...(hasGoogleOAuth
      ? [
        GoogleProvider({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          authorization: {
            params: {
              scope: GOOGLE_AUTH_SCOPE,
            },
          },
        })
      ]
      : []),
    ...(isGuestSignInEnabled ? [
      CredentialsProvider({
        id: "demo-device",
        name: "Demo Device",
        credentials: {
          deviceId: { label: "Device ID", type: "text" },
        },
        async authorize(credentials) {
          if (!credentials?.deviceId) return null;

          const deviceId = credentials.deviceId;
          const email = `${deviceId}@demo.local`;

          // 1. Find existing user
          let user = await prisma.user.findUnique({
            where: { email },
          });

          // 2. Create if not exists
          if (!user) {
            // Demo user creation logic
            user = await prisma.user.create({
              data: {
                email,
                name: `ゲストユーザー (${deviceId.slice(0, 4)})`,
                image: `https://api.dicebear.com/7.x/shapes/svg?seed=${deviceId}`,
              },
            });

            // Best-effort demo seed: auth must succeed even if local schema/data is behind.
            try {
              const today = new Date();
              const targetHarvest = new Date(today);
              targetHarvest.setDate(today.getDate() + 120);

              await prisma.userProfile.create({
                data: {
                  userId: user.id,
                  farmingType: 'conventional',
                  experienceLevel: 'beginner',
                  uiMode: 'new_farmer',
                  region: '日本',
                }
              });

              const field = await prisma.field.create({
                data: {
                  userId: user.id,
                  name: 'デモ圃場A',
                  area: 1200,
                  crop: 'コシヒカリ',
                  environmentType: 'open_field',
                }
              });

              const project = await prisma.project.create({
                data: {
                  userId: user.id,
                  fieldId: field.id,
                  name: 'デモ農場プロジェクト',
                  crop: 'コシヒカリ',
                  startDate: today,
                  targetHarvestDate: targetHarvest,
                  status: 'active',
                }
              });

              await prisma.task.create({
                data: {
                  projectId: project.id,
                  fieldId: field.id,
                  title: '水位を確認',
                  dueDate: today,
                  status: 'pending',
                  priority: 'high',
                }
              });

              await prisma.activity.create({
                data: {
                  projectId: project.id,
                  fieldId: field.id,
                  type: 'inspection',
                  note: '初回デモ点検',
                  performedAt: today,
                }
              });
            } catch (seedError) {
              console.warn('[DemoAuth] Optional demo seed failed, continuing sign-in.', seedError);
            }
          }

          return user;
        },
      })
    ] : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Keep localhost OAuth state stable without overriding production cookie defaults.
  ...(!isProduction
    ? {
      useSecureCookies: false,
      cookies: {
        state: {
          name: 'next-auth.state',
          options: {
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            secure: false,
          },
        },
        pkceCodeVerifier: {
          name: 'next-auth.pkce.code_verifier',
          options: {
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            secure: false,
          },
        },
      },
    }
    : {}),
  callbacks: {
    /**
     * SignIn Callback: Runs during sign-in process.
     * Useful for debugging OAuth callback errors.
     */
    async signIn({ user, account, profile }) {
      debugLog('SIGNIN_CALLBACK', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        type: account?.type,
      });

      if (account?.provider === 'google') {
        const profileEmail = typeof (profile as { email?: unknown } | undefined)?.email === 'string'
          ? (profile as { email: string }).email
          : null;
        const admission = evaluateAuthAdmission({
          mode: process.env.AUTH_ADMISSION_MODE,
          allowlist: process.env.AUTH_ADMISSION_ALLOWLIST,
          email: user?.email || profileEmail,
        });

        if (!admission.allowed) {
          debugLog('SIGNIN_ADMISSION_DENIED', {
            email: user?.email || profileEmail,
            reason: admission.reason,
            mode: admission.mode,
          });
          return '/login?error=AccessDenied&reason=admission_denied';
        }
      }
      return true;
    },
    /**
     * JWT Callback: Runs when JWT is created or updated.
     */
    async jwt({ token, user, trigger }) {
      // 1. Resolve ID reliably
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      } else if (!token.id && token.sub) {
        token.id = token.sub;
      }

      const previousProfileComplete = typeof token.profileComplete === 'boolean'
        ? token.profileComplete
        : false;
      const previousOnboardingComplete = typeof token.onboardingComplete === 'boolean'
        ? token.onboardingComplete
        : false;
      const previousUiMode = token.uiMode;

      // Self-healing: If ID is missing or looks numeric (Google Sub), force CUID lookup via Email
      const isNumericId = typeof token.id === 'string' && /^\d+$/.test(token.id);
      if ((!token.id || isNumericId) && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true }
          });
          if (dbUser && dbUser.id !== token.id) {
            token.id = dbUser.id;
          }
        } catch (error) {
          console.error('[Auth-JWT] Self-healing failed:', error);
        }
      }

      // 2. Check onboarding status
      if (token.id) {
        try {
          const userId = token.id as string;
          // Use Promise.all to fetch required data in parallel
          const [userProfile, firstField, firstProject] = await Promise.all([
            prisma.userProfile.findUnique({
              where: { userId },
              select: { id: true, experienceLevel: true },
            }),
            prisma.field.findFirst({
              where: { userId },
              select: { id: true },
            }),
            prisma.project.findFirst({
              where: { userId },
              select: { id: true },
            }),
          ]);

          const profileComplete = Boolean(userProfile);
          token.profileComplete = profileComplete;
          token.onboardingComplete = Boolean(profileComplete && (firstField || firstProject));
          token.uiMode = resolveFarmerUiMode(undefined, userProfile?.experienceLevel);
        } catch (error) {
          debugLog('JWT_ONBOARDING_CHECK_ERROR', { error: (error as any)?.message?.substring(0, 200) });
          // Preserve known claims so transient DB errors don't regress completed users.
          token.profileComplete = previousProfileComplete;
          token.onboardingComplete = previousOnboardingComplete;
          token.uiMode = previousUiMode;
        }
      } else {
        // Explicitly set false if no user ID
        token.profileComplete = false;
        token.onboardingComplete = false;
      }

      const userId = typeof token.id === 'string' ? token.id : null;

      if (userId) {
        try {
          const workspaceContext = await ensureWorkspaceContextForUser(userId, {
            preferredWorkspaceId: typeof token.workspaceId === 'string' ? token.workspaceId : null,
            backfillLegacyRecords: Boolean(user) || trigger === 'update' || typeof token.workspaceId !== 'string',
          });

          token.workspaceId = workspaceContext.workspaceId;
          token.role = workspaceContext.role;
        } catch (error) {
          debugLog('JWT_WORKSPACE_CONTEXT_ERROR', { error: (error as any)?.message?.substring(0, 200) });
          token.workspaceId = null;
          token.role = null;
        }
      } else {
        token.workspaceId = null;
        token.role = null;
      }

      return token;
    },

    /**
     * Session Callback: Runs whenever session is checked.
     */
    async session({ session, token }) {
      if (session.user && token) {
        const claims = resolveSessionClaimsFromToken(token as Record<string, unknown>);
        session.user.id = claims.id;
        session.user.email = claims.email;
        session.user.name = claims.name;
        session.user.profileComplete = claims.profileComplete;
        session.user.onboardingComplete = claims.onboardingComplete;
        session.user.uiMode = claims.uiMode;
        session.user.workspaceId = claims.workspaceId;
        session.user.role = claims.role;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code: string, metadata: any) {
      const errDetail = metadata?.error || metadata;
      debugLog('ERROR_' + code, {
        name: errDetail?.name,
        message: errDetail?.message,
        stack: errDetail?.stack?.substring(0, 500),
        ...metadata,
      });
      console.error('[NextAuth][Error]', code, JSON.stringify(metadata, null, 2));
    },
    warn(code: string) {
      debugLog('WARN', code);
      console.warn('[NextAuth][Warn]', code);
    },
    debug(code: string, metadata: any) {
      debugLog('DEBUG_' + code, metadata);
      console.log('[NextAuth][Debug]', code, metadata);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
