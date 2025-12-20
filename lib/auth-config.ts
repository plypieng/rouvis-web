/**
 * NextAuth Configuration for Web App
 *
 * This is a simplified version that authenticates users.
 * Full tenant management happens in the backend.
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma, authPrisma } from "./prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (!googleClientId || !googleClientSecret) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          // Request calendar scope for Google Calendar integration
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
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
          console.log('[Auth-JWT] Self-healing ID check for:', token.email, 'Current ID:', token.id);
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true }
          });
          if (dbUser && dbUser.id !== token.id) {
            console.log('[Auth-JWT] Replaced numeric/missing ID', token.id, 'with CUID', dbUser.id);
            token.id = dbUser.id;
          }
        } catch (error) {
          console.error('[Auth-JWT] Self-healing failed:', error);
        }
      }

      // Check if user has completed onboarding
      if (token.id) {
        console.log('[Auth-JWT] User ID:', token.id, 'Sub:', token.sub, 'Email:', token.email);
        const userProfile = await prisma.userProfile.findUnique({
          where: { userId: token.id as string },
        });
        token.onboardingComplete = !!userProfile;
        console.log('[Auth-JWT] onboardingComplete:', token.onboardingComplete);
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
        console.log('[Auth-Session] Active session user ID:', session.user.id);
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
