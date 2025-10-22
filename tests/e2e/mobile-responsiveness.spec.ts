import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness Across Components', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport for all tests
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should display mobile chat interface correctly', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Check chat container fits mobile screen
    const chatContainer = page.locator('[data-testid="chat-container"]');
    const boundingBox = await chatContainer.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);

    // Check input field is properly sized for mobile
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const inputBox = await inputField.boundingBox();
    expect(inputBox?.width).toBeLessThan(375);

    // Check send button is accessible
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();

    // Check virtual keyboard doesn't hide input
    await inputField.tap();
    await page.waitForTimeout(500);
    await expect(inputField).toBeVisible();
  });

  test('should display mobile field management interface', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    // Check map container is responsive
    const mapContainer = page.locator('[data-testid="map-container"]');
    const mapBox = await mapContainer.boundingBox();
    expect(mapBox?.width).toBeLessThanOrEqual(375);

    // Check field cards are stacked vertically
    const fieldCards = page.locator('[data-testid="field-card"]');
    const firstCard = fieldCards.first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox?.width).toBeLessThanOrEqual(375);

    // Check mobile-specific controls
    const mobileControls = page.locator('[data-testid="mobile-map-controls"]');
    await expect(mobileControls).toBeVisible();
  });

  test('should handle mobile activity logging modal', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Check modal fits mobile screen
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375);

    // Check form inputs are touch-friendly
    const inputs = modal.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputBox = await input.boundingBox();
      // Touch targets should be at least 44px
      expect(inputBox?.height).toBeGreaterThanOrEqual(44);
    }

    // Check modal can be closed on mobile
    const closeButton = modal.locator('button[data-testid="modal-close"]');
    await expect(closeButton).toBeVisible();
  });

  test('should display mobile analytics dashboard', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Check charts are responsive
    const charts = page.locator('[data-testid*="chart"]');
    const chartCount = await charts.count();

    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      const chartBox = await chart.boundingBox();
      expect(chartBox?.width).toBeLessThanOrEqual(375);
    }

    // Check mobile-optimized KPI cards
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const firstKpi = kpiCards.first();
    const kpiBox = await firstKpi.boundingBox();
    expect(kpiBox?.width).toBeLessThanOrEqual(375);

    // Check collapsible sections work on mobile
    const collapsibleSection = page.locator('[data-testid="collapsible-section"]').first();
    await collapsibleSection.tap();

    const sectionContent = page.locator('[data-testid="section-content"]').first();
    await expect(sectionContent).toBeVisible();
  });

  test('should handle mobile navigation', async ({ page }) => {
    await page.goto('http://localhost:3002/ja');

    // Check bottom navigation is visible
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    // Check navigation items are touch-friendly
    const navItems = bottomNav.locator('button');
    const itemCount = await navItems.count();

    for (let i = 0; i < itemCount; i++) {
      const item = navItems.nth(i);
      const itemBox = await item.boundingBox();
      expect(itemBox?.height).toBeGreaterThanOrEqual(44);
      expect(itemBox?.width).toBeGreaterThanOrEqual(44);
    }

    // Test navigation between pages
    const chatNav = bottomNav.locator('button', { hasText: /チャット/ });
    await chatNav.tap();

    await expect(page).toHaveURL(/.*chat/);

    const plannerNav = bottomNav.locator('button', { hasText: /プランナー/ });
    await plannerNav.tap();

    await expect(page).toHaveURL(/.*planner/);
  });

  test('should handle mobile evidence cards', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Send message to trigger evidence display
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('米の収穫時期について教えてください');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check evidence cards are mobile-optimized
    const evidenceCard = page.locator('[data-testid="evidence-card"]').first();
    const cardBox = await evidenceCard.boundingBox();
    expect(cardBox?.width).toBeLessThanOrEqual(375);

    // Check citation information is readable
    const citation = evidenceCard.locator('[data-testid="citation"]');
    await expect(citation).toBeVisible();

    // Check confidence indicator is visible
    const confidence = evidenceCard.locator('[data-testid="confidence-score"]');
    await expect(confidence).toBeVisible();
  });

  test('should handle mobile action confirmation cards', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Send message to trigger action confirmation
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('水やりを記録してください');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check action card fits mobile screen
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    const cardBox = await actionCard.boundingBox();
    expect(cardBox?.width).toBeLessThanOrEqual(375);

    // Check buttons are touch-friendly
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    const cancelButton = actionCard.locator('button', { hasText: /キャンセル/ });

    const confirmBox = await confirmButton.boundingBox();
    const cancelBox = await cancelButton.boundingBox();

    expect(confirmBox?.height).toBeGreaterThanOrEqual(44);
    expect(cancelBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle mobile calendar view', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/calendar');

    // Check calendar fits mobile screen
    const calendar = page.locator('[data-testid="calendar-view"]');
    const calendarBox = await calendar.boundingBox();
    expect(calendarBox?.width).toBeLessThanOrEqual(375);

    // Check date cells are touch-friendly
    const dateCells = calendar.locator('[data-testid="calendar-date"]');
    const firstCell = dateCells.first();
    const cellBox = await firstCell.boundingBox();
    expect(cellBox?.height).toBeGreaterThanOrEqual(44);
    expect(cellBox?.width).toBeGreaterThanOrEqual(44);

    // Test date selection
    await firstCell.tap();
    await expect(firstCell).toHaveClass(/selected/);
  });

  test('should handle mobile language switching', async ({ page }) => {
    await page.goto('http://localhost:3002/ja');

    // Check language switcher is accessible on mobile
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    await expect(languageSwitcher).toBeVisible();

    // Check switcher button is touch-friendly
    const switcherBox = await languageSwitcher.boundingBox();
    expect(switcherBox?.height).toBeGreaterThanOrEqual(44);

    // Test language switching
    await languageSwitcher.tap();

    const englishOption = page.locator('button', { hasText: 'English' });
    await englishOption.tap();

    // Check URL changes to English locale
    await expect(page).toHaveURL(/.*\/en/);
  });

  test('should handle mobile sidebar behavior', async ({ page }) => {
    await page.goto('http://localhost:3002/ja');

    // On mobile, sidebar should be hidden by default
    const sidebar = page.locator('[data-testid="sidebar"]');
    const sidebarClass = await sidebar.getAttribute('class');
    expect(sidebarClass).toContain('hidden');

    // Check hamburger menu is visible
    const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]');
    await expect(hamburgerMenu).toBeVisible();

    // Open sidebar
    await hamburgerMenu.tap();
    await expect(sidebar).toBeVisible();

    // Close sidebar by tapping outside or close button
    const closeButton = page.locator('[data-testid="sidebar-close"]');
    await closeButton.tap();
    await expect(sidebar).not.toBeVisible();
  });

  test('should handle mobile table scrolling', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Check tables have horizontal scroll on mobile
    const tables = page.locator('table');
    const tableCount = await tables.count();

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      const tableBox = await table.boundingBox();

      // Table should be scrollable if wider than screen
      if (tableBox && tableBox.width > 375) {
        const scrollContainer = table.locator('..').locator('[data-testid="table-scroll"]');
        await expect(scrollContainer).toBeVisible();
      }
    }
  });

  test('should handle mobile form validation', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Try to submit empty form
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.tap();

    // Check validation errors are visible on mobile
    const errorMessage = modal.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toBeVisible();

    // Check error messages are properly positioned
    const errorBox = await errorMessage.boundingBox();
    expect(errorBox?.width).toBeLessThanOrEqual(375);
  });
});