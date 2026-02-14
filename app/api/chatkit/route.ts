import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../lib/backend-proxy-auth';

export const runtime = 'edge';

async function readJsonSafe<T = Record<string, unknown>>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    return {} as T;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) throw new Error('BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not defined');

    const auth = await getBackendAuth(req);
    if (!auth.headers) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle special chatkit actions
    if (body.action === 'chatkit.list_threads') {
      const res = await fetch(`${backendUrl}/api/v1/threads`, {
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
      });
      const data = await readJsonSafe<{ threads?: unknown[] }>(res);
      return new Response(JSON.stringify({ threads: data.threads || [] }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'chatkit.create_thread') {
      const res = await fetch(`${backendUrl}/api/v1/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
        body: JSON.stringify(body.payload || {}),
      });
      const data = await readJsonSafe<{ thread?: unknown }>(res);
      return new Response(JSON.stringify({ thread: data.thread }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'chatkit.undo') {
      const res = await fetch(`${backendUrl}/api/v1/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
        body: JSON.stringify(body.payload || {}),
      });
      const data = await readJsonSafe<Record<string, unknown>>(res);
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Regular chat message - forward to agents/run
    const { messages, threadId, projectId, mode } = body;

    const response = await fetch(`${backendUrl}/api/v1/agents/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify({
        messages,
        threadId,
        projectId,
        mode,
        channel: typeof body.channel === 'string' ? body.channel : undefined,
        channelKind: typeof body.channelKind === 'string' ? body.channelKind : undefined,
        channelActorId: typeof body.channelActorId === 'string' ? body.channelActorId : undefined,
        sessionActorId: typeof body.sessionActorId === 'string' ? body.sessionActorId : undefined,
        pairingCode: typeof body.pairingCode === 'string' ? body.pairingCode : undefined,
        mentions: Array.isArray(body.mentions) ? body.mentions : undefined,
        schedulerQueue: body.schedulerQueue,
        queueSettings: body.queueSettings,
        clearThreadQueueSettings: body.clearThreadQueueSettings,
        persistThreadQueueSettings: body.persistThreadQueueSettings,
        highRiskScheduleChange: body.highRiskScheduleChange,
        forceConsensus: body.forceConsensus,
        recallScope: body.recallScope ?? body.memoryRecallScope,
      }),
    });

    if (!response.ok) {
      const errorBody = await readJsonSafe<{
        error?: string;
        errorCode?: string;
        requestId?: string;
      }>(response);
      return new Response(JSON.stringify({
        error: errorBody.error || response.statusText || 'Request failed',
        errorCode: errorBody.errorCode,
        requestId: errorBody.requestId,
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.body) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform backend SSE to mixed format (AI SDK + custom events)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split on double newline (SSE event separator)
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              const trimmed = part.trim();
              if (!trimmed) continue;

              // Extract data from SSE format: "data: {...}"
              let dataStr = '';
              for (const line of trimmed.split('\n')) {
                if (line.startsWith('data: ')) {
                  dataStr += line.slice(6);
                }
              }

              if (!dataStr || dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);

                // Content events -> AI SDK text format for streaming text
                if (data.type === 'content' && data.delta?.content) {
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(data.delta.content)}\n`));
                }

                // All other events -> custom event format for UI
                if (data.type === 'tool_call_delta' ||
                  data.type === 'tool_call_result' ||
                  data.type === 'citation' ||
                  data.type === 'custom_ui' ||
                  data.type === 'action_confirmation' ||
                  data.type === 'reasoning_trace' ||
                  data.type === 'diagnosis_result' ||
                  data.type === 'error') {
                  controller.enqueue(encoder.encode(`e:${JSON.stringify(data)}\n`));
                }
              } catch {
                // Skip unparseable
                console.warn('Failed to parse SSE data:', dataStr.slice(0, 100));
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('ChatKit adapter error:', error);
    const message = error instanceof Error ? error.message : 'ChatKit adapter error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET endpoint to load thread history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('thread_id');

  if (!threadId) {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!backendUrl) {
    console.error('BACKEND_URL is not defined');
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await getBackendAuth(req);
    if (!auth.headers) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${backendUrl}/api/v1/threads/${threadId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await readJsonSafe<{ thread?: { messages?: unknown[] } }>(res);
    return new Response(JSON.stringify({
      messages: data.thread?.messages || []
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
