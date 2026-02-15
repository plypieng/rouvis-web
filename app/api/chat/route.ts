import { randomUUID } from 'node:crypto';

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '@/lib/backend-proxy-auth';

export const maxDuration = 30;

type ChatErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'ENTITLEMENT_REQUIRED'
  | 'INTERNAL_ERROR';
type AiTier = 'free' | 'pro';
type BillingPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
type EntitlementKey = 'ai.chat' | 'ai.recommend' | 'ai.scheduler';
type EntitlementEnforcementMode = 'off' | 'report-only' | 'enforce';

const DEFAULT_CHAT_PROMPT_LIMIT: Record<AiTier, number> = {
  free: 4_000,
  pro: 12_000,
};
const DEFAULT_PLAN_ENTITLEMENTS: Record<BillingPlan, EntitlementKey[]> = {
  FREE: ['ai.chat'],
  PRO: ['ai.chat', 'ai.recommend', 'ai.scheduler'],
  ENTERPRISE: ['ai.chat', 'ai.recommend', 'ai.scheduler'],
};
const ENTITLEMENT_VALUES = new Set<EntitlementKey>(['ai.chat', 'ai.recommend', 'ai.scheduler']);

function normalizeTier(value: unknown): AiTier | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pro' || normalized === 'plus' || normalized === 'premium') return 'pro';
  if (normalized === 'free' || normalized === 'basic') return 'free';
  return null;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizePlan(value: unknown): BillingPlan | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pro') return 'PRO';
  if (normalized === 'enterprise') return 'ENTERPRISE';
  if (normalized === 'free' || normalized === 'basic') return 'FREE';
  return null;
}

function parseEntitlementEnforcementMode(rawMode: string | undefined): EntitlementEnforcementMode {
  const normalized = (rawMode || '').trim().toLowerCase();
  if (normalized === 'off') return 'off';
  if (normalized === 'enforce') return 'enforce';
  return 'report-only';
}

function parseEntitlementList(rawValue: unknown): EntitlementKey[] {
  if (!Array.isArray(rawValue)) return [];
  const unique = new Set<EntitlementKey>();
  for (const rawItem of rawValue) {
    if (typeof rawItem !== 'string') continue;
    const entitlement = rawItem.trim().toLowerCase() as EntitlementKey;
    if (ENTITLEMENT_VALUES.has(entitlement)) {
      unique.add(entitlement);
    }
  }
  return Array.from(unique);
}

function hasExplicitEntitlementList(tokenRecord: Record<string, unknown> | null): boolean {
  if (!tokenRecord) return false;
  return Array.isArray(tokenRecord.entitlements) || Array.isArray(tokenRecord.aiEntitlements);
}

function resolveUserPlan(params: { explicitTier?: unknown; tokenPlan?: unknown }): BillingPlan {
  const explicitPlan = normalizePlan(params.tokenPlan);
  if (explicitPlan) return explicitPlan;

  const explicitTier = normalizeTier(params.explicitTier);
  if (explicitTier === 'pro') return 'PRO';
  return 'FREE';
}

function resolveUserEntitlements(params: {
  tokenRecord: Record<string, unknown> | null;
  plan: BillingPlan;
}): EntitlementKey[] {
  const tokenEntitlements = parseEntitlementList(
    params.tokenRecord?.entitlements ?? params.tokenRecord?.aiEntitlements
  );

  if (hasExplicitEntitlementList(params.tokenRecord)) {
    return tokenEntitlements;
  }

  return DEFAULT_PLAN_ENTITLEMENTS[params.plan];
}

function getEntitlementUpgradeHint(required: EntitlementKey): string {
  switch (required) {
    case 'ai.scheduler':
      return 'Upgrade to PRO to enable advanced scheduler advice.';
    case 'ai.recommend':
      return 'Upgrade to PRO to enable crop recommendation AI.';
    default:
      return 'Upgrade your plan to access this AI feature.';
  }
}

function parseTierOverrides(): Record<string, AiTier> {
  const raw = process.env.AI_TIER_OVERRIDES_JSON;
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const overrides: Record<string, AiTier> = {};
    for (const [id, rawTier] of Object.entries(parsed as Record<string, unknown>)) {
      const tier = normalizeTier(rawTier);
      if (!tier) continue;
      const userId = id.trim();
      if (!userId) continue;
      overrides[userId] = tier;
    }
    return overrides;
  } catch {
    return {};
  }
}

