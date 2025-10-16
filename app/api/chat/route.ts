import { NextRequest, NextResponse } from 'next/server';

type StreamEvent =
  | { type: 'meta'; model?: string; reasoning?: string; sessionId?: string }
  | { type: 'chunk'; content?: string }
  | { type: 'error'; message?: string }
  | { type: 'done' }
  | Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

    const upstream = await fetch(`${backendUrl}/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const errorPayload = await safeParseJson(upstream);
      const message =
        errorPayload?.error ??
        `Backend API error: ${upstream.status} ${upstream.statusText}`;
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    if (!upstream.body) {
      throw new Error('Upstream response is missing a body stream.');
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let aggregated = '';
    let model: string | undefined =
      upstream.headers.get('x-session-model') ?? undefined;
    let sessionId: string | undefined =
      upstream.headers.get('x-session-id') ?? undefined;
    let streamDone = false;

    while (!streamDone) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      let eventBoundary = buffer.indexOf('\n\n');
      while (eventBoundary !== -1) {
        const rawEvent = buffer.slice(0, eventBoundary);
        buffer = buffer.slice(eventBoundary + 2);
        const payload = parseEvent(rawEvent);

        if (payload?.type === 'chunk' && typeof payload.content === 'string') {
          aggregated += payload.content;
        } else if (payload?.type === 'meta') {
          if (typeof payload.model === 'string') {
            model = payload.model;
          }
          if (typeof payload.sessionId === 'string') {
            sessionId = payload.sessionId;
          }
        } else if (payload?.type === 'error') {
          const message =
            typeof payload.message === 'string'
              ? payload.message
              : 'Unknown streaming error';
          throw new Error(message);
        } else if (payload?.type === 'done') {
          streamDone = true;
          break;
        }

        eventBoundary = buffer.indexOf('\n\n');
      }

      if (done) {
        streamDone = true;
      }
    }

    const responsePayload = {
      response: aggregated.trim(),
      model: model ?? null,
      sessionId: sessionId ?? null,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Chat API proxy error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to process chat request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseEvent(rawEvent: string): StreamEvent | null {
  const dataLine = rawEvent
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('data:'));
  if (!dataLine) {
    return null;
  }

  const payload = dataLine.slice(5).trim();
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as StreamEvent;
  } catch (error) {
    console.error('Failed to parse SSE payload', { payload, error });
    return null;
  }
}

async function safeParseJson(
  response: Response
): Promise<{ error?: string } | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as { error?: string };
  } catch {
    return null;
  }
}
