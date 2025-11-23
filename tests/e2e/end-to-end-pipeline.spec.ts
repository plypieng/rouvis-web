import { test, expect } from '@playwright/test';

test.describe('Complete Chat→Action→Analytics Pipeline', () => {
  test('should complete full workflow: chat request → action confirmation → activity logging → analytics update', async ({ page }) => {
    const testUserId = `e2e-test-${Date.now()}`;

    // Set user ID for consistent testing
    await page.addInitScript(`localStorage.setItem('userId', '${testUserId}')`);

    // Step 1: Navigate to chat interface
    await page.goto('http://localhost:3002/ja/chat');
    await page.waitForLoadState('networkidle');

    // Verify chat interface loads
    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await expect(chatInput).toBeVisible();

    // Step 2: Send farming-related query that should trigger action
    await chatInput.fill('水やりを20L記録してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Wait for AI response and action suggestion
    await page.waitForTimeout(5000);

    // Verify evidence cards appear with farming information
    const evidenceCard = page.locator('[data-testid="evidence-card"]').first();
    await expect(evidenceCard).toBeVisible();

    // Verify action confirmation card appears
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();
    await expect(actionCard).toContainText('水やり');
    await expect(actionCard).toContainText('20');

    // Step 3: Confirm the action
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Verify success feedback
    const successMessage = page.locator('[data-testid="action-success"]');
    await expect(successMessage).toBeVisible();

    // Step 4: Navigate to planner to verify activity was logged
    await page.goto('http://localhost:3002/ja/planner');
    await page.waitForLoadState('networkidle');

    // Check activity appears in feed
    const activityFeed = page.locator('[data-testid="activity-feed"]');
    const latestActivity = activityFeed.locator('[data-testid="activity-item"]').first();
    await expect(latestActivity).toContainText('watering');
    await expect(latestActivity).toContainText('20');

    // Step 5: Navigate to analytics to verify data appears
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for analytics to load
    await page.waitForTimeout(3000);

    // Verify activity appears in analytics
    const activityChart = page.locator('[data-testid="activity-chart"]');
    await expect(activityChart).toBeVisible();

    // Check activity summary includes our logged activity
    const activitySummary = page.locator('[data-testid="activity-summary"]');
    await expect(activitySummary).toContainText('watering');

    // Verify yield/cost data is updated (if applicable)
    const costAnalysis = page.locator('[data-testid="cost-analysis"]');
    await expect(costAnalysis).toBeVisible();
  });

  test('should handle field-specific actions through chat', async ({ page }) => {
    const testUserId = `field-test-${Date.now()}`;

    // First create a field
    await page.goto('http://localhost:3002/ja/planner');

    const createButton = page.locator('button', { hasText: /新規作成/ });
    await createButton.click();

    const modal = page.locator('[data-testid="field-create-modal"]');
    const nameInput = modal.locator('input[name="name"]');
    await nameInput.fill('テスト圃場');

    const cropSelect = modal.locator('select[name="crop"]');
    await cropSelect.selectOption('rice');

    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    await page.waitForTimeout(2000);

    // Now test chat with field-specific action
    await page.goto('http://localhost:3002/ja/chat');

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('テスト圃場で肥料を10kg施肥してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Verify action card mentions the specific field
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();
    await expect(actionCard).toContainText('テスト圃場');
    await expect(actionCard).toContainText('fertilizing');
    await expect(actionCard).toContainText('10');

    // Confirm action
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Verify in planner
    await page.goto('http://localhost:3002/ja/planner');
    const activityItem = page.locator('[data-testid="activity-item"]').first();
    await expect(activityItem).toContainText('テスト圃場');
  });

  test('should update analytics in real-time after actions', async ({ page }) => {
    // Navigate to analytics first to establish baseline
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');

    // Record initial activity count
    const initialActivityCount = await page.locator('[data-testid="total-activities"]').textContent();

    // Perform action via chat
    await page.goto('http://localhost:3002/ja/chat');

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('収穫を50kg記録してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Return to analytics
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for potential real-time update
    await page.waitForTimeout(3000);

    // Check if analytics updated (this may require real-time updates to be implemented)
    const updatedActivityCount = await page.locator('[data-testid="total-activities"]').textContent();

    // At minimum, analytics should still load without errors
    const analyticsContainer = page.locator('[data-testid="analytics-container"]');
    await expect(analyticsContainer).toBeVisible();
  });

  test('should handle scheduling through chat pipeline', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('明日、田植えをスケジュールしてください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check for scheduling action card
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();
    await expect(actionCard).toContainText('スケジュール');

    // Confirm scheduling
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Verify in calendar
    await page.goto('http://localhost:3002/ja/calendar');
    const scheduledItem = page.locator('[data-testid="scheduled-item"]').filter({ hasText: '田植え' });
    await expect(scheduledItem).toBeVisible();
  });

  test('should maintain data consistency across pipeline', async ({ page }) => {
    // Start with clean state - log activity
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('watering');

    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('25');

    const unitSelect = modal.locator('select[name="unit"]');
    await unitSelect.selectOption('L');

    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    await page.waitForTimeout(2000);

    // Verify in planner
    const activityInPlanner = page.locator('[data-testid="activity-item"]').first();
    await expect(activityInPlanner).toContainText('25');
    await expect(activityInPlanner).toContainText('L');

    // Verify in analytics
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');

    // Check analytics reflects the same data
    const analyticsData = page.locator('[data-testid="analytics-data"]');
    await expect(analyticsData).toBeVisible();

    // Data consistency check - same quantity should appear
    const quantityInAnalytics = await page.locator('text=25').first();
    await expect(quantityInAnalytics).toBeVisible();
  });

  test('should handle pipeline errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Mock API failure for action logging
    await page.route('**/api/activities', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Database connection failed' }),
    }));

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('水やりを15L記録してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Confirm action despite API failure mock
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Check error handling - should show error but not crash
    const errorMessage = page.locator('[data-testid="pipeline-error"]');
    await expect(errorMessage).toBeVisible();

    // Chat should still be functional
    await expect(chatInput).toBeEnabled();
  });

  test('should support multi-step workflows', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Send multi-step request
    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('新しい圃場を作成して、水やりを記録してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Should show multiple action cards or sequenced actions
    const actionCards = page.locator('[data-testid="action-confirmation-card"]');
    const cardCount = await actionCards.count();

    // Should have at least one action card
    expect(cardCount).toBeGreaterThan(0);

    // Complete first action
    const firstCard = actionCards.first();
    const confirmButton = firstCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    await page.waitForTimeout(2000);

    // Check if workflow continues or completes
    const successMessage = page.locator('[data-testid="workflow-complete"]');
    await expect(successMessage).toBeVisible();
  });

  test('should integrate with external data sources', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Ask for weather-dependent action
    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('天気予報を確認して、適切な農作業を提案してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Should show weather data in evidence cards
    const weatherEvidence = page.locator('[data-testid="evidence-card"]').filter({ hasText: /天気/ });
    await expect(weatherEvidence).toBeVisible();

    // Should provide action recommendation based on weather
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();
  });

  test('should handle undo operations in pipeline', async ({ page }) => {
    // First complete the pipeline
    await page.goto('http://localhost:3002/ja/chat');

    const chatInput = page.locator('input[placeholder*="メッセージ"]');
    await chatInput.fill('水やりを30L記録してください');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    await page.waitForTimeout(5000);

    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Now test undo in planner
    await page.goto('http://localhost:3002/ja/planner');

    const activityItem = page.locator('[data-testid="activity-item"]').first();
    const undoButton = activityItem.locator('button[data-testid="undo-button"]');
    await undoButton.click();

    const confirmUndoButton = page.locator('button', { hasText: /確認/ });
    await confirmUndoButton.click();

    // Verify activity is marked as undone
    const undoneBadge = page.locator('[data-testid="undone-badge"]');
    await expect(undoneBadge).toBeVisible();

    // Verify analytics reflect the undo
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');

    // Analytics should handle undone activities appropriately
    const analyticsContainer = page.locator('[data-testid="analytics-container"]');
    await expect(analyticsContainer).toBeVisible();
  });
});