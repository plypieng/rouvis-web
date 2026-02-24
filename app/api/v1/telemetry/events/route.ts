import { NextRequest, NextResponse } from 'next/server';

import { authPrisma } from '@/lib/prisma';
import { getServerSessionFromToken } from '@/lib/server-auth';
import { captureException } from '@/lib/sentry';
import {
  type PrimitiveValue,
  type TelemetryProperties,
  validateTelemetryEventShape,
} from '@/lib/telemetry-taxonomy';

function isPrimitive(value: unknown): value is PrimitiveValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function sanitizeProperties(raw: unknown): TelemetryProperties {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const result: TelemetryProperties = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key || key.length > 64) continue;
    if (isPrimitive(value)) {
      result[key] = value;
    }
  }

  return result;
}

function isValidEventName(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  if (raw.length < 3 || raw.length > 64) return false;
  return /^[a-z0-9._-]+$/i.test(raw);
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const event = (body as { event?: unknown })?.event;
  if (!isValidEventName(event)) {
    return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
  }

  const properties = sanitizeProperties((body as { properties?: unknown })?.properties);
  const telemetryValidation = validateTelemetryEventShape(event, properties);
  if (!telemetryValidation.valid) {
    return NextResponse.json({ error: telemetryValidation.error || 'Invalid telemetry payload' }, { status: 400 });
  }

  const session = await getServerSessionFromToken();
  const userId = session?.user?.id || null;
  if (!userId) {
    // Skip anonymous persistence to avoid noisy Prisma failures before auth/session is ready.
    return new NextResponse(null, { status: 204 });
  }

  try {
    await authPrisma.auditEvent.create({
      data: {
        userId,
        action: `ux.${event}`,
        status: 'SUCCESS',
        resourceType: 'ux_event',
        metadata: {
          event,
          properties,
          source: 'web',
          path: req.nextUrl.pathname,
        },
      },
    });
  } catch (error) {
    await captureException(error, {
      level: 'warning',
      tags: {
        source: 'telemetry.events.route',
      },
      extra: {
        event,
        userId,
      },
    });
  }

  return new NextResponse(null, { status: 204 });
}
