import { describe, expect, it } from 'vitest';
import { evaluateAuthAdmission } from './auth-admission';

describe('evaluateAuthAdmission', () => {
  it('allows sign-in in open mode', () => {
    const result = evaluateAuthAdmission({
      mode: 'open',
      email: 'farmer@example.com',
      allowlist: '',
    });

    expect(result).toMatchObject({
      allowed: true,
      mode: 'open',
      reason: 'allowed',
    });
  });

  it('allows explicitly allowlisted emails in restricted mode', () => {
    const result = evaluateAuthAdmission({
      mode: 'allowlist',
      email: 'farmer@example.com',
      allowlist: 'other@example.com, farmer@example.com',
    });

    expect(result).toMatchObject({
      allowed: true,
      mode: 'allowlist',
      reason: 'allowed',
    });
  });

  it('allows domain allowlisted emails in restricted mode', () => {
    const result = evaluateAuthAdmission({
      mode: 'allowlist',
      email: 'captain@beta.rouvis.jp',
      allowlist: '@beta.rouvis.jp',
    });

    expect(result).toMatchObject({
      allowed: true,
      mode: 'allowlist',
      reason: 'allowed',
    });
  });

  it('blocks non-allowlisted users in restricted mode', () => {
    const result = evaluateAuthAdmission({
      mode: 'allowlist',
      email: 'blocked@example.com',
      allowlist: 'allowed@example.com,@beta.rouvis.jp',
    });

    expect(result).toMatchObject({
      allowed: false,
      mode: 'allowlist',
      reason: 'not_allowlisted',
    });
  });

  it('blocks when email is missing in restricted mode', () => {
    const result = evaluateAuthAdmission({
      mode: 'allowlist',
      email: null,
      allowlist: 'allowed@example.com',
    });

    expect(result).toMatchObject({
      allowed: false,
      mode: 'allowlist',
      reason: 'missing_email',
    });
  });
});
