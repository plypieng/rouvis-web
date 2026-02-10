import { NextResponse } from 'next/server';

import { captureException } from '@/lib/sentry';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const error = new Error('Web telemetry validation error');
  await captureException(error, {
    tags: {
      source: 'telemetry.validation.web',
    },
    extra: {
      validation: true,
    },
  });

  return NextResponse.json({ status: 'captured' }, { status: 200 });
}
