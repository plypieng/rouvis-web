import type { NextRequest } from 'next/server';

import { captureException, type CaptureContext } from '@/lib/sentry';

type RouteCaptureContext = Omit<CaptureContext, 'tags' | 'extra'> & {
  source: string;
  tags?: Record<string, string>;
  extra?: Record<string, string | number | boolean | null>;
};

export async function captureRouteHandlerException(
  error: unknown,
  request: NextRequest,
  context: RouteCaptureContext
): Promise<void> {
  const requestId = request.headers.get('x-request-id');

  await captureException(error, {
    level: context.level,
    user: context.user,
    fingerprint: context.fingerprint,
    tags: {
      source: context.source,
      method: request.method,
      route: request.nextUrl.pathname,
      ...(requestId ? { request_id: requestId } : {}),
      ...(context.tags ?? {}),
    },
    extra: {
      route: request.nextUrl.pathname,
      method: request.method,
      requestId,
      ...(context.extra ?? {}),
    },
  });
}
