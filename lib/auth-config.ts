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
import * as fs from "fs";

const debugLog = (label: string, data: any) => {
  const line = `[${new Date().toISOString()}] ${label}: ${JSON.stringify(data)}\n`;
  try { fs.appendFileSync('/tmp/nextauth-debug.log', line); } catch { }
};

const normalizeEnvValue = (value?: string) => value?.replace(/\\[rn]/g, '').trim();
const googleClientId = normalizeEnvValue(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = normalizeEnvValue(process.env.GOOGLE_CLIENT_SECRET);
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV === 'development';
const hasGoogleOAuth = !!googleClientId && !!googleClientSecret;

if (!hasGoogleOAuth && !isDemoMode) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

const baseAdapter = PrismaAdapter(authPrisma);

export const authOptions: NextAuthOptions = {
  adapter: {
    ...baseAdapter,
    // Wrap linkAccount to handle re-authentication gracefully.
    // When using prompt:'consent', Google always re-issues tokens.
    // The default adapter's linkAccount calls create() which fails on 
    // the unique constraint. We catch that and update instead.
    linkAccount: async (account: Record<string, any>) => {
      debugLog('LINK_ACCOUNT', { provider: account.provider, providerAccountId: account.providerAccountId, userId: account.userId });
      try {
        return await baseAdapter.linkAccount!(account as any);
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
              // Request calendar scope for Google Calendar integration
              scope: 'openid email profile',
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        })
      ]
      : []),
    ...(isDemoMode ? [
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
                name: `Demo User (${deviceId.slice(0, 4)})`,
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
                  region: 'Demo Region',
                }
              });

              const project = await prisma.project.create({
                data: {
                  userId: user.id,
                  name: 'Demo Farm 2025',
                  crop: 'Rice',
                  startDate: today,
                  targetHarvestDate: targetHarvest,
                  status: 'active',
                }
              });

              await prisma.task.create({
                data: {
                  projectId: project.id,
                  title: 'Check water level',
                  dueDate: today,
                  status: 'pending',
                  priority: 'high',
                }
              });

              await prisma.activity.create({
                data: {
                  projectId: project.id,
                  type: 'inspection',
                  note: 'Initial demo inspection',
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
  // Fix "State cookie was missing" error on localhost.
  // Next.js 16 App Router + NextAuth v4 requires explicit cookie config
  // to prevent the state/PKCE cookies from being lost during OAuth callback.
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
      return true;
    },
    /**
     * JWT Callback: Runs when JWT is created or updated.
     */
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      } else if (!token.id && token.sub) {
        // Backward compatibility: older tokens may only have `sub`
        token.id = token.sub;
      }

      // Self-healing: If ID is missing or looks numeric (Google Sub), force CUID lookup via Email
      // This fixes the issue where users are identified by Sub ID instead of database CUID
      const isNumericId = token.id && /^\d+$/.test(token.id as string);
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

      // Check if user has completed onboarding.
      // Completion requires profile + at least one field or project.
      if (token.id) {
        try {
          const userId = token.id as string;
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
          // Don't block login if onboarding check fails
          token.profileComplete = false;
          token.onboardingComplete = false;
        }
      }

      return token;
    },

    /**
     * Session Callback: Runs whenever session is checked.
     */
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string | undefined) ?? (token.sub as string) ?? '';
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.profileComplete = Boolean(token.profileComplete);
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.uiMode = token.uiMode as 'new_farmer' | 'veteran_farmer' | undefined;
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
