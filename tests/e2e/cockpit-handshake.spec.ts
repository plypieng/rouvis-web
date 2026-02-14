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
const PROJECT_ID = process.env.PLAYWRIGHT_PROJECT_ID || '';

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

const STANDOUT_ENABLED = isEnabled(process.env.FEATURE_CHAT_COCKPIT_STANDOUT)
  || isEnabled(process.env.NEXT_PUBLIC_FEATURE_CHAT_COCKPIT_STANDOUT);

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

async function mockCockpitChatAndSuggestion(page: Page, projectId: string) {
  await page.route('**/api/v1/telemetry/events', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(`**/api/v1/projects/${projectId}/reschedule-suggestion`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: {
          summary: 'バックエンド提案: 雨前に作業を圧縮してください',
          prompt: 'バックエンド提案を確認して',
          affectedTasks: [
            {
              id: 'task-backend-1',
              title: '施肥',
              dueDate: '2026-02-16T09:00:00.000Z',
            },
          ],
        },
      }),
    });
  });

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
            id: `cockpit-thread-${threadCounter++}`,
            title: body.payload?.title || 'Project Cockpit',
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

    const prompt = getLatestUserPrompt(body);
    const isApplyConfirmation = /この内容でお願いします|Please apply this plan/i.test(prompt);
    if (isApplyConfirmation) {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: createStream([
          `e:${JSON.stringify({
            type: 'action_confirmation',
            action: {
              type: 'task_updated',
              undoData: { type: 'task_update', taskId: 'task-cockpit-1' },
            },
          })}`,
          `0:${JSON.stringify('予定を更新しました。')}`,
        ]),
      });
      return;
    }

    const plan = {
      generatedAt: '2026-02-15T09:00:00.000Z',
      items: [
        { id: 'task-cockpit-1', title: '潅水', from: '2026-02-16T09:00:00.000Z', to: '2026-02-17T09:00:00.000Z' },
        { id: 'task-cockpit-2', title: '防除', from: '2026-02-16T13:00:00.000Z', to: '2026-02-18T09:00:00.000Z' },
      ],
    };

    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: createStream([
        `0:${JSON.stringify(`調整案を作成しました。\n[[RESCHEDULE_PLAN: ${JSON.stringify(plan)}]]`)}`,
      ]),
    });
  });
}

async function sendPrompt(page: Page, prompt: string) {
  const input = page.locator('input[type="text"]');
  await expect(input).toBeVisible();
  await input.fill(prompt);
  await page.locator('button[type="submit"]').click();
}

test.describe('Cockpit handshake flow', () => {
  test.skip(!STANDOUT_ENABLED || !PROJECT_ID, 'Requires standout feature flag and PLAYWRIGHT_PROJECT_ID');

  test('syncs handshake from chat to calendar and supports preview/apply', async ({ context, page }) => {
    await attachAuthenticatedSession(context);
    await mockCockpitChatAndSuggestion(page, PROJECT_ID);

    await page.goto(`/ja/projects/${PROJECT_ID}`);
    await page.waitForLoadState('networkidle');

    const calendarSummary = page.getByTestId('calendar-handshake-summary');
    await expect(calendarSummary).toBeVisible();
    await expect(calendarSummary).toContainText('バックエンド提案');

    const prompt = '雨予報を踏まえて予定を調整して';
    await sendPrompt(page, prompt);

    const chatHandshake = page.getByTestId('command-handshake-card');
    await expect(chatHandshake).toBeVisible();
    const chatSummary = (await chatHandshake.locator('p').first().textContent())?.trim() || '';
    expect(chatSummary.length).toBeGreaterThan(0);

    await expect(calendarSummary).toHaveText(chatSummary);

    const userPromptMessages = page.locator('.message-user').filter({ hasText: prompt });
    const beforePreviewCount = await userPromptMessages.count();
    await page.getByTestId('calendar-handshake-preview').click();
    await expect.poll(async () => userPromptMessages.count()).toBeGreaterThan(beforePreviewCount);

    await page.getByTestId('calendar-handshake-apply').click();
    await expect(page.getByTestId('action-confirmation-card')).toBeVisible();
  });
});