function resolveAiTier(params: { userId?: string; explicitTier?: unknown }): AiTier {
  const explicit = normalizeTier(params.explicitTier);
  if (explicit) return explicit;
  if (params.userId) {
    const override = parseTierOverrides()[params.userId];
    if (override) return override;
  }
  const defaultTier = normalizeTier(process.env.AI_DEFAULT_TIER);
  return defaultTier || 'free';
}

function estimatePromptTokens(value: unknown): number {
  try {
    const text = JSON.stringify(value || '');
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  } catch {
    return 0;
  }
}

function resolveChatPromptLimit(tier: AiTier): number {
  const envKey = `AI_PROMPT_TOKEN_LIMIT_WEB_CHAT_${tier.toUpperCase()}`;
  return parsePositiveInt(process.env[envKey], DEFAULT_CHAT_PROMPT_LIMIT[tier]);
}

function toErrorResponse(params: {
  status: number;
  code: ChatErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}) {
  const payload: Record<string, unknown> = {
    code: params.code,
    message: params.message,
    requestId: params.requestId,
    // Backward compatibility with existing error shape consumers.
    error: params.message,
    errorCode: params.code,
  };
  if (params.details !== undefined) {
    payload.details = params.details;
  }
  return NextResponse.json(payload, {
    status: params.status,
    headers: { 'X-Request-Id': params.requestId },
  });
}

function toFallbackTextResponse(params: {
  requestId: string;
  reason: 'service_unavailable' | 'provider_unavailable';
}) {
  const fallbackText = '現在AI応答が利用できないため、要点を3つ以内で送信して後ほど再試行してください。';
  return new Response(fallbackText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Request-Id': params.requestId,
      'X-AI-Fallback': params.reason,
    },
  });
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || randomUUID();
  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return toErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId,
    });
  }

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const tokenRecord = token as Record<string, unknown> | null;
    const userId = typeof tokenRecord?.id === 'string'
      ? tokenRecord.id
      : typeof token?.sub === 'string'
        ? token.sub
        : undefined;
    if (!userId) {
      return toErrorResponse({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId,
      });
    }

    const explicitTier = tokenRecord?.aiTier ?? tokenRecord?.plan;
    const plan = resolveUserPlan({
      explicitTier,
      tokenPlan: tokenRecord?.plan,
    });
    const entitlements = resolveUserEntitlements({
      tokenRecord,
      plan,
    });
    const enforcementMode = parseEntitlementEnforcementMode(process.env.ENTITLEMENT_ENFORCEMENT_MODE);
    const hasChatEntitlement = entitlements.includes('ai.chat');
    const reportOnlyDenied = enforcementMode === 'report-only' && !hasChatEntitlement;
    const entitlementAllowed = enforcementMode !== 'enforce' || hasChatEntitlement;

    if (reportOnlyDenied) {
      console.warn('[entitlements][report-only] Missing entitlement', {
        userId,
        required: 'ai.chat',
        plan,
        route: 'web_chat',
      });
    }

    if (!entitlementAllowed) {
      return toErrorResponse({
        status: 403,
        code: 'ENTITLEMENT_REQUIRED',
        message: 'Your current plan does not include web chat AI.',
        requestId,
        details: {
          requiredEntitlement: 'ai.chat',
          currentPlan: plan,
          mode: enforcementMode,
          upgradeHint: getEntitlementUpgradeHint('ai.chat'),
        },
      });
    }

    const tier = resolveAiTier({ userId, explicitTier });

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return toErrorResponse({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'messages must be an array',
        requestId,
      });
    }

    const estimatedPromptTokens = estimatePromptTokens(messages);
    const promptLimit = resolveChatPromptLimit(tier);
    if (estimatedPromptTokens > promptLimit) {
      return toErrorResponse({
        status: 429,
        code: 'RATE_LIMITED',
        message: `Prompt budget exceeded for ${tier} tier (${estimatedPromptTokens}/${promptLimit} tokens).`,
        requestId,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return toFallbackTextResponse({
        requestId,
        reason: 'service_unavailable',
      });
    }

    const result = streamText({
      model: openai('gpt-4-turbo'),
      messages,
    });

    return result.toTextStreamResponse({
      headers: { 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('Chat route failed:', error);
    return toFallbackTextResponse({
      requestId,
      reason: 'provider_unavailable',
    });
  }
}
