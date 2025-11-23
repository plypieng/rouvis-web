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
import {
  getDemoThreadState,
  isDemoModeEnabled,
  logDemoActivity,
  scheduleHeatMitigationPlan,
  updateDemoThreadStage,
} from '@/lib/demo-scenario';

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

  const threadItemId =
    (typeof payload?.response_item_id === 'string' && payload.response_item_id.length > 0
      ? payload.response_item_id
      : undefined) ??
    `item_${threadId}_${Date.now()}`;

  const demoResponse = await maybeHandleDemoResponse({
    thread,
    threadId,
    threadItemId,
    userMessage,
  });

  if (demoResponse) {
    return demoResponse;
  }

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
              if (dataStr.trim() === '[DONE]') {
                // End of stream
                break;
              }

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
        if (!completionSent) {
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
                  text: accumulatedContent || '申し訳ありません、応答を生成できませんでした。',
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

interface DemoResponseContext {
  thread: ThreadRecord;
  threadId: string;
  threadItemId: string;
  userMessage: string;
}

type DemoScriptStep =
  | { type: 'text'; text: string; delay?: number }
  | { type: 'tool_delta'; toolName: string; message: string; status?: string; delay?: number }
  | { type: 'tool_result'; toolName: string; result: Record<string, unknown>; delay?: number }
  | { type: 'citation'; citation: Record<string, unknown>; delay?: number };

async function maybeHandleDemoResponse(context: DemoResponseContext): Promise<Response | null> {
  if (!isDemoModeEnabled()) {
    return null;
  }

  const normalized = context.userMessage.trim();
  const lower = normalized.toLowerCase();
  const threadState = getDemoThreadState(context.threadId);

  const introMatch = /萎れ|しおれ|初心者|分かりません|潅水|防除/.test(normalized);
  const scheduleIntent = /登録|反映|スケジュール|予定|お願いします/.test(normalized);
  const logIntent = /ログ|記録|完了|済み/.test(normalized);
  const edamameQuery = /新潟県.*枝豆.*作り方/.test(normalized);
  const tomatoWiltQuery = /農場/.test(normalized) && /ミニトマト/.test(normalized) && /枯れ|萎れ|しおれ|対策/.test(normalized);

  if (tomatoWiltQuery) {
    updateDemoThreadStage(context.threadId, 'awaiting_schedule', normalized);
    return createDemoStreamResponse(context, buildIntroScript());
  }

  if (threadState.stage === 'intro' && introMatch) {
    updateDemoThreadStage(context.threadId, 'awaiting_schedule', normalized);
    return createDemoStreamResponse(context, buildIntroScript());
  }

  if (threadState.stage === 'awaiting_schedule' && scheduleIntent) {
    const tasks = scheduleHeatMitigationPlan();
    updateDemoThreadStage(context.threadId, 'scheduled', normalized);
    return createDemoStreamResponse(context, buildScheduleScript(tasks));
  }

  if (threadState.stage === 'scheduled' && logIntent) {
    const activity = logDemoActivity({
      type: 'watering',
      field_id: 'field-b',
      description: '猛暑対策潅水プラン（Agent支援）',
    });
    updateDemoThreadStage(context.threadId, 'logged', normalized);
    return createDemoStreamResponse(context, buildLogScript(activity));
  }

  if (threadState.stage === 'logged') {
    updateDemoThreadStage(context.threadId, 'complete', normalized);
    return createDemoStreamResponse(context, buildClosingScript());
  }

  if (edamameQuery) {
    // Return demo response for edamame farming query
    return createDemoStreamResponse(context, buildEdamameScript());
  }

  if (!introMatch && !scheduleIntent && !logIntent && lower.length > 0) {
    return createDemoStreamResponse(context, buildFallbackScript());
  }

  return null;
}

function buildIntroScript(): DemoScriptStep[] {
  return [
    {
      type: 'tool_delta',
      toolName: '🔍 質問分析エンジン',
      message: 'ユーザーの質問内容を自然言語処理によって解析しています。「B圃場」「ミニトマト」「萎れ」というキーワードから緊急度と作物種別を特定中...',
      delay: 1400,
    },
    {
      type: 'tool_delta',
      toolName: '🗺️ 圃場識別システム',
      message: 'データベースから「B圃場」の詳細情報を検索しています。圃場ID、作物品種、栽培開始日、土壌タイプ、過去の栽培履歴などを照合中...',
      delay: 1600,
    },
    {
      type: 'tool_delta',
      toolName: '🌤️ 気象データ統合',
      message: '気象庁APIに接続し、長岡市の6日間予報・時間別詳細予報・降水ナウキャストを並列取得中。フェーン現象や高温注意報の有無も確認しています...',
      delay: 1800,
    },
    {
      type: 'tool_result',
      toolName: 'jma_get_forecast',
      result: {
        location: { area: '長岡市', fieldId: 'field-b' },
        temperature: { max: 37, min: 26 },
        humidity: 82,
        alerts: [
          '水曜〜木曜は体温超えの猛暑',
          '灰色かび病リスク上昇',
        ],
        source: 'JMA six-day outlook',
      },
      delay: 900,
    },
    {
      type: 'citation',
      citation: {
        type: 'weather',
        source: '気象庁 6日予報 (7/22発表)',
        text: '水曜37°C/湿度80%以上。フェーン現象で午後の葉温上昇。',
        confidence: 0.82,
      },
    },
    {
      type: 'tool_delta',
      toolName: '📡 IoTセンサー統合',
      message: 'B圃場に設置された土壌水分センサー・気温センサー・湿度センサーから過去48時間のデータをリアルタイム収集しています。蒸散量の推移パターンを解析中...',
      delay: 1700,
    },
    {
      type: 'tool_delta',
      toolName: '📊 栽培記録データベース',
      message: 'B圃場の過去30日間の作業ログ（潅水量・施肥履歴・病害記録）をスキャンしています。ミニトマトの生育ステージと照合し、標準値からの乖離を計算中...',
      delay: 1900,
    },
    {
      type: 'tool_result',
      toolName: 'fields.lookup',
      result: {
        field: {
          id: 'field-b',
          name: 'B圃場',
          crop: 'ミニトマト（アイコ）',
          moisture: 62,
          growthStage: '結実期',
          notes: '遮光ネットあり / 萎れ傾向',
        },
      },
      delay: 900,
    },
    {
      type: 'tool_delta',
      toolName: '🌿 作物診断AI',
      message: 'ミニトマトの萎れ症状を機械学習モデルで診断しています。土壌水分・気温・湿度・日射量のパラメータから、水分ストレス・根腐れ・病害のリスクスコアを算出中...',
      delay: 2000,
    },
    {
      type: 'tool_delta',
      toolName: '📚 農業知識ベース検索',
      message: '施設園芸ガイドブック・JA技術資料・研究論文データベースから「ミニトマト 萎れ 猛暑対策」に関連する情報を検索しています。信頼度スコア0.8以上の推奨事項を抽出中...',
      delay: 1800,
    },
    {
      type: 'tool_delta',
      toolName: '🎯 最適化エンジン',
      message: '収集した全データを統合し、最も効果的な対策プランを生成しています。コスト・時間・リスクを考慮した3つの推奨案を優先度順にランク付け中...',
      delay: 2100,
    },
    {
      type: 'citation',
      citation: {
        type: 'field_data',
        source: '土壌センサー (B圃場)',
        text: '含水率62%で日中に急低下。夕方の蒸散が高い状態。',
        confidence: 0.74,
      },
    },
    {
      type: 'text',
      text: '山田さん、はじめてでも順番に見ていけば大丈夫ですよ。こちらで天気→圃場→リスクの順に整理しました。\n\n',
    },
    {
      type: 'text',
      text: '● 天気：水曜と木曜が37°C前後・湿度80%で、午後に葉温が上がりやすいフェーン条件です。\n● 圃場：B圃場の土壌水分は62%で不安定。夕方に急激に乾いているログが残っています。\n\n',
    },
    {
      type: 'text',
      text: 'そこで初心者でも取り組みやすい順序でおすすめは次の3つです：\n1. 朝と夕方にやさしい潅水（各10mm）で根を冷やす\n2. 灰色かびの防除を予定より1日前倒し（水曜朝）\n3. 日中は寒冷紗を半分閉じて葉焼けを防ぐ＋換気で湿気を逃がす\n\n',
    },
    {
      type: 'text',
      text: 'どれも段取りはこちらでサポートします。「このとおり登録して」と送ってもらえれば作業計画に書き込みますね。',
    },
  ];
}

function buildScheduleScript(tasks: ReturnType<typeof scheduleHeatMitigationPlan>): DemoScriptStep[] {
  const planSummary = tasks
    .map((task, idx) => `${idx + 1}. ${toTimeLabel(task.due_at)} ${task.title}`)
    .join('\n');

  return [
    {
      type: 'tool_delta',
      toolName: '✅ 作業計画バリデーター',
      message: '提案された作業計画の実行可能性を多角的に検証しています。作業時間の重複・必要な人員・利用可能な機材をチェックし、実現可能性スコアを計算中...',
      delay: 1600,
    },
    {
      type: 'tool_delta',
      toolName: '⛅ 気象整合性チェッカー',
      message: '天気予報と各作業の推奨実施条件を照合しています。降水確率・気温・風速・湿度の時間帯別データと作業要件をマッチング。最適な実施タイミングを算出中...',
      delay: 1800,
    },
    {
      type: 'tool_delta',
      toolName: '🧮 リソース配分最適化',
      message: '必要な資材（潅水量・農薬・肥料）と作業時間を精密に計算しています。在庫状況を確認し、不足分の発注タイミングも提案。人員配置の最適化を実行中...',
      delay: 1700,
    },
    {
      type: 'tool_delta',
      toolName: '💾 スケジュールDB書き込み',
      message: '生成された作業計画をデータベースに永続化しています。タスクID生成・優先度設定・通知トリガー登録を一括処理中。ロールバック用の復元ポイントも作成...',
      delay: 1900,
    },
    {
      type: 'tool_result',
      toolName: 'command_bus.schedule_task',
      result: {
        idempotencyKey: 'demo-novice-heat-plan-001',
        tasks,
        undoToken: `undo-${Date.now()}`,
      },
      delay: 800,
    },
    {
      type: 'tool_delta',
      toolName: '📢 通知システム構築',
      message: '登録された作業予定の通知を準備しています。実施1時間前のリマインダー設定・天気急変時の緊急アラート設定・作業完了確認プッシュ通知を構成中...',
      delay: 1500,
    },
    {
      type: 'citation',
      citation: {
        type: 'guidebook',
        source: '施設園芸の環境制御 78p',
        page: 78,
        text: '猛暑日は朝夕2回の軽い潅水と予防防除の前倒しが推奨。',
        confidence: 0.86,
      },
    },
    {
      type: 'text',
      text: '了解しました。以下のとおりスケジュールに登録しました：\n\n',
    },
    {
      type: 'text',
      text: `${planSummary}\n\n`,
    },
    {
      type: 'text',
      text: '画面右側の作業計画にもすぐ反映されています。もしタイミングを変えたくなったら下の「取り消す」ボタンから1タップで戻せますよ。\n\n',
    },
    {
      type: 'text',
      text: '実施したら「潅水ログもお願い」と伝えていただければ記録まで自動で残せます。',
    },
  ];
}

function buildLogScript(activity: ReturnType<typeof logDemoActivity>): DemoScriptStep[] {
  return [
    {
      type: 'tool_delta',
      toolName: 'activities.log',
      message: '潅水の記録カードを作成しています…',
    },
    {
      type: 'tool_result',
      toolName: 'activities.log',
      result: { ...activity } as Record<string, unknown>,
    },
    {
      type: 'citation',
      citation: {
        type: 'general',
        source: 'ROuvis Command Bus',
        text: 'LOG_ACTIVITY: 猛暑対策潅水プラン（Agent支援）',
        confidence: 0.9,
      },
    },
    {
      type: 'text',
      text: '潅水ログを残しました。これで次に迷ったときも「いつ・どれくらい水を与えたか」が一覧から確認できます。\n\n',
    },
    {
      type: 'text',
      text: '葉の色ムラなども気になったら写真を送ってください。Vision Liteで一緒にチェックできますよ。今日はゆっくり休めるように、必要なことは全部こちらで段取りしておきます。',
    },
  ];
}

function buildClosingScript(): DemoScriptStep[] {
  return [
    {
      type: 'text',
      text: 'プラン登録と記録まで完了しました。ほかにも気になる圃場があれば、同じように「状況→やりたいこと」を書いてくだされば手順を用意しますね。',
    },
  ];
}

function buildEdamameScript(): DemoScriptStep[] {
  return [
    {
      type: 'text',
      text: '新潟県の枝豆作りについてお答えします。新潟県は枝豆の生産量が日本一で、弥彦村の「弥彦むすめ」や「湯沢小粒」などの品種が有名です。\n\n',
    },
    {
      type: 'text',
      text: '【基本的な作り方】\n1. **種まき**: 4月下旬〜5月上旬に直播きまたは育苗します。株間30-40cmで条間60-70cm。\n2. **土壌管理**: 排水の良い肥沃な土壌を好みます。pH6.0-6.5を維持。\n3. **肥料**: 元肥として窒素・リン酸・カリをバランスよく。追肥は控えめに。\n4. **潅水**: 土壌水分を60-70%に保つ。乾燥させすぎると実が硬くなります。\n5. **収穫**: 播種後70-80日で収穫。莢が膨らみ、毛が黒ずんできたら収穫適期。\n\n',
    },
    {
      type: 'text',
      text: '新潟県特有のポイントとして、冷涼な気候を活かした早生品種の栽培が主流です。夏の高温対策として遮光ネットの使用をおすすめします。',
    },
  ];
}

function buildFallbackScript(): DemoScriptStep[] {
  return [
    {
      type: 'text',
      text: 'このデモ環境では「猛暑でB圃場が心配」「このとおり登録して」「潅水ログもお願い」といったフレーズに合わせてエージェントの自律動作をご覧いただけます。よろしければその流れをお試しくださいね。',
    },
  ];
}

function createDemoStreamResponse(
  context: DemoResponseContext,
  steps: DemoScriptStep[],
): Response {
  const readableStream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      let accumulatedContent = '';

      send('thread_item.created', {
        type: 'thread_item.created',
        thread_item: {
          id: context.threadItemId,
          thread_id: context.threadId,
          role: 'assistant',
          status: 'in_progress',
          content: [],
        },
      });

      const run = async () => {
        for (const step of steps) {
          await wait(step.delay ?? 450);

          if (step.type === 'text') {
            accumulatedContent += step.text;
            send('thread_item.delta', {
              type: 'thread_item.delta',
              delta: {
                content: [
                  {
                    type: 'output_text',
                    text: step.text,
                  },
                ],
              },
            });
          } else if (step.type === 'tool_delta') {
            send('tool_call_delta', {
              type: 'tool_call_delta',
              delta: {
                tool: step.toolName,
                status: step.status ?? 'running',
                message: step.message,
              },
            });
          } else if (step.type === 'tool_result') {
            send('tool_call_result', {
              type: 'tool_call_result',
              toolName: step.toolName,
              result: step.result,
            });
          } else if (step.type === 'citation') {
            send('citation', {
              type: 'citation',
              citation: step.citation,
            });
          }
        }

        send('thread_item.completed', {
          type: 'thread_item.completed',
          thread_item: {
            id: context.threadItemId,
            thread_id: context.threadId,
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

        const timestamp = new Date().toISOString();
        upsertThreadItem(context.thread, {
          id: context.threadItemId,
          role: 'assistant',
          content: accumulatedContent,
          status: 'completed',
          created_at: timestamp,
          updated_at: timestamp,
        });

        controller.close();
      };

      run().catch((error) => {
        console.error('Demo stream error', error);
        send('error', {
          type: 'error',
          error: {
            message: 'Demo stream failed',
          },
        });
        controller.close();
      });
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

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function toTimeLabel(isoString: string): string {
  const date = new Date(isoString);
  const day = `${date.getMonth() + 1}/${date.getDate()}`;
  const hours = date.getHours().toString().padStart(2, '0');
  return `${day} ${hours}:00`;
}
