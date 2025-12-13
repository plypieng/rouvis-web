import { test, expect } from '@playwright/test';

test.describe('Phase 1 Smoke', () => {
  test('protected API routes require auth', async ({ request }) => {
    const tasksRes = await request.get('/api/v1/tasks');
    expect(tasksRes.status()).toBe(401);

    const activitiesRes = await request.get('/api/v1/activities');
    expect(activitiesRes.status()).toBe(401);
  });

  test('protected pages redirect to login', async ({ page }) => {
    await page.goto('/ja/calendar');
    await expect(page).toHaveURL(/\/ja\/login/);
    await expect(page.getByRole('heading', { name: /^ROuvis$/ })).toBeVisible();
  });
});
