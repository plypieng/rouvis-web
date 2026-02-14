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
});
