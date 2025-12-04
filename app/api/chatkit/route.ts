import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) throw new Error('BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not defined');

    // Handle special chatkit actions
    if (body.action === 'chatkit.list_threads') {
      const res = await fetch(`${backendUrl}/api/v1/threads`);
      const data = await res.json();
      return new Response(JSON.stringify({ threads: data.threads || [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'chatkit.create_thread') {
      const res = await fetch(`${backendUrl}/api/v1/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload || {}),
      });
      const data = await res.json();
      return new Response(JSON.stringify({ thread: data.thread }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'chatkit.undo') {
      const res = await fetch(`${backendUrl}/api/v1/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload || {}),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Regular chat message - forward to agents/run
    const { messages, threadId, projectId } = body;

    const response = await fetch(`${backendUrl}/api/v1/agents/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, threadId, projectId }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: response.statusText }), {
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
                  data.type === 'error') {
                  controller.enqueue(encoder.encode(`e:${JSON.stringify(data)}\n`));
                }
              } catch (e) {
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
  } catch (error: any) {
    console.error('ChatKit adapter error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
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
    const res = await fetch(`${backendUrl}/api/v1/threads/${threadId}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
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
