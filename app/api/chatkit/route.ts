/**
 * ChatKit API Adapter
 *
 * This endpoint implements the ChatKit protocol and forwards requests
 * to the ROuvis backend (/v1/chat/stream).
 *
 * ChatKit Protocol Reference:
 * https://openai.github.io/chatkit/guides/custom-backend/
 */

import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

type ThreadRole = 'user' | 'assistant';

interface ThreadItemRecord {
  id: string;
  role: ThreadRole;
  content: string;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

interface ThreadRecord {
  id: string;
  title?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  thread_items: ThreadItemRecord[];
  sessionId?: string | null;
}

const threadStore = new Map<string, ThreadRecord>();

function upsertThreadItem(thread: ThreadRecord, item: ThreadItemRecord) {
  const index = thread.thread_items.findIndex((existing) => existing.id === item.id);

  if (index >= 0) {
    thread.thread_items[index] = item;
  } else {
    thread.thread_items.push(item);
  }

  thread.updated_at = item.updated_at;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const USE_AGENTS = process.env.USE_AGENTS === 'true';

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

function ensureThread(
  threadId?: string | null,
  options: {
    title?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): ThreadRecord {
  const id = threadId ?? `thread_${randomUUID()}`;

  let thread = threadStore.get(id);

  if (!thread) {
    const now = new Date().toISOString();
    thread = {
      id,
      title: options.title ?? null,
      metadata: options.metadata ?? {},
      created_at: now,
      updated_at: now,
      thread_items: [],
    };
    threadStore.set(id, thread);
  } else if (options.title || options.metadata) {
    if (typeof options.title !== 'undefined') {
      thread.title = options.title;
    }
    if (options.metadata) {
      thread.metadata = {
        ...thread.metadata,
        ...options.metadata,
      };
    }
    thread.updated_at = new Date().toISOString();
  }

  return thread;
}

function serializeThread(thread: ThreadRecord) {
  return {
    thread: {
      id: thread.id,
      title: thread.title,
      metadata: thread.metadata,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
    },
    thread_items: thread.thread_items.map((item) => ({
      id: item.id,
      thread_id: thread.id,
      type: 'message',
      role: item.role,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      content: [
        {
          type: item.role === 'user' ? 'input_text' : 'output_text',
          text: item.content,
        },
      ],
    })),
  };
}

function handleCreateThread(payload: any) {
  const { title = null, metadata = {}, thread_id, thread } = payload ?? {};
  const desiredId = thread?.id ?? thread_id ?? null;
  const createdThread = ensureThread(desiredId, { title, metadata });

  return new Response(
    JSON.stringify(serializeThread(createdThread)),
    { headers: jsonHeaders },
  );
}

function handleGetThread(payload: any) {
  const threadId = payload?.thread_id ?? payload?.id;

  if (!threadId) {
    return new Response(
      JSON.stringify({ error: 'thread_id is required' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const thread = ensureThread(threadId);

  return new Response(
    JSON.stringify(serializeThread(thread)),
    { headers: jsonHeaders },
  );
}

function handleListThreads() {
  const threads = Array.from(threadStore.values()).map((thread) => ({
    id: thread.id,
    title: thread.title,
    metadata: thread.metadata,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  }));

  return new Response(
    JSON.stringify({ threads }),
    { headers: jsonHeaders },
  );
}

function handleRenameThread(payload: any) {
  const threadId = payload?.thread_id;
  if (!threadId) {
    return new Response(
      JSON.stringify({ error: 'thread_id is required' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const thread = ensureThread(threadId, { title: payload?.title ?? null });

  return new Response(
    JSON.stringify(serializeThread(thread)),
    { headers: jsonHeaders },
  );
}

function handleDeleteThread(payload: any) {
  const threadId = payload?.thread_id;

  if (!threadId) {
    return new Response(
      JSON.stringify({ error: 'thread_id is required' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const existed = threadStore.delete(threadId);

  return new Response(
    JSON.stringify({ success: existed }),
    { headers: jsonHeaders },
  );
}

function handleDeleteThreadItems(payload: any) {
  const threadId = payload?.thread_id;
  const itemIds: unknown = payload?.thread_item_ids ?? payload?.ids;

  if (!threadId || !Array.isArray(itemIds)) {
    return new Response(
      JSON.stringify({ error: 'thread_id and thread_item_ids are required' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const thread = threadStore.get(threadId);

  if (thread) {
    const removalSet = new Set<string>(itemIds.filter((id) => typeof id === 'string') as string[]);
    if (removalSet.size > 0) {
      thread.thread_items = thread.thread_items.filter((item) => !removalSet.has(item.id));
      thread.updated_at = new Date().toISOString();
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: jsonHeaders },
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const contentType = request.headers.get('content-type') || 'unknown';

    let body: any = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('[ChatKit] Failed to parse request body', {
          contentType,
          rawBody,
          error: parseError,
        });
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { status: 400, headers: jsonHeaders },
        );
      }
    } else {
      body = {};
    }

    // ChatKit sends requests in this format:
    // {
    //   "action": "chatkit.create_thread_item" | "chatkit.delete_thread_items" | etc,
    //   "payload": { ... }
    // }

    const action = body?.action ?? body?.type ?? body?.event;
    const payload = body?.payload ?? body?.data ?? {};

    if (!action) {
      console.warn('[ChatKit] Missing action in request', {
        contentType,
        rawBody,
      });
      return new Response(
        JSON.stringify({ error: 'Missing action in ChatKit request' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    console.log('[ChatKit] Received action:', action, 'payload:', payload);

    // Handle different ChatKit actions
    switch (action) {
      case 'threads.create':
      case 'chatkit.create_thread':
        return handleCreateThread(payload);

      case 'threads.retrieve':
      case 'chatkit.get_thread':
        return handleGetThread(payload);

      case 'threads.list':
      case 'chatkit.list_threads':
        return handleListThreads();

      case 'threads.messages.create':
      case 'chatkit.create_thread_item':
        return handleCreateThreadItem(payload);

      case 'threads.messages.delete':
      case 'chatkit.delete_thread_items':
        return handleDeleteThreadItems(payload);

      case 'threads.update':
      case 'chatkit.rename_thread':
        return handleRenameThread(payload);

      case 'threads.delete':
      case 'chatkit.delete_thread':
        return handleDeleteThread(payload);

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: jsonHeaders }
        );
    }
  } catch (error) {
    console.error('ChatKit API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

async function handleCreateThreadItem(payload: any) {
  const { thread_id, content } = payload;

  let threadId =
    typeof thread_id === 'string' && thread_id.length > 0
      ? thread_id
      : undefined;

  const thread = ensureThread(threadId);
  threadId = thread.id;

  // Extract message content from ChatKit format
  let userMessage = '';

  if (Array.isArray(content)) {
    const textItem = content.find(
      (item: any) => item?.type === 'input_text' || item?.type === 'text',
    );

    if (typeof textItem?.text === 'string') {
      userMessage = textItem.text;
    } else {
      // Allow simple string arrays as a fallback
      userMessage = content
        .filter((item) => typeof item === 'string')
        .join('\n');
    }
  } else if (typeof content === 'string') {
    userMessage = content;
  } else if (content && typeof content === 'object') {
    if (typeof (content as { text?: string }).text === 'string') {
      userMessage = (content as { text: string }).text;
    }
  }

  if (!userMessage) {
    return new Response(
      JSON.stringify({ error: 'No message content provided' }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const nowIso = new Date().toISOString();
  const userItemId =
    typeof payload?.item_id === 'string' && payload.item_id.length > 0
      ? payload.item_id
      : `user_${threadId}_${Date.now()}`;

  upsertThreadItem(thread, {
    id: userItemId,
    role: 'user',
    content: userMessage,
    status: 'completed',
    created_at: nowIso,
    updated_at: nowIso,
  });

  // Call ROuvis backend (AgentKit vs MCP fallback)
  const endpoint = USE_AGENTS ? '/api/v1/agents/run' : '/api/v1/chat/stream';
  const backendResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'demo-user', // TODO: Get from auth
    },
    body: JSON.stringify(
      USE_AGENTS
        ? {
            threadId: threadId,
            messages: [{ role: 'user', content: userMessage }],
            sessionId: thread.sessionId,
            userId: 'demo-user',
          }
        : {
            message: userMessage,
            history: [],
            ...(thread.sessionId ? { sessionId: thread.sessionId } : {}),
          }
    ),
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(
      JSON.stringify({ error: 'Backend request failed' }),
      { status: backendResponse.status ?? 502, headers: jsonHeaders }
    );
  }

  const threadItemId =
    (typeof payload?.response_item_id === 'string' && payload.response_item_id.length > 0
      ? payload.response_item_id
      : undefined) ??
    `item_${threadId}_${Date.now()}`;

  // Transform backend SSE stream to ChatKit SSE format
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const reader = backendResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const enqueueEvent = (eventName: string, payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(
            `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
          ),
        );
      };

      let accumulatedContent = '';
      let completionSent = false;

      try {
        // Send initial thread item creation event
        enqueueEvent('thread_item.created', {
          type: 'thread_item.created',
          thread_item: {
            id: threadItemId,
            thread_id: threadId,
            role: 'assistant',
            status: 'in_progress',
            content: [],
          },
        });

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) {
              continue;
            }

            const dataStr = line.slice(6);

            try {
              const data = JSON.parse(dataStr);

              // Transform backend events to ChatKit format
              if (!USE_AGENTS && data.type === 'meta') {
                if (typeof data.sessionId === 'string' && !thread.sessionId) {
                  thread.sessionId = data.sessionId;
                }
                continue;
              }

              if (!USE_AGENTS && data.type === 'chunk') {
                accumulatedContent += data.content;

                // Send content delta
                enqueueEvent('thread_item.delta', {
                  type: 'thread_item.delta',
                  delta: {
                    content: [
                      {
                        type: 'output_text',
                        text: data.content,
                      },
                    ],
                  },
                });
              } else if (!USE_AGENTS && data.type === 'done') {
                // Send completion event
                enqueueEvent('thread_item.completed', {
                  type: 'thread_item.completed',
                  thread_item: {
                    id: threadItemId,
                    thread_id: threadId,
                    role: 'assistant',
                    status: 'completed',
                    content: [
                      {
                        type: 'output_text',
                        text: accumulatedContent,
                      },
                    ],
                  },
                });
                completionSent = true;
              } else if (!USE_AGENTS && data.type === 'error') {
                // Send error event
                enqueueEvent('error', {
                  type: 'error',
                  error: {
                    message: data.message || 'An error occurred',
                  },
                });
              } else if (USE_AGENTS) {
                // AgentKit normalized events
                if (data.type === 'content' && data.delta?.content) {
                  const text = String(data.delta.content);
                  accumulatedContent += text;
                  enqueueEvent('thread_item.delta', {
                    type: 'thread_item.delta',
                    delta: { content: [{ type: 'output_text', text }] },
                  });
                } else if (data.type === 'tool_call_result') {
                  // Forward tool result and also surface as citation for evidence rails
                  enqueueEvent('tool_call_result', { type: 'tool_call_result', ...data });
                  enqueueEvent('citation', { type: 'citation', ...data });
                } else if (data.type === 'tool_call_delta') {
                  enqueueEvent('tool_call_delta', { type: 'tool_call_delta', delta: data.delta ?? data });
                } else if (data.type === 'citation') {
                  // Pass-through citation event for custom consumers
                  const payload = data.citation ?? data;
                  enqueueEvent('citation', { type: 'citation', citation: payload });
                } else if (data.type === 'error') {
                  enqueueEvent('error', { type: 'error', error: { message: data.error || 'Agent error' } });
                } else if (data.type === 'done') {
                  enqueueEvent('thread_item.completed', {
                    type: 'thread_item.completed',
                    thread_item: {
                      id: threadItemId,
                      thread_id: threadId,
                      role: 'assistant',
                      status: 'completed',
                      content: [
                        { type: 'output_text', text: accumulatedContent },
                      ],
                    },
                  });
                  completionSent = true;
                }
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }

        // Ensure we send a completed event in case backend stream ends without explicit done
        if (!completionSent && accumulatedContent) {
          enqueueEvent('thread_item.completed', {
            type: 'thread_item.completed',
            thread_item: {
              id: threadItemId,
              thread_id: threadId,
              role: 'assistant',
              status: 'completed',
              content: [
                {
                  type: 'output_text',
                  text: accumulatedContent,
                },
              ],
            },
          });
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        enqueueEvent('error', {
          type: 'error',
          error: {
            message: 'Stream processing error',
          },
        });
      } finally {
        if (accumulatedContent.trim().length > 0) {
          const timestamp = new Date().toISOString();
          upsertThreadItem(thread, {
            id: threadItemId,
            role: 'assistant',
            content: accumulatedContent,
            status: 'completed',
            created_at: timestamp,
            updated_at: timestamp,
          });
        }

        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
