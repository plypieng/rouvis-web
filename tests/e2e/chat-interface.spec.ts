import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import fs from 'node:fs';
import path from 'node:path';

function resolveNextAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return 'dev-secret';

  const envRaw = fs.readFileSync(envPath, 'utf8');
  const matched = envRaw.match(/^\s*NEXTAUTH_SECRET\s*=\s*(.+)\s*$/m);
  if (!matched?.[1]) return 'dev-secret';

  return matched[1].replace(/^['"]|['"]$/g, '').trim();
}

const SESSION_SECRET = resolveNextAuthSecret();
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

type ChatMessageContentPart = {
  type?: string;
  text?: string;
};

type ChatRequestBody = {
  action?: string;
  payload?: { title?: string; projectId?: string };
  threadId?: string;
  messages?: Array<{ role?: string; content?: string | ChatMessageContentPart[] }>;
};

function normalizeMessageContent(content: string | ChatMessageContentPart[] | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join(' ')
    .trim();
}

function getLatestUserPrompt(body: ChatRequestBody): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      return normalizeMessageContent(messages[i].content);
    }
  }
  return '';
}

function createStream(lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

async function attachAuthenticatedSession(context: BrowserContext) {
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || 'e2e-user-1';
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: userId,
      id: userId,
      email: process.env.PLAYWRIGHT_AUTH_EMAIL || 'e2e@example.com',
      name: process.env.PLAYWRIGHT_AUTH_NAME || 'E2E User',
      onboardingComplete: true,
    },
    maxAge: 30 * 24 * 60 * 60,
  });

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function mockChatkit(
  page: Page,
  options?: {
    delayMs?: number;
    failMessage?: boolean;
    streamForPrompt?: (prompt: string) => string;
  }
) {
  let threadCounter = 1;

  await page.route('**/api/chatkit**', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
      return;
    }

    let body: ChatRequestBody = {};
    try {
      body = JSON.parse(request.postData() || '{}') as ChatRequestBody;
    } catch {
      body = {};
    }

    if (body.action === 'chatkit.list_threads') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [{
            id: 'thread-seed',
            title: 'Seed Thread',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        }),
      });
      return;
    }

    if (body.action === 'chatkit.create_thread') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          thread: {
            id: `thread-${threadCounter++}`,
            title: body.payload?.title || 'New Conversation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      return;
    }

    if (body.action === 'chatkit.undo') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (options?.failMessage) {
      await route.abort();
      return;
    }

    if (options?.delayMs && options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }

    const prompt = getLatestUserPrompt(body);
    const stream = options?.streamForPrompt
      ? options.streamForPrompt(prompt)
      : createStream([`0:${JSON.stringify(`了解しました: ${prompt}`)}`]);

    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: stream,
    });
  });
}

async function openChat(page: Page) {
  await page.goto('http://localhost:3002/ja/chat');
  await page.waitForLoadState('networkidle');
}

async function sendPrompt(page: Page, prompt: string) {
  const input = page.locator('input[type="text"]');
  const submit = page.locator('button[type="submit"]');
  await expect(input).toBeVisible();
  await input.fill(prompt);
  await submit.click();
}

