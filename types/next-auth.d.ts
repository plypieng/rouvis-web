import "next-auth";

declare module "next-auth" {
  /**
   * Extend the built-in session types to include user id
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      profileComplete?: boolean;
      onboardingComplete?: boolean;
    };
  }

  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    profileComplete?: boolean;
    onboardingComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT token to include user id
   */
  interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    profileComplete?: boolean;
    onboardingComplete?: boolean;
  }
}
