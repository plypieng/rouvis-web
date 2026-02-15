import type { FarmerUiMode } from './farmerUiMode';

export const GOOGLE_AUTH_SCOPE = 'openid email profile https://www.googleapis.com/auth/calendar';

export const AUTH_CLAIMS_KEYS = [
  'id',
  'email',
  'name',
  'profileComplete',
  'onboardingComplete',
  'uiMode',
  'workspaceId',
  'role',
] as const;

export type AuthClaims = {
  id: string;
  email: string;
  name: string;
  profileComplete: boolean;
  onboardingComplete: boolean;
  uiMode?: FarmerUiMode;
  workspaceId?: string | null;
  role?: string | null;
};

export function resolveSessionClaimsFromToken(token: Record<string, unknown>): AuthClaims {
  const id = typeof token.id === 'string'
    ? token.id
    : (typeof token.sub === 'string' ? token.sub : '');

  return {
    id,
    email: typeof token.email === 'string' ? token.email : '',
    name: typeof token.name === 'string' ? token.name : '',
    profileComplete: Boolean(token.profileComplete),
    onboardingComplete: Boolean(token.onboardingComplete),
    uiMode: token.uiMode === 'new_farmer' || token.uiMode === 'veteran_farmer'
      ? token.uiMode
      : undefined,
    workspaceId: typeof token.workspaceId === 'string' ? token.workspaceId : null,
    role: typeof token.role === 'string' ? token.role : null,
  };
}