test.describe('Chat Interface with /api/chatkit', () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test('loads chat surface and composer', async ({ page }) => {
    await mockChatkit(page);
    await openChat(page);

    await expect(page.getByTestId('chat-container')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('sends message and strips hidden reschedule blocks from bubble text', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => {
        const plan = {
          generatedAt: '2026-01-01T09:00:00.000Z',
          items: [{ id: 'task-1', title: '潅水', to: '2026-01-02T09:00:00.000Z' }],
        };
        return createStream([
          `0:${JSON.stringify(`調整案を作成しました。\n[[RESCHEDULE_PLAN: ${JSON.stringify(plan)}]]`)}`,
        ]);
      },
    });
    await openChat(page);

    await sendPrompt(page, '予定を見直して');

    const assistantMessage = page.locator('.message-assistant').last();
    await expect(assistantMessage).toContainText('調整案を作成しました');
    await expect(assistantMessage).not.toContainText('RESCHEDULE_PLAN');
  });

  test('renders action confirmation card from chatkit event', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => createStream([
        `e:${JSON.stringify({
          type: 'action_confirmation',
          action: {
            type: 'task_updated',
            undoData: { type: 'task_update', taskId: 'task-1' },
          },
        })}`,
        `0:${JSON.stringify('予定を更新しました。')}`,
      ]),
    });
    await openChat(page);

    await sendPrompt(page, 'この予定を適用して');

    const actionCard = page.getByTestId('action-confirmation-card');
    await expect(actionCard).toBeVisible();
    await expect(actionCard).toContainText(/更新|Updated/);
    await expect(actionCard.getByRole('button', { name: /取り消す|Undo/ })).toBeVisible();
  });

  test('shows loading indicator while waiting for stream response', async ({ page }) => {
    await mockChatkit(page, {
      delayMs: 1200,
      streamForPrompt: (prompt) => createStream([`0:${JSON.stringify(`返信: ${prompt}`)}`]),
    });
    await openChat(page);

    await sendPrompt(page, 'ローディング確認');

    const loader = page.getByTestId('message-loading');
    await expect(loader).toBeVisible();
    await expect(loader).not.toBeVisible({ timeout: 10000 });
  });

  test('handles chat request failures with inline retry state', async ({ page }) => {
    await mockChatkit(page, { failMessage: true });
    await openChat(page);

    await sendPrompt(page, 'エラーテスト');

    const errorMessage = page.getByTestId('chat-error').last();
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage.getByRole('button', { name: /もう一度試す|Try again/ })).toBeVisible();
  });

  test('hides loading status line after first streamed assistant token', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => createStream([
        `e:${JSON.stringify({
          type: 'tool_call_delta',
          delta: { tool: 'jma.getForecast', status: 'running' },
        })}`,
        `0:${JSON.stringify('最初のトークンです。')}`,
      ]),
    });
    await openChat(page);
    await sendPrompt(page, 'ステータス確認');

    await expect(page.locator('.message-assistant').last()).toContainText('最初のトークンです。');
    await expect(page.getByTestId('streaming-indicator')).toHaveCount(0);
  });

  test('keeps unread guard when user scrolls away during delayed stream', async ({ page }) => {
    const history = Array.from({ length: 30 }, (_, idx) => ({
      id: `hist-${idx + 1}`,
      role: 'assistant',
      content: `履歴メッセージ ${idx + 1}`,
      createdAt: new Date(Date.now() - (30 - idx) * 60_000).toISOString(),
    }));

    await page.route('**/api/chatkit**', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: history }),
        });
        return;
      }

      let body: ChatRequestBody = {};
      try {
        body = JSON.parse(request.postData() || '{}') as ChatRequestBody;
      } catch {
        body = {};
      }

      if (body.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            threads: [{
              id: 'thread-scroll-guard',
              title: 'Scroll Guard Thread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }],
          }),
        });
        return;
      }

      if (body.action === 'chatkit.create_thread') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            thread: {
              id: 'thread-scroll-guard',
              title: 'Scroll Guard Thread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: createStream([
          `e:${JSON.stringify({
            type: 'reasoning_trace',
            stepId: 'guard-1',
            phase: 'tooling',
            status: 'update',
            title: 'Preparing action plan',
            sourceEvent: 'tool_call_delta',
            timestamp: '2026-02-20T08:00:00.000Z',
          })}`,
          `0:${JSON.stringify('スクロール保護テスト出力です。')}`,
        ]),
      });
    });

    await openChat(page);
    const scroller = page.locator('[data-testid="chat-container"] .mobile-scroll');
    await sendPrompt(page, 'スクロール維持');
    await scroller.evaluate((el) => {
      el.scrollTop = 0;
    });

    await expect(page.getByRole('button', { name: /最新のメッセージへ|Jump to latest/ })).toBeVisible();
    await expect(page.locator('.message-assistant').last()).toContainText('スクロール保護テスト出力です。');
  });

  test('keeps streamed output prioritized with dense reasoning trace events', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => createStream([
        ...Array.from({ length: 6 }, (_, idx) => `e:${JSON.stringify({
          type: 'reasoning_trace',
          stepId: `dense-${idx + 1}`,
          phase: 'tooling',
          status: 'update',
          title: `Trace step ${idx + 1}`,
          sourceEvent: 'tool_call_delta',
          timestamp: `2026-02-20T08:00:0${idx}.000Z`,
        })}`),
        `0:${JSON.stringify('出力1 ')}`,
        `0:${JSON.stringify('出力2')}`,
      ]),
    });

    await openChat(page);
    await sendPrompt(page, 'trace多めで確認');

    await expect(page.locator('.message-assistant').last()).toContainText('出力1 出力2');
    await expect(page.getByTestId('inference-trace-steps')).toHaveCount(0);
  });

  test('shows inference trace collapsed by default and expands ordered steps', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => createStream([
        `e:${JSON.stringify({
          type: 'reasoning_trace',
          stepId: 'trace-1',
          phase: 'intent',
          status: 'completed',
          title: 'Intent recognized',
          sourceEvent: 'intent_policy',
          timestamp: '2026-02-18T09:00:00.000Z',
        })}`,
        `e:${JSON.stringify({
          type: 'reasoning_trace',
          stepId: 'trace-2',
          phase: 'tooling',
          status: 'update',
          title: 'Preparing action plan',
          sourceEvent: 'tool_call_delta',
          timestamp: '2026-02-18T09:00:01.000Z',
        })}`,
        `0:${JSON.stringify('提案を準備しました。')}`,
      ]),
    });
    await openChat(page);
    await sendPrompt(page, '予定を最適化して');

    const tracePanel = page.getByTestId('inference-trace-panel');
    await expect(tracePanel).toBeVisible();
    await expect(page.getByTestId('inference-trace-summary')).toContainText('2');
    await expect(page.getByTestId('inference-trace-steps')).toHaveCount(0);

    await tracePanel.getByRole('button', { name: /詳細を表示|Show details/ }).click();
    const steps = page.getByTestId('inference-trace-step');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText('Intent recognized');
    await expect(steps.nth(1)).toContainText('Preparing action plan');
  });

  test('caps expanded inference trace list to five milestones', async ({ page }) => {
    await mockChatkit(page, {
      streamForPrompt: () => createStream([
        ...Array.from({ length: 7 }, (_, idx) => `e:${JSON.stringify({
          type: 'reasoning_trace',
          stepId: `trace-${idx + 1}`,
          phase: 'tooling',
          status: 'update',
          title: `Milestone ${idx + 1}`,
          sourceEvent: 'tool_call_delta',
          timestamp: `2026-02-18T09:00:0${idx}.000Z`,
        })}`),
        `0:${JSON.stringify('実行完了。')}`,
      ]),
    });
    await openChat(page);
    await sendPrompt(page, '詳細トレースを確認');

    const tracePanel = page.getByTestId('inference-trace-panel');
    await tracePanel.getByRole('button', { name: /詳細を表示|Show details/ }).click();
    const steps = page.getByTestId('inference-trace-step');
    await expect(steps).toHaveCount(5);
    await expect(steps.nth(0)).toContainText('Milestone 3');
    await expect(steps.nth(4)).toContainText('Milestone 7');
  });

  test('replays persisted TRACE_SUMMARY after thread reload', async ({ page }) => {
    let persistedMessages: Array<{ id: string; role: 'assistant' | 'user'; content: string; createdAt: string }> = [];
    const traceSummaryPayload = {
      v: 1,
      steps: [
        {
          stepId: 'persist-1',
          phase: 'synthesis',
          status: 'completed',
          title: 'Drafting final response',
          detail: 'Weather + workload merged.',
          sourceEvent: 'response_reasoning_summary',
          timestamp: '2026-02-18T10:00:00.000Z',
        },
      ],
    };

    await page.route('**/api/chatkit**', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: persistedMessages }),
        });
        return;
      }

      let body: ChatRequestBody = {};
      try {
        body = JSON.parse(request.postData() || '{}') as ChatRequestBody;
      } catch {
        body = {};
      }

      if (body.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            threads: [{
              id: 'thread-seed',
              title: 'Seed Thread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }],
          }),
        });
        return;
      }

      if (body.action === 'chatkit.create_thread') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            thread: {
              id: 'thread-seed',
              title: 'Seed Thread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }

      if (body.action === 'chatkit.undo') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      persistedMessages = [{
        id: 'assistant-1',
        role: 'assistant',
        content: `提案を生成しました。\n[[TRACE_SUMMARY: ${JSON.stringify(traceSummaryPayload)}]]`,
        createdAt: new Date().toISOString(),
      }];

      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: createStream([
          `e:${JSON.stringify({
            type: 'reasoning_trace',
            stepId: 'persist-1',
            phase: 'synthesis',
            status: 'completed',
            title: 'Drafting final response',
            sourceEvent: 'response_reasoning_summary',
            timestamp: '2026-02-18T10:00:00.000Z',
          })}`,
          `0:${JSON.stringify('提案を生成しました。')}`,
        ]),
      });
    });

    await openChat(page);
    await sendPrompt(page, '再計画して');
    await expect(page.getByTestId('inference-trace-summary')).toContainText('1');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('inference-trace-panel')).toBeVisible();
    await expect(page.getByTestId('inference-trace-summary')).toContainText('Drafting final response');
  });

  test('keeps streamed assistant text visible when thread history resolves during send', async ({ page }) => {
    await page.route('**/api/chatkit**', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 180));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
        return;
      }

      let body: ChatRequestBody = {};
      try {
        body = JSON.parse(request.postData() || '{}') as ChatRequestBody;
      } catch {
        body = {};
      }

      if (body.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads: [] }),
        });
        return;
      }

      if (body.action === 'chatkit.create_thread') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            thread: {
              id: 'thread-race',
              title: 'Race Thread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }

      if (body.action === 'chatkit.undo') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: createStream([
          `e:${JSON.stringify({
            type: 'reasoning_trace',
            stepId: 'trace-race-1',
            phase: 'intent',
            status: 'completed',
            title: 'Intent recognized',
            sourceEvent: 'intent_policy',
            timestamp: '2026-02-19T08:00:00.000Z',
          })}`,
          `0:${JSON.stringify('セルトレイは苗を育てるための穴あき容器です。')}`,
        ]),
      });
    });

    await openChat(page);
    await sendPrompt(page, 'セルトレイってなに？');

    const assistantMessage = page.locator('.message-assistant').last();
    await expect(assistantMessage).toContainText('セルトレイは苗を育てるための穴あき容器です。');
  });
});
