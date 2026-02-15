export type AuthAdmissionMode = 'open' | 'allowlist';

type AuthAdmissionInput = {
  mode?: string;
  allowlist?: string;
  email?: string | null;
};

type AuthAdmissionResult = {
  allowed: boolean;
  mode: AuthAdmissionMode;
  reason: 'allowed' | 'missing_email' | 'not_allowlisted';
};

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseAllowlist(raw?: string): Set<string> {
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

function normalizeMode(raw?: string): AuthAdmissionMode {
  return raw?.toLowerCase() === 'allowlist' ? 'allowlist' : 'open';
}

function isAllowlisted(email: string, allowlist: Set<string>): boolean {
  if (allowlist.has(email)) return true;
  const domain = email.split('@')[1];
  if (!domain) return false;
  return allowlist.has(`@${domain}`);
}

export function evaluateAuthAdmission(input: AuthAdmissionInput): AuthAdmissionResult {
  const mode = normalizeMode(input.mode);
  if (mode === 'open') {
    return { allowed: true, mode, reason: 'allowed' };
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    return { allowed: false, mode, reason: 'missing_email' };
  }

  const allowlist = parseAllowlist(input.allowlist);
  if (isAllowlisted(email, allowlist)) {
    return { allowed: true, mode, reason: 'allowed' };
  }

  return { allowed: false, mode, reason: 'not_allowlisted' };
}
