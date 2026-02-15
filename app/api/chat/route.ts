import { randomUUID } from 'node:crypto';

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '@/lib/backend-proxy-auth';

export const maxDuration = 30;

type ChatErrorCode = 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
type AiTier = 'free' | 'pro';

const DEFAULT_CHAT_PROMPT_LIMIT: Record<AiTier, number> = {
  free: 4_000,
  pro: 12_000,
};

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
}) {
  const payload = {
    code: params.code,
    message: params.message,
    requestId: params.requestId,
    // Backward compatibility with existing error shape consumers.
    error: params.message,
    errorCode: params.code,
  };
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
    const explicitTier = tokenRecord?.aiTier ?? tokenRecord?.plan;
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
