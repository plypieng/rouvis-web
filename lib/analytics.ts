'use client';

export type UXEventProperties = Record<string, string | number | boolean | null>;

type UXEventPayload = {
  event: string;
  properties: UXEventProperties;
};

export async function trackUXEvent(event: string, properties: UXEventProperties = {}): Promise<void> {
  if (!event) return;

  const payload: UXEventPayload = { event, properties };
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry/events', blob);
      return;
    }

    await fetch('/api/v1/telemetry/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Non-blocking analytics by design.
  }
}
