import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../lib/backend-proxy-auth';

export const runtime = 'edge';

type ChatKitErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

function resolveRequestId(req: NextRequest): string {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

function toErrorResponse(params: {
  status: number;
  code: ChatKitErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}) {
  const payload: Record<string, unknown> = {
    code: params.code,
    message: params.message,
    requestId: params.requestId,
    // Backward compatibility with existing error consumers.
    error: params.message,
    errorCode: params.code,
  };
  if (params.details !== undefined) {
    payload.details = params.details;
  }
  return new Response(JSON.stringify(payload), {
    status: params.status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': params.requestId,
    },
  });
}

async function readJsonSafe<T = Record<string, unknown>>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    return {} as T;
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) {
      return toErrorResponse({
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not defined',
        requestId,
      });
    }

    const auth = await getBackendAuth(req);
    if (!auth.headers) {
      return toErrorResponse({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId,
      });
    }

    // Handle special chatkit actions
    if (body.action === 'chatkit.list_threads') {
      const scopedProjectId = typeof body?.payload?.projectId === 'string'
        ? body.payload.projectId.trim()
        : '';
      const threadsUrl = new URL(`${backendUrl}/api/v1/threads`);
      if (scopedProjectId) {
        threadsUrl.searchParams.set('projectId', scopedProjectId);
      }

      const res = await fetch(threadsUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
      });
      const data = await readJsonSafe<{ threads?: unknown[] }>(res);
      return new Response(JSON.stringify({ threads: data.threads || [] }), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': res.headers.get('x-request-id') || requestId,
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': res.headers.get('x-request-id') || requestId,
        },
      });
    }

    if (body.action === 'chatkit.update_thread') {
      const threadId = typeof body.threadId === 'string' ? body.threadId : '';
      if (!threadId) {
        return toErrorResponse({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'threadId is required',
          requestId,
        });
      }
      const res = await fetch(`${backendUrl}/api/v1/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
        body: JSON.stringify(body.payload || {}),
      });
      const data = await readJsonSafe<{ thread?: unknown; preferences?: unknown }>(res);
      return new Response(JSON.stringify({
        thread: data.thread,
        preferences: data.preferences,
      }), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': res.headers.get('x-request-id') || requestId,
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': res.headers.get('x-request-id') || requestId,
        },
      });
    }

    // Regular chat message - forward to agents/run
    const { messages, threadId, projectId, mode } = body;
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : requestId;

    const response = await fetch(`${backendUrl}/api/v1/agents/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify({
        message: typeof body.message === 'string' ? body.message : undefined,
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
        assistantLanguage: typeof body.assistantLanguage === 'string' ? body.assistantLanguage : undefined,
        assistantVerbosity: typeof body.assistantVerbosity === 'string' ? body.assistantVerbosity : undefined,
        mutationApprovalToken: typeof body.mutationApprovalToken === 'string' ? body.mutationApprovalToken : undefined,
        allowMutations: body.allowMutations === true,
        idempotencyKey,
      }),
    });

    if (!response.ok) {
      const errorBody = await readJsonSafe<{
        code?: string;
        message?: string;
        error?: string;
        errorCode?: string;
        requestId?: string;
      }>(response);

      const upstreamRequestId = errorBody.requestId || response.headers.get('x-request-id') || requestId;
      const upstreamCode = errorBody.code || errorBody.errorCode || 'UPSTREAM_ERROR';
      const upstreamMessage = errorBody.message || errorBody.error || response.statusText || 'Request failed';
      return toErrorResponse({
        status: response.status,
        code: upstreamCode === 'UNAUTHORIZED'
          ? 'UNAUTHORIZED'
          : upstreamCode === 'VALIDATION_ERROR'
            ? 'VALIDATION_ERROR'
            : 'UPSTREAM_ERROR',
        message: upstreamMessage,
        requestId: upstreamRequestId,
      });
    }

    if (!response.body) {
      return toErrorResponse({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'No response body',
        requestId,
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
                  data.type === 'intent_policy' ||
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
        'X-Request-Id': response.headers.get('x-request-id') || requestId,
      },
    });
  } catch (error) {
    console.error('ChatKit adapter error:', error);
    const message = error instanceof Error ? error.message : 'ChatKit adapter error';
    return toErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message,
      requestId,
    });
  }
}

// GET endpoint to load thread history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('thread_id');
  const intentMetrics = searchParams.get('intent_metrics');
  const metricsWindow = searchParams.get('window');

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!backendUrl) {
    console.error('BACKEND_URL is not defined');
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let auth;
  try {
    auth = await getBackendAuth(req);
  } catch {
    auth = { headers: null };
  }

  if (!auth.headers) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (intentMetrics === '1' || intentMetrics === 'true') {
    const windowParam = metricsWindow === '1h' || metricsWindow === '24h' || metricsWindow === '7d'
      ? metricsWindow
      : '24h';
    try {
      const res = await fetch(`${backendUrl}/api/v1/agents/scheduler/intent-metrics?window=${windowParam}`, {
        headers: {
          'Content-Type': 'application/json',
          ...auth.headers,
        },
      });
      const data = await readJsonSafe<Record<string, unknown>>(res);
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load intent metrics';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (!threadId) {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
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

    const data = await readJsonSafe<{
      thread?: { messages?: unknown[] };
      preferences?: unknown;
    }>(res);
    return new Response(JSON.stringify({
      messages: data.thread?.messages || [],
      preferences: data.preferences,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
