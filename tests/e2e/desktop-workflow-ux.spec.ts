import { test, expect } from '@playwright/test';
import {
  attachAuthenticatedSession,
  isDesktopProject,
  setupChatkitRoutes,
  setupCommonClientRoutes,
  setupProjectDetailRoutes,
  setupProjectsListRoutes,
} from './workflow-ux-test-utils';

test.describe('Desktop workflow UX regression', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    test.skip(!isDesktopProject(testInfo), 'Desktop-only regression coverage.');
    await attachAuthenticatedSession(context);
    await setupCommonClientRoutes(page);
  });

  test('keeps dashboard recovery actions spread across the desktop layout', async ({ page }) => {
    await page.goto('/ja?debugDataError=1');

    const commandCenter = page.getByTestId('today-command-center');
    const panel = page.getByTestId('dashboard-next-best-action');
    const primaryAction = page.getByTestId('dashboard-next-best-action-primary');
    const secondaryAction = page.getByTestId('dashboard-next-best-action-secondary');
    await expect(commandCenter).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(primaryAction).toBeVisible();
    await expect(secondaryAction).toBeVisible();

    const primaryBox = await primaryAction.boundingBox();
    const secondaryBox = await secondaryAction.boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(secondaryBox).not.toBeNull();
    expect(Math.abs((primaryBox?.y ?? 0) - (secondaryBox?.y ?? 0))).toBeLessThan(10);
    expect(Math.abs((primaryBox?.x ?? 0) - (secondaryBox?.x ?? 0))).toBeGreaterThan(40);

    const quickActions = page.getByTestId('today-command-center-quick-actions').locator('a, button');
    await expect(quickActions).toHaveCount(4);

    const firstQuickActionBox = await quickActions.nth(0).boundingBox();
    const thirdQuickActionBox = await quickActions.nth(2).boundingBox();
    expect(firstQuickActionBox).not.toBeNull();
    expect(thirdQuickActionBox).not.toBeNull();
    expect(Math.abs((firstQuickActionBox?.y ?? 0) - (thirdQuickActionBox?.y ?? 0))).toBeLessThan(10);
    expect(Math.abs((firstQuickActionBox?.x ?? 0) - (thirdQuickActionBox?.x ?? 0))).toBeGreaterThan(120);
  });

  test('keeps seeded calendar details pinned in the desktop side panel', async ({ page }) => {
    await page.goto('/ja/calendar?date=2026-02-14&debugMockCalendar=seeded');

    const desktopPanel = page.getByTestId('calendar-desktop-panel');
    const mobileSheetButton = page.getByTestId('calendar-mobile-sheet-open');
    await expect(desktopPanel).toBeVisible();
    await expect(mobileSheetButton).toBeHidden();

    await page.locator('[data-testid="calendar-date"][data-date="2026-02-15"]').click();
    await expect(desktopPanel.getByTestId('date-display')).toBeVisible();
    await expect(desktopPanel.getByTestId('activity-timeline')).toContainText('Canopy scouting');
  });

  test('keeps project list desktop corner actions visible without the mobile action row', async ({ page }) => {
    await setupProjectsListRoutes(page);
    await page.goto('/ja/projects');

    const createLink = page.getByTestId('projects-create-link');
    const archiveToggle = page.getByTestId('projects-show-archived-toggle');
    await expect(createLink).toBeVisible();
    await expect(archiveToggle).toBeVisible();

    const createBox = await createLink.boundingBox();
    const toggleBox = await archiveToggle.boundingBox();
    expect(createBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    expect(Math.abs((createBox?.y ?? 0) - (toggleBox?.y ?? 0))).toBeLessThan(10);

    const activeCard = page.getByTestId('project-card-project-1');
    const mobileActions = page.getByTestId('project-card-actions-project-1');
    const aiLink = page.getByTestId('project-ai-link-project-1');
    const deleteButton = page.getByTestId('project-delete-button-project-1-desktop');
    await expect(activeCard).toBeVisible();
    await expect(mobileActions).toBeHidden();
    await expect(aiLink).toBeVisible();
    await expect(deleteButton).toBeVisible();

    const aiBox = await aiLink.boundingBox();
    const deleteBox = await deleteButton.boundingBox();
    expect(aiBox).not.toBeNull();
    expect(deleteBox).not.toBeNull();
    expect((deleteBox?.x ?? 0) - (aiBox?.x ?? 0)).toBeGreaterThan(120);
    expect(Math.abs((deleteBox?.y ?? 0) - (aiBox?.y ?? 0))).toBeLessThan(24);

    await archiveToggle.dispatchEvent('click');
    const archivedCard = page.getByTestId('project-card-project-2');
    const desktopUnarchiveButton = page.getByTestId('project-unarchive-button-project-2-desktop');
    await expect(archivedCard).toBeVisible();
    await expect(desktopUnarchiveButton).toBeVisible();
  });

  test('keeps project detail in split desktop mode while desktop tabs switch surfaces', async ({ page }) => {
    await setupProjectDetailRoutes(page);
    await page.goto('/ja/projects/project-1?debugMockProject=seeded');

    const mobileSectionSwitcher = page.getByTestId('project-mobile-section-switcher');
    const mobilePanelSwitcher = page.getByTestId('project-mobile-panel-switcher');
    const cockpitTab = page.getByTestId('project-desktop-tab-cockpit');
    const settingsTab = page.getByTestId('project-desktop-tab-settings');
    await expect(mobileSectionSwitcher).toBeHidden();
    await expect(mobilePanelSwitcher).toBeHidden();
    await expect(cockpitTab).toBeVisible();
    await expect(settingsTab).toBeVisible();
    await expect(page.getByTestId('project-cockpit-chat-pane').last()).toBeVisible();
    await expect(page.getByTestId('project-cockpit-calendar-pane').last()).toBeVisible();

    await settingsTab.click();
    await expect(page).toHaveURL(/tab=settings/);
    await expect(page.getByTestId('project-tab-settings')).toBeVisible();
    await expect(page.getByTestId('project-tab-cockpit')).toBeHidden();

    await cockpitTab.click();
    await expect(page).not.toHaveURL(/tab=settings/);
    await expect(page.getByTestId('project-tab-cockpit')).toBeVisible();
    await expect(page.getByTestId('project-cockpit-chat-pane').last()).toBeVisible();
    await expect(page.getByTestId('project-cockpit-calendar-pane').last()).toBeVisible();
  });

  test('keeps the command log docked beside the chat composer on desktop', async ({ page }) => {
    await setupChatkitRoutes(page);
    await page.goto('/ja/chat');

    const toggle = page.getByTestId('chat-command-log-toggle');
    const rail = page.getByTestId('command-log-rail');
    const mainPane = page.getByTestId('chat-main-pane');
    const firstThread = page.getByTestId('chat-thread-item').first();
    await expect(toggle).toBeHidden();
    await expect(page.getByTestId('chat-command-log-overlay')).toHaveCount(0);
    await expect(rail).toBeVisible();
    await expect(mainPane).toBeVisible();
    await expect(firstThread).toBeVisible();

    const railBox = await rail.boundingBox();
    const mainBox = await mainPane.boundingBox();
    expect(railBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(Math.abs((railBox?.y ?? 0) - (mainBox?.y ?? 0))).toBeLessThan(24);
    expect((mainBox?.x ?? 0) - (railBox?.x ?? 0)).toBeGreaterThan((railBox?.width ?? 0) * 0.7);

    await firstThread.click();
    await expect(rail).toBeVisible();
    await expect(mainPane).toBeVisible();
  });
});
