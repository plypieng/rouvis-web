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

const normalizeEnvValue = (value?: string) => value?.replace(/\\[rn]/g, '').trim();
const googleClientId = normalizeEnvValue(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = normalizeEnvValue(process.env.GOOGLE_CLIENT_SECRET);
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV === 'development';
const hasGoogleOAuth = !!googleClientId && !!googleClientSecret;

if (!hasGoogleOAuth && !isDemoMode) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),
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

            // Seed Demo Project
            const today = new Date();
            const targetHarvest = new Date(today);
            targetHarvest.setDate(today.getDate() + 120);

            await prisma.userProfile.create({
              data: {
                userId: user.id,
                farmingType: 'conventional',
                experienceLevel: 'beginner',
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
  callbacks: {
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

      // Check if user has completed onboarding
      if (token.id) {
        const userProfile = await prisma.userProfile.findUnique({
          where: { userId: token.id as string },
        });
        token.onboardingComplete = !!userProfile;
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
