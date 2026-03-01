import { test, expect } from '@playwright/test';
import {
  attachAuthenticatedSession,
  expectClassContains,
  expectTouchTarget,
  isMobileProject,
  readScrollMetrics,
  setupChatkitRoutes,
  setupCommonClientRoutes,
  setupProjectDetailRoutes,
  setupProjectsListRoutes,
} from './workflow-ux-test-utils';

test.describe('Mobile workflow UX regression', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    test.skip(!isMobileProject(testInfo), 'Mobile-only regression coverage.');
    await attachAuthenticatedSession(context);
    await setupCommonClientRoutes(page);
  });

  test('stacks dashboard recovery actions cleanly on mobile', async ({ page }) => {
    await page.goto('/ja?debugDataError=1');

    const commandCenter = page.getByTestId('today-command-center');
    await expect(commandCenter).toBeVisible();

    const miniCalendar = page.getByTestId('dashboard-mini-calendar');
    const miniCalendarScroll = page.getByTestId('dashboard-mini-calendar-scroll');
    await expect(miniCalendar).toBeVisible();
    const miniCalendarMetrics = await readScrollMetrics(miniCalendarScroll);
    expect(miniCalendarMetrics.scrollWidth).toBeGreaterThan(miniCalendarMetrics.clientWidth);

    const panel = page.getByTestId('dashboard-next-best-action');
    const primaryAction = page.getByTestId('dashboard-next-best-action-primary');
    const secondaryAction = page.getByTestId('dashboard-next-best-action-secondary');
    await expect(panel).toBeVisible();
    await expect(primaryAction).toBeVisible();
    await expect(secondaryAction).toBeVisible();
    await expectTouchTarget(primaryAction);
    await expectTouchTarget(secondaryAction);

    const panelBox = await panel.boundingBox();
    const primaryBox = await primaryAction.boundingBox();
    const secondaryBox = await secondaryAction.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(primaryBox).not.toBeNull();
    expect(secondaryBox).not.toBeNull();
    expect(primaryBox?.width ?? 0).toBeGreaterThan((panelBox?.width ?? 0) * 0.55);
    expect(secondaryBox?.width ?? 0).toBeGreaterThan((panelBox?.width ?? 0) * 0.55);
    expect(Math.abs((primaryBox?.x ?? 0) - (secondaryBox?.x ?? 0))).toBeLessThan(8);
    expect((secondaryBox?.y ?? 0) - (primaryBox?.y ?? 0)).toBeGreaterThan(12);

    const quickActions = page.getByTestId('today-command-center-quick-actions').locator('a, button');
    await expect(quickActions).toHaveCount(4);

    for (let index = 0; index < 4; index += 1) {
      await expectTouchTarget(quickActions.nth(index));
    }

    const firstQuickActionBox = await quickActions.nth(0).boundingBox();
    const thirdQuickActionBox = await quickActions.nth(2).boundingBox();
    expect(firstQuickActionBox).not.toBeNull();
    expect(thirdQuickActionBox).not.toBeNull();
    expect(Math.abs((firstQuickActionBox?.x ?? 0) - (thirdQuickActionBox?.x ?? 0))).toBeLessThan(8);
    expect((thirdQuickActionBox?.y ?? 0) - (firstQuickActionBox?.y ?? 0)).toBeGreaterThan(10);
  });

  test('opens seeded calendar day details as a mobile sheet', async ({ page }) => {
    await page.goto('/ja/calendar?date=2026-02-14&debugMockCalendar=seeded');

    const calendar = page.getByTestId('calendar-view');
    const gridScroll = page.getByTestId('calendar-grid-scroll');
    const openSheetButton = page.getByTestId('calendar-mobile-sheet-open');
    await expect(calendar).toBeVisible();
    await expect(openSheetButton).toBeVisible();
    await expectTouchTarget(openSheetButton);

    const gridMetrics = await readScrollMetrics(gridScroll);
    expect(gridMetrics.scrollWidth).toBeGreaterThan(gridMetrics.clientWidth);

    const calendarBox = await calendar.boundingBox();
    const openButtonBox = await openSheetButton.boundingBox();
    expect(calendarBox).not.toBeNull();
    expect(openButtonBox).not.toBeNull();
    expect(openButtonBox?.width ?? 0).toBeGreaterThan((calendarBox?.width ?? 0) * 0.8);

    await page.locator('[data-testid="calendar-date"][data-date="2026-02-15"]').tap();

    const mobileSheet = page.getByTestId('calendar-mobile-sheet');
    const closeSheetButton = page.getByTestId('calendar-mobile-sheet-close');
    await expect(mobileSheet).toBeVisible();
    await expect(mobileSheet).toContainText('Canopy scouting');
    await expectTouchTarget(closeSheetButton);

    await closeSheetButton.click();
    await expect(mobileSheet).toHaveCount(0);

    await openSheetButton.click();
    await expect(mobileSheet).toBeVisible();
    await expect(mobileSheet).toContainText('Canopy scouting');
  });

  test('keeps project list mobile actions easy to reach', async ({ page }) => {
    await setupProjectsListRoutes(page);
    await page.goto('/ja/projects');

    const createLink = page.getByTestId('projects-create-link');
    const archiveToggle = page.getByTestId('projects-show-archived-toggle');
    await expect(createLink).toBeVisible();
    await expect(archiveToggle).toBeVisible();
    await expectTouchTarget(createLink);
    await expectTouchTarget(archiveToggle);

    const createBox = await createLink.boundingBox();
    const toggleBox = await archiveToggle.boundingBox();
    expect(createBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    expect(Math.abs((createBox?.x ?? 0) - (toggleBox?.x ?? 0))).toBeLessThan(8);
    expect((createBox?.y ?? 0) - (toggleBox?.y ?? 0)).toBeGreaterThan(8);

    const activeCard = page.getByTestId('project-card-project-1');
    const activeActions = page.getByTestId('project-card-actions-project-1');
    const openLink = page.getByTestId('project-open-link-project-1-mobile');
    const aiLink = page.getByTestId('project-ai-link-project-1-mobile');
    const deleteButton = page.getByTestId('project-delete-button-project-1-mobile');
    await expect(activeCard).toBeVisible();
    await expect(activeActions).toBeVisible();
    await expect(openLink).toBeVisible();
    await expect(aiLink).toBeVisible();
    await expect(deleteButton).toBeVisible();
    await expectTouchTarget(openLink);
    await expectTouchTarget(aiLink);
    await expectTouchTarget(deleteButton);

    const cardBox = await activeCard.boundingBox();
    const actionsBox = await activeActions.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(actionsBox?.width ?? 0).toBeGreaterThan((cardBox?.width ?? 0) * 0.82);
    await expect(aiLink).toHaveAttribute('href', /intent=project/);
    await expect(aiLink).toHaveAttribute('href', /projectId=project-1/);

    await archiveToggle.dispatchEvent('click');
    const archivedCard = page.getByTestId('project-card-project-2');
    const archivedActions = page.getByTestId('project-card-actions-project-2');
    const unarchiveButton = page.getByTestId('project-unarchive-button-project-2-mobile');
    await expect(archivedCard).toBeVisible();
    await expect(archivedActions).toBeVisible();
    await expect(unarchiveButton).toBeVisible();
    await expectTouchTarget(unarchiveButton);
  });

  test('switches project detail mobile surfaces with touch-first controls', async ({ page }) => {
    await setupProjectDetailRoutes(page);
    await page.goto('/ja/projects/project-1?debugMockProject=seeded');

    const sectionSwitcher = page.getByTestId('project-mobile-section-switcher');
    const cockpitSection = page.getByTestId('project-mobile-section-cockpit');
    const settingsSection = page.getByTestId('project-mobile-section-settings');
    const sectionButtons = sectionSwitcher.locator('button');

    await expect(sectionSwitcher).toBeVisible();
    await expect(sectionButtons).toHaveCount(4);

    for (let index = 0; index < 4; index += 1) {
      await expectTouchTarget(sectionButtons.nth(index));
    }

    const firstSectionBox = await sectionButtons.nth(0).boundingBox();
    const thirdSectionBox = await sectionButtons.nth(2).boundingBox();
    expect(firstSectionBox).not.toBeNull();
    expect(thirdSectionBox).not.toBeNull();
    expect(Math.abs((firstSectionBox?.x ?? 0) - (thirdSectionBox?.x ?? 0))).toBeLessThan(8);
    expect((thirdSectionBox?.y ?? 0) - (firstSectionBox?.y ?? 0)).toBeGreaterThan(12);

    await settingsSection.click();
    await expect(page).toHaveURL(/tab=settings/);
    await expect(page.getByTestId('project-tab-settings')).toBeVisible();

    await cockpitSection.click();
    await expect(page).not.toHaveURL(/tab=settings/);

    const panelSwitcher = page.getByTestId('project-mobile-panel-switcher');
    const chatTab = page.getByTestId('project-mobile-tab-chat');
    const calendarTab = page.getByTestId('project-mobile-tab-calendar');
    await expect(panelSwitcher).toBeVisible();
    await expectTouchTarget(chatTab);
    await expectTouchTarget(calendarTab);

    await calendarTab.click();
    await expect(page).toHaveURL(/panel=calendar/);
    await expect(page.getByTestId('project-cockpit-calendar-pane').first()).toBeVisible();
    await expect(page.locator('[data-testid="project-calendar-day"]').first()).toBeVisible();

    await chatTab.click();
    await expect(page).toHaveURL(/panel=chat/);
    await expect(page.getByTestId('project-cockpit-chat-pane').first()).toBeVisible();
  });

  test('uses a bottom-sheet command log on mobile chat', async ({ page }) => {
    await setupChatkitRoutes(page, {
      threads: [
        {
          id: 'thread-chat-1',
          title: 'Morning field check',
          createdAt: '2026-03-01T07:00:00.000Z',
          updatedAt: '2026-03-01T07:15:00.000Z',
        },
        {
          id: 'thread-chat-2',
          title: 'Irrigation notes',
          createdAt: '2026-03-01T08:00:00.000Z',
          updatedAt: '2026-03-01T08:20:00.000Z',
        },
      ],
    });
    await page.goto('/ja/chat');

    const toggle = page.getByTestId('chat-command-log-toggle');
    const commandLogRail = page.getByTestId('command-log-rail');
    await expect(toggle).toBeVisible();
    await expectTouchTarget(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expectClassContains(commandLogRail, 'translate-y-[104%]');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('chat-command-log-overlay')).toBeVisible();
    await expectClassContains(commandLogRail, 'translate-y-0 opacity-100');

    const viewport = page.viewportSize();
    const railBox = await commandLogRail.boundingBox();
    expect(railBox).not.toBeNull();
    expect(railBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
    expect(railBox?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.45);
    expect(railBox?.y ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.15);

    const firstThread = page.getByTestId('chat-thread-item').first();
    await expect(firstThread).toBeVisible();
    await expectTouchTarget(firstThread);
    await firstThread.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expectClassContains(commandLogRail, 'translate-y-[104%]');

    await toggle.click();
    const overlay = page.getByTestId('chat-command-log-overlay');
    await expect(overlay).toBeVisible();
  });
});
