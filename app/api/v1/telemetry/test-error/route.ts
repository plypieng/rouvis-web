import { NextRequest, NextResponse } from 'next/server';

import { captureRouteHandlerException } from '@/lib/sentry-route';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const error = new Error('Web telemetry validation error');
  await captureRouteHandlerException(error, request, {
    source: 'telemetry.validation.web',
    extra: {
      validation: true,
      email: 'farmer@example.com',
      authorization: 'Bearer validation-token',
      api_key: 'web-validation-key',
    },
  });

  return NextResponse.json({ status: 'captured' }, { status: 200 });
}
