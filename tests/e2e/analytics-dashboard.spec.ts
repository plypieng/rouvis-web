import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display main analytics dashboard', async ({ page }) => {
    // Check dashboard title
    const title = page.locator('h1').filter({ hasText: /分析/ });
    await expect(title).toBeVisible();

    // Check main chart containers
    const yieldChart = page.locator('[data-testid="yield-chart"]');
    await expect(yieldChart).toBeVisible();

    const activityChart = page.locator('[data-testid="activity-chart"]');
    await expect(activityChart).toBeVisible();

    const costChart = page.locator('[data-testid="cost-chart"]');
    await expect(costChart).toBeVisible();
  });

  test('should display yield analytics with charts', async ({ page }) => {
    const yieldSection = page.locator('[data-testid="yield-analytics"]');
    await expect(yieldSection).toBeVisible();

    // Check yield comparison table
    const yieldTable = yieldSection.locator('[data-testid="yield-comparison-table"]');
    await expect(yieldTable).toBeVisible();

    // Check table has data
    const tableRows = yieldTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Check yield trend chart
    const trendChart = yieldSection.locator('[data-testid="yield-trend-chart"]');
    await expect(trendChart).toBeVisible();
  });

  test('should display activity analytics', async ({ page }) => {
    const activitySection = page.locator('[data-testid="activity-analytics"]');
    await expect(activitySection).toBeVisible();

    // Check activity timeline
    const timeline = activitySection.locator('[data-testid="activity-timeline"]');
    await expect(timeline).toBeVisible();

    // Check activity summary cards
    const summaryCards = activitySection.locator('[data-testid="activity-summary-card"]');
    await expect(summaryCards).toBeVisible();

    // Check different activity types are represented
    await expect(activitySection).toContainText('watering');
    await expect(activitySection).toContainText('fertilizing');
  });

  test('should display cost analysis', async ({ page }) => {
    const costSection = page.locator('[data-testid="cost-analysis"]');
    await expect(costSection).toBeVisible();

    // Check cost breakdown chart
    const costBreakdown = costSection.locator('[data-testid="cost-breakdown-chart"]');
    await expect(costBreakdown).toBeVisible();

    // Check cost vs revenue analysis
    const costRevenue = costSection.locator('[data-testid="cost-revenue-analysis"]');
    await expect(costRevenue).toBeVisible();

    // Check profitability metrics
    const profitability = costSection.locator('[data-testid="profitability-metrics"]');
    await expect(profitability).toBeVisible();
  });

  test('should display weather impact analytics', async ({ page }) => {
    const weatherSection = page.locator('[data-testid="weather-impact-analytics"]');
    await expect(weatherSection).toBeVisible();

    // Check weather correlation chart
    const correlationChart = weatherSection.locator('[data-testid="weather-correlation-chart"]');
    await expect(correlationChart).toBeVisible();

    // Check weather alerts summary
    const alertsSummary = weatherSection.locator('[data-testid="weather-alerts-summary"]');
    await expect(alertsSummary).toBeVisible();
  });

  test('should filter analytics by date range', async ({ page }) => {
    // Open date range picker
    const dateFilter = page.locator('button[data-testid="date-range-filter"]');
    await dateFilter.click();

    // Select last 30 days
    const lastMonthOption = page.locator('button', { hasText: '過去30日間' });
    await lastMonthOption.click();

    // Wait for charts to update
    await page.waitForTimeout(2000);

    // Check that data is filtered (charts should still be visible but with different data)
    const yieldChart = page.locator('[data-testid="yield-chart"]');
    await expect(yieldChart).toBeVisible();
  });

  test('should filter analytics by field', async ({ page }) => {
    const fieldFilter = page.locator('select[data-testid="field-filter"]');
    await expect(fieldFilter).toBeVisible();

    // Select first field
    await fieldFilter.selectOption({ index: 1 });

    // Wait for data to update
    await page.waitForTimeout(2000);

    // Check filtered results
    const filteredData = page.locator('[data-testid="filtered-analytics-data"]');
    await expect(filteredData).toBeVisible();
  });

  test('should display key performance indicators', async ({ page }) => {
    // Check KPI cards
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const cardCount = await kpiCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Check specific KPIs
    const yieldKpi = page.locator('[data-testid="kpi-card"]').filter({ hasText: /収穫量/ });
    await expect(yieldKpi).toBeVisible();

    const costKpi = page.locator('[data-testid="kpi-card"]').filter({ hasText: /コスト/ });
    await expect(costKpi).toBeVisible();

    const efficiencyKpi = page.locator('[data-testid="kpi-card"]').filter({ hasText: /効率/ });
    await expect(efficiencyKpi).toBeVisible();
  });

  test('should export analytics data', async ({ page }) => {
    const exportButton = page.locator('button[data-testid="export-analytics"]');
    await exportButton.click();

    // Check export options
    const pdfOption = page.locator('button', { hasText: 'PDF' });
    await expect(pdfOption).toBeVisible();

    const excelOption = page.locator('button', { hasText: 'Excel' });
    await expect(excelOption).toBeVisible();

    // Test PDF export option is available
    await expect(pdfOption).toBeEnabled();
  });

  test('should display comparative analysis', async ({ page }) => {
    const comparisonSection = page.locator('[data-testid="comparative-analysis"]');
    await expect(comparisonSection).toBeVisible();

    // Check year-over-year comparison
    const yoyComparison = comparisonSection.locator('[data-testid="year-over-year"]');
    await expect(yoyComparison).toBeVisible();

    // Check field comparison
    const fieldComparison = comparisonSection.locator('[data-testid="field-comparison"]');
    await expect(fieldComparison).toBeVisible();
  });

  test('should handle empty data states', async ({ page }) => {
    // Navigate to analytics with no data (mock or use test user with no data)
    await page.goto('http://localhost:3002/ja/analytics?user=test-empty');

    // Check empty state messages
    const emptyState = page.locator('[data-testid="empty-analytics-state"]');
    await expect(emptyState).toBeVisible();

    // Check call-to-action for adding data
    const ctaButton = emptyState.locator('button', { hasText: /データを追加/ });
    await expect(ctaButton).toBeVisible();
  });

  test('should display real-time updates', async ({ page }) => {
    // Record initial values
    const initialKpiValue = await page.locator('[data-testid="kpi-card"]').first().textContent();

    // Simulate new activity being logged (would need API call or mock)
    // For now, check that update indicators exist
    const lastUpdated = page.locator('[data-testid="last-updated"]');
    await expect(lastUpdated).toBeVisible();

    // Check refresh button
    const refreshButton = page.locator('button[data-testid="refresh-analytics"]');
    await expect(refreshButton).toBeVisible();
  });

  test('should handle mobile analytics view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile-optimized layout
    const mobileCharts = page.locator('[data-testid="mobile-chart"]');
    await expect(mobileCharts).toBeVisible();

    // Check collapsible sections
    const collapsibleSection = page.locator('[data-testid="collapsible-section"]');
    await collapsibleSection.click();

    // Check section expands/collapses
    const sectionContent = page.locator('[data-testid="section-content"]');
    await expect(sectionContent).toBeVisible();
  });

  test('should display predictive analytics', async ({ page }) => {
    const predictiveSection = page.locator('[data-testid="predictive-analytics"]');
    await expect(predictiveSection).toBeVisible();

    // Check yield predictions
    const yieldPrediction = predictiveSection.locator('[data-testid="yield-prediction"]');
    await expect(yieldPrediction).toBeVisible();

    // Check weather impact predictions
    const weatherPrediction = predictiveSection.locator('[data-testid="weather-prediction"]');
    await expect(weatherPrediction).toBeVisible();
  });
});