import { test, expect } from '@playwright/test';

test.describe('Error Handling and Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja');
    await page.waitForLoadState('networkidle');
  });

  test('should display loading states during chat message sending', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    // Start sending message
    await inputField.fill('テストメッセージ');
    await sendButton.click();

    // Check for loading indicators
    const loadingIndicator = page.locator('[data-testid="message-loading"]');
    await expect(loadingIndicator).toBeVisible();

    // Check send button is disabled during sending
    await expect(sendButton).toBeDisabled();

    // Wait for response and check loading is gone
    await page.waitForTimeout(5000);
    await expect(loadingIndicator).not.toBeVisible();
    await expect(sendButton).toBeEnabled();
  });

  test('should handle network errors gracefully in chat', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Mock network failure
    await page.route('**/api/chat/**', route => route.abort());

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('ネットワークエラーテスト');
    await sendButton.click();

    // Check for error message
    const errorMessage = page.locator('[data-testid="chat-error"]');
    await expect(errorMessage).toBeVisible();

    // Check error message content
    await expect(errorMessage).toContainText('エラー');

    // Check retry button is available
    const retryButton = page.locator('button', { hasText: /再試行/ });
    await expect(retryButton).toBeVisible();
  });

  test('should display loading states during field creation', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const createButton = page.locator('button', { hasText: /新規作成/ });
    await createButton.click();

    const modal = page.locator('[data-testid="field-create-modal"]');

    // Fill form
    const nameInput = modal.locator('input[name="name"]');
    await nameInput.fill('ローディングテスト圃場');

    const cropSelect = modal.locator('select[name="crop"]');
    await cropSelect.selectOption('rice');

    // Mock slow API response
    await page.route('**/api/fields', async route => {
      await page.waitForTimeout(2000); // Simulate slow response
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-id', name: 'ローディングテスト圃場', crop: 'rice' }),
      });
    });

    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check loading state on button
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toContainText('保存中');

    // Wait for completion
    await page.waitForTimeout(3000);
    await expect(saveButton).toBeEnabled();
  });

  test('should handle API errors during field creation', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const createButton = page.locator('button', { hasText: /新規作成/ });
    await createButton.click();

    const modal = page.locator('[data-testid="field-create-modal"]');

    // Mock API error
    await page.route('**/api/fields', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    }));

    const nameInput = modal.locator('input[name="name"]');
    await nameInput.fill('エラーテスト圃場');

    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check error display
    const errorMessage = modal.locator('[data-testid="api-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('エラー');

    // Check modal stays open
    await expect(modal).toBeVisible();
  });

  test('should display loading states during activity logging', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Fill form
    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('watering');

    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('20');

    // Mock slow API
    await page.route('**/api/activities', async route => {
      await page.waitForTimeout(1500);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-activity-id', type: 'watering', quantity: 20 }),
      });
    });

    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check loading state
    await expect(saveButton).toBeDisabled();

    // Wait for completion
    await page.waitForTimeout(2000);
    await expect(saveButton).toBeEnabled();
  });

  test('should handle validation errors in forms', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Try to submit empty form
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check validation errors
    const validationErrors = modal.locator('[data-testid="validation-error"]');
    expect(await validationErrors.count()).toBeGreaterThan(0);

    // Check specific field errors
    const typeError = modal.locator('[data-testid="type-error"]');
    await expect(typeError).toBeVisible();

    const quantityError = modal.locator('[data-testid="quantity-error"]');
    await expect(quantityError).toBeVisible();

    // Fill required fields and check errors disappear
    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('watering');

    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('10');

    await saveButton.click();

    // Errors should be gone
    await expect(validationErrors).toHaveCount(0);
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('http://localhost:3002/ja/non-existent-page');

    // Check 404 page
    const notFoundHeading = page.locator('h1').filter({ hasText: '404' });
    await expect(notFoundHeading).toBeVisible();

    // Check navigation back to home
    const homeLink = page.locator('a', { hasText: /ホーム/ });
    await expect(homeLink).toBeVisible();

    await homeLink.click();
    await expect(page).toHaveURL(/.*\/ja$/);
  });

  test('should handle timeout errors', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Mock timeout
    await page.route('**/api/chat/**', async route => {
      await page.waitForTimeout(35000); // Longer than timeout
      await route.fulfill({ status: 200, body: '{}' });
    });

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('タイムアウトテスト');
    await sendButton.click();

    // Check timeout error
    const timeoutError = page.locator('[data-testid="timeout-error"]');
    await expect(timeoutError).toBeVisible();
  });

  test('should display loading states during analytics data fetch', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Check initial loading state
    const loadingSpinner = page.locator('[data-testid="analytics-loading"]');
    await expect(loadingSpinner).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(3000);
    await expect(loadingSpinner).not.toBeVisible();

    // Check data is displayed
    const chartContainer = page.locator('[data-testid="yield-chart"]');
    await expect(chartContainer).toBeVisible();
  });

  test('should handle analytics data fetch errors', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Mock analytics API error
    await page.route('**/api/analytics/**', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Analytics service unavailable' }),
    }));

    // Reload page to trigger API call
    await page.reload();

    // Check error state
    const errorState = page.locator('[data-testid="analytics-error"]');
    await expect(errorState).toBeVisible();

    // Check retry functionality
    const retryButton = errorState.locator('button', { hasText: /再試行/ });
    await expect(retryButton).toBeVisible();
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock auth failure
    await page.route('**/api/auth/**', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    }));

    await page.goto('http://localhost:3002/ja');

    // Check redirect to login or error display
    const loginPrompt = page.locator('[data-testid="login-required"]');
    await expect(loginPrompt).toBeVisible();
  });

  test('should display skeleton loading for lists', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    // Mock slow field loading
    await page.route('**/api/fields', async route => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fields: [] }),
      });
    });

    // Reload to trigger loading
    await page.reload();

    // Check skeleton loading
    const skeletonLoaders = page.locator('[data-testid="skeleton-loader"]');
    await expect(skeletonLoaders).toBeVisible();

    // Wait for load completion
    await page.waitForTimeout(3000);
    await expect(skeletonLoaders).not.toBeVisible();
  });

  test('should handle partial data loading failures', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Mock partial failure - some APIs succeed, others fail
    await page.route('**/api/analytics/yield', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }));

    await page.route('**/api/analytics/costs', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Cost data unavailable' }),
    }));

    await page.reload();

    // Check that yield chart loads
    const yieldChart = page.locator('[data-testid="yield-chart"]');
    await expect(yieldChart).toBeVisible();

    // Check that cost chart shows error
    const costError = page.locator('[data-testid="cost-chart-error"]');
    await expect(costError).toBeVisible();

    // Check overall page still functional
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();
  });

  test('should handle offline state', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Simulate offline
    await page.context().setOffline(true);

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('オフラインテスト');
    await sendButton.click();

    // Check offline error
    const offlineError = page.locator('[data-testid="offline-error"]');
    await expect(offlineError).toBeVisible();

    // Reconnect
    await page.context().setOffline(false);

    // Check online indicator
    const onlineIndicator = page.locator('[data-testid="online-indicator"]');
    await expect(onlineIndicator).toBeVisible();
  });

  test('should handle rate limiting errors', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Mock rate limit error
    await page.route('**/api/chat/**', route => route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Too many requests',
        retryAfter: 60
      }),
    }));

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('レートリミットテスト');
    await sendButton.click();

    // Check rate limit error
    const rateLimitError = page.locator('[data-testid="rate-limit-error"]');
    await expect(rateLimitError).toBeVisible();

    // Check retry after message
    await expect(rateLimitError).toContainText('60');
  });
});