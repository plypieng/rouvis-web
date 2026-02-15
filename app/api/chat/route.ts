import { randomUUID } from 'node:crypto';

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '@/lib/backend-proxy-auth';

export const maxDuration = 30;

type ChatErrorCode = 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

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
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return toErrorResponse({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'messages must be an array',
        requestId,
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
    return toErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to process chat request',
      requestId,
    });
  }
}
