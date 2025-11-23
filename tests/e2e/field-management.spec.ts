import { test, expect } from '@playwright/test';

test.describe('Field Management with Map Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');
    await page.waitForLoadState('networkidle');
  });

  test('should display map with Google Maps integration', async ({ page }) => {
    // Check that map container is visible
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Check for Google Maps elements
    const googleMap = page.locator('.gm-style');
    await expect(googleMap).toBeVisible();
  });

  test('should create new field with polygon drawing', async ({ page }) => {
    // Click create field button
    const createButton = page.locator('button', { hasText: /新規作成/ });
    await createButton.click();

    // Check modal opens
    const modal = page.locator('[data-testid="field-create-modal"]');
    await expect(modal).toBeVisible();

    // Fill field details
    const nameInput = modal.locator('input[name="name"]');
    await nameInput.fill('テスト圃場');

    const cropSelect = modal.locator('select[name="crop"]');
    await cropSelect.selectOption('rice');

    // Simulate drawing polygon on map
    // Note: This would require mocking Google Maps drawing tools
    const mapArea = page.locator('.gm-style');
    await mapArea.click({ position: { x: 100, y: 100 } });
    await mapArea.click({ position: { x: 200, y: 100 } });
    await mapArea.click({ position: { x: 200, y: 200 } });
    await mapArea.click({ position: { x: 100, y: 200 } });
    await mapArea.click({ position: { x: 100, y: 100 } }); // Close polygon

    // Save field
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check field appears in list
    const fieldCard = page.locator('[data-testid="field-card"]').filter({ hasText: 'テスト圃場' });
    await expect(fieldCard).toBeVisible();
  });

  test('should display field boundaries on map', async ({ page }) => {
    // Wait for fields to load
    await page.waitForTimeout(2000);

    // Check that field polygons are rendered on map
    const fieldPolygon = page.locator('.field-polygon');
    await expect(fieldPolygon).toBeVisible();
  });

  test('should edit existing field', async ({ page }) => {
    // Click on existing field card
    const fieldCard = page.locator('[data-testid="field-card"]').first();
    await fieldCard.click();

    // Check edit modal opens
    const editModal = page.locator('[data-testid="field-edit-modal"]');
    await expect(editModal).toBeVisible();

    // Modify field name
    const nameInput = editModal.locator('input[name="name"]');
    await nameInput.fill('更新された圃場');

    // Save changes
    const saveButton = editModal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check updated name appears
    const updatedField = page.locator('[data-testid="field-card"]').filter({ hasText: '更新された圃場' });
    await expect(updatedField).toBeVisible();
  });

  test('should delete field with confirmation', async ({ page }) => {
    const fieldCard = page.locator('[data-testid="field-card"]').first();
    const initialCount = await page.locator('[data-testid="field-card"]').count();

    // Click delete button
    const deleteButton = fieldCard.locator('button', { hasText: /削除/ });
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('button', { hasText: /確認/ });
    await confirmButton.click();

    // Check field is removed
    const finalCount = await page.locator('[data-testid="field-card"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should filter fields by crop type', async ({ page }) => {
    // Check filter controls
    const cropFilter = page.locator('select[data-testid="crop-filter"]');
    await expect(cropFilter).toBeVisible();

    // Select rice filter
    await cropFilter.selectOption('rice');

    // Check only rice fields are shown
    const fieldCards = page.locator('[data-testid="field-card"]');
    const visibleCards = await fieldCards.count();

    for (let i = 0; i < visibleCards; i++) {
      const card = fieldCards.nth(i);
      const cropBadge = card.locator('[data-testid="crop-badge"]');
      await expect(cropBadge).toContainText('rice');
    }
  });

  test('should calculate field area correctly', async ({ page }) => {
    const fieldCard = page.locator('[data-testid="field-card"]').first();

    // Check area display
    const areaDisplay = fieldCard.locator('[data-testid="field-area"]');
    await expect(areaDisplay).toBeVisible();

    // Area should be a positive number
    const areaText = await areaDisplay.textContent();
    const areaValue = parseFloat(areaText?.replace(/[^\d.]/g, '') || '0');
    expect(areaValue).toBeGreaterThan(0);
  });

  test('should handle map zoom and pan', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');

    // Test zoom controls
    const zoomInButton = page.locator('button[data-testid="zoom-in"]');
    await zoomInButton.click();

    const zoomOutButton = page.locator('button[data-testid="zoom-out"]');
    await zoomOutButton.click();

    // Test pan (simulate mouse drag)
    const mapArea = page.locator('.gm-style');
    const box = await mapArea.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
      await page.mouse.up();
    }

    // Map should still be functional
    await expect(mapContainer).toBeVisible();
  });

  test('should integrate with weather overlay', async ({ page }) => {
    // Check weather overlay toggle
    const weatherToggle = page.locator('button[data-testid="weather-overlay-toggle"]');
    await expect(weatherToggle).toBeVisible();

    // Enable weather overlay
    await weatherToggle.click();

    // Check weather data appears on map
    const weatherOverlay = page.locator('[data-testid="weather-overlay"]');
    await expect(weatherOverlay).toBeVisible();
  });

  test('should handle mobile map interactions', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check map is still functional on mobile
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Test touch interactions (simulate touch)
    const mapArea = page.locator('.gm-style');
    await mapArea.tap();

    // Mobile-specific controls should be visible
    const mobileControls = page.locator('[data-testid="mobile-map-controls"]');
    await expect(mobileControls).toBeVisible();
  });
});