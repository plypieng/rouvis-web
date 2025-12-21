import { test, expect } from '@playwright/test';

test.describe('Reschedule Flow', () => {
  test('hides reschedule plan blocks in chat output', async ({ page }) => {
    await page.route('**/api/chatkit**', async route => {
      const request = route.request();

      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
      }

      const bodyText = request.postData() || '{}';
      let body: any = {};
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = {};
      }

      if (body.action === 'chatkit.list_threads') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads: [{ id: 'thread-1', title: 'Test', updatedAt: new Date().toISOString() }] }),
        });
      }

      if (body.action === 'chatkit.create_thread') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ thread: { id: 'thread-1' } }),
        });
      }

      if (body.action === 'chatkit.undo') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      }

      const plan = {
        projectId: 'project-1',
        generatedAt: '2025-01-01T00:00:00.000Z',
        items: [
          { id: 'task-1', title: '潅水', from: '2025-01-01', to: '2025-01-02', reason: '雨予報' },
        ],
      };

      const content = `今の状況だと、こう動かすのが無理が少ないと思います。\n- **潅水**: 2025-01-01 → 2025-01-02（雨予報）\n\nこの内容で変更しますか？\n[[RESCHEDULE_PLAN: ${JSON.stringify(plan)}]]`;
      const bodyStream = `0:${JSON.stringify(content)}\n`;

      return route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: bodyStream,
      });
    });

    await page.goto('http://localhost:3002/ja/chat');

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('予定を変えて');
    await chatInput.press('Enter');

    await expect(page.locator('text=今の状況だと')).toBeVisible();
    await expect(page.locator('text=RESCHEDULE_PLAN')).toHaveCount(0);
  });
});
