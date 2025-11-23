import { test, expect } from '@playwright/test';

test.describe('Activity Logging and Scheduling UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');
    await page.waitForLoadState('networkidle');
  });

  test('should display activity log modal', async ({ page }) => {
    // Click activity log button
    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    // Check modal opens
    const modal = page.locator('[data-testid="activity-log-modal"]');
    await expect(modal).toBeVisible();

    // Check form elements
    const activityTypeSelect = modal.locator('select[name="type"]');
    await expect(activityTypeSelect).toBeVisible();

    const quantityInput = modal.locator('input[name="quantity"]');
    await expect(quantityInput).toBeVisible();

    const unitSelect = modal.locator('select[name="unit"]');
    await expect(unitSelect).toBeVisible();
  });

  test('should log watering activity', async ({ page }) => {
    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Select watering activity
    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('watering');

    // Enter quantity
    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('20');

    // Select unit
    const unitSelect = modal.locator('select[name="unit"]');
    await unitSelect.selectOption('L');

    // Add note
    const noteInput = modal.locator('textarea[name="note"]');
    await noteInput.fill('朝の水やり');

    // Select field
    const fieldSelect = modal.locator('select[name="fieldId"]');
    await fieldSelect.selectOption({ index: 1 }); // Select first field

    // Save activity
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check success message
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible();

    // Check activity appears in feed
    const activityFeed = page.locator('[data-testid="activity-feed"]');
    const latestActivity = activityFeed.locator('[data-testid="activity-item"]').first();
    await expect(latestActivity).toContainText('watering');
    await expect(latestActivity).toContainText('20 L');
  });

  test('should display action confirmation card from chat', async ({ page }) => {
    // Navigate to chat
    await page.goto('http://localhost:3002/ja/chat');

    // Send message that should trigger action
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('水やりを20L記録してください');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check for action confirmation card
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();

    // Check card content
    await expect(actionCard).toContainText('水やり');
    await expect(actionCard).toContainText('20');
    await expect(actionCard).toContainText('L');

    // Confirm action
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Check success feedback
    const successMessage = page.locator('[data-testid="action-success"]');
    await expect(successMessage).toBeVisible();
  });

  test('should schedule future activity', async ({ page }) => {
    const scheduleButton = page.locator('button[data-testid="schedule-activity-button"]');
    await scheduleButton.click();

    const modal = page.locator('[data-testid="activity-schedule-modal"]');
    await expect(modal).toBeVisible();

    // Fill scheduling form
    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('fertilizing');

    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('10');

    const unitSelect = modal.locator('select[name="unit"]');
    await unitSelect.selectOption('kg');

    // Set future date
    const dateInput = modal.locator('input[name="scheduledDate"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await dateInput.fill(dateString);

    // Set time
    const timeInput = modal.locator('input[name="scheduledTime"]');
    await timeInput.fill('09:00');

    // Select field
    const fieldSelect = modal.locator('select[name="fieldId"]');
    await fieldSelect.selectOption({ index: 1 });

    // Save scheduled activity
    const saveButton = modal.locator('button', { hasText: /スケジュール/ });
    await saveButton.click();

    // Check appears in upcoming activities
    const upcomingSection = page.locator('[data-testid="upcoming-activities"]');
    await expect(upcomingSection).toContainText('fertilizing');
  });

  test('should display activity timeline', async ({ page }) => {
    // Navigate to calendar view
    await page.goto('http://localhost:3002/ja/calendar');

    // Check timeline component
    const timeline = page.locator('[data-testid="activity-timeline"]');
    await expect(timeline).toBeVisible();

    // Check timeline items
    const timelineItems = timeline.locator('[data-testid="timeline-item"]');
    const itemCount = await timelineItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Check chronological order (most recent first)
    const firstItem = timelineItems.first();
    const lastItem = timelineItems.last();

    const firstTime = await firstItem.locator('[data-testid="activity-time"]').textContent();
    const lastTime = await lastItem.locator('[data-testid="activity-time"]').textContent();

    // Parse times and check order
    const firstDate = new Date(firstTime || '');
    const lastDate = new Date(lastTime || '');
    expect(firstDate.getTime()).toBeGreaterThanOrEqual(lastDate.getTime());
  });

  test('should filter activities by type', async ({ page }) => {
    const filterSelect = page.locator('select[data-testid="activity-type-filter"]');
    await expect(filterSelect).toBeVisible();

    // Filter by watering
    await filterSelect.selectOption('watering');

    // Check only watering activities shown
    const activityItems = page.locator('[data-testid="activity-item"]');
    const visibleCount = await activityItems.count();

    for (let i = 0; i < visibleCount; i++) {
      const item = activityItems.nth(i);
      await expect(item).toContainText('watering');
    }
  });

  test('should filter activities by date range', async ({ page }) => {
    // Open date range picker
    const dateFilterButton = page.locator('button[data-testid="date-range-filter"]');
    await dateFilterButton.click();

    // Select last 7 days
    const lastWeekOption = page.locator('button', { hasText: '過去7日間' });
    await lastWeekOption.click();

    // Check activities are filtered
    const activityItems = page.locator('[data-testid="activity-item"]');
    const visibleCount = await activityItems.count();

    // All visible activities should be within date range
    for (let i = 0; i < visibleCount; i++) {
      const item = activityItems.nth(i);
      const activityDate = await item.locator('[data-testid="activity-date"]').textContent();
      const date = new Date(activityDate || '');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      expect(date.getTime()).toBeGreaterThanOrEqual(weekAgo.getTime());
    }
  });

  test('should undo recent activity', async ({ page }) => {
    const activityItem = page.locator('[data-testid="activity-item"]').first();

    // Click undo button
    const undoButton = activityItem.locator('button[data-testid="undo-button"]');
    await undoButton.click();

    // Confirm undo
    const confirmButton = page.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Check activity is removed or marked as undone
    const undoneBadge = page.locator('[data-testid="undone-badge"]');
    await expect(undoneBadge).toBeVisible();
  });

  test('should export activity data', async ({ page }) => {
    const exportButton = page.locator('button[data-testid="export-activities"]');
    await exportButton.click();

    // Check export options
    const csvOption = page.locator('button', { hasText: 'CSV' });
    await expect(csvOption).toBeVisible();

    const pdfOption = page.locator('button', { hasText: 'PDF' });
    await expect(pdfOption).toBeVisible();

    // Test CSV export (would need to handle download in real test)
    // For now, just check the option exists
    await expect(csvOption).toBeVisible();
  });

  test('should handle activity validation errors', async ({ page }) => {
    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Try to save without required fields
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check validation errors
    const errorMessage = modal.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('必須');

    // Fill required fields and check errors disappear
    const activityTypeSelect = modal.locator('select[name="type"]');
    await activityTypeSelect.selectOption('watering');

    const quantityInput = modal.locator('input[name="quantity"]');
    await quantityInput.fill('10');

    await saveButton.click();

    // Error should be gone
    await expect(errorMessage).not.toBeVisible();
  });
});