import { test, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import fs from 'node:fs';
import path from 'node:path';

function resolveNextAuthSecret(): string {
    if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return 'dev-secret';

    const envRaw = fs.readFileSync(envPath, 'utf8');
    const matched = envRaw.match(/^\s*NEXTAUTH_SECRET\s*=\s*(.+)\s*$/m);
    if (!matched?.[1]) return 'dev-secret';

    return matched[1].replace(/^['"]|['"]$/g, '').trim();
}

const SESSION_SECRET = resolveNextAuthSecret();
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

async function attachAuthenticatedSession(context: BrowserContext) {
    const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || 'e2e-user-1';
    const token = await encode({
        secret: SESSION_SECRET,
        token: {
            sub: userId,
            id: userId,
            email: process.env.PLAYWRIGHT_AUTH_EMAIL || 'e2e@example.com',
            name: process.env.PLAYWRIGHT_AUTH_NAME || 'E2E User',
            onboardingComplete: true,
            profileComplete: true,
        },
        maxAge: 30 * 24 * 60 * 60,
    });

    await context.addCookies([
        {
            name: 'next-auth.session-token',
            value: token,
            url: BASE_URL,
            httpOnly: true,
            sameSite: 'Lax',
        },
    ]);
}

function isMobileProject(testInfo: TestInfo): boolean {
    return /mobile/i.test(testInfo.project.name);
}

async function dragTaskToDate(page: Page, taskTitle: string, targetDate: string) {
    const source = page.locator('[data-testid="project-calendar-day"] button:has-text("' + taskTitle + '")').first();
    const target = page.locator(`[data-testid="project-calendar-day"][data-date="${targetDate}"]`).first();

    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    await source.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();

    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) {
        throw new Error('Unable to resolve drag coordinates');
    }

    await page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 16 },
    );
    await page.mouse.up();
}

test.describe('Elastic Schedule Timeline', () => {
    test.beforeEach(async ({ context }) => {
        await attachAuthenticatedSession(context);
    });

    test('cascades dependent tasks and triggers reschedule suggestion', async ({ page }, testInfo) => {
        test.skip(isMobileProject(testInfo), 'Desktop pointer drag scenario only.');

        let cascadeCalled = false;
        let cascadePayload: any = null;

        await page.route('**/api/v1/projects/project-1/cascade-reschedule', async (route) => {
            const request = route.request();
            if (request.method() === 'POST') {
                cascadeCalled = true;
                cascadePayload = JSON.parse(request.postData() || '{}');
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    suggestion: {
                        summary: "I slid the downstream tasks, but Weeding hit a storm, so I pushed it an extra 2 days.",
                        prompt: "Accept cascade schedule changes",
                        affectedTasks: [
                            { id: "task-seeding", title: "Seeding", dueDate: "2026-02-18" },
                            { id: "task-weeding", title: "Weeding", dueDate: "2026-02-24" }
                        ]
                    }
                }),
            });
        });

        // Mock initial load empty suggestions
        await page.route('**/api/v1/projects/project-1/reschedule-suggestion', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ suggestion: null }) });
        });

        // Mock weather overview to avoid errors
        await page.route('**/api/weather/overview**', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({}) });
        });

        // Navigating to the project calendar page with seeded mock data
        await page.goto('/ja/projects/project-1?debugMockProject=seeded');

        // Make sure we are in calendar tab
        if (isMobileProject(testInfo)) {
            await page.getByTestId('project-mobile-tab-calendar').click();
        }

        // Drag "Soil Prep" from 2026-02-14 to 2026-02-17
        await dragTaskToDate(page, 'Soil Prep', '2026-02-17');

        // Expect the backend endpoint to have caught the drag
        await expect.poll(() => cascadeCalled).toBeTruthy();
        expect(cascadePayload).toMatchObject({
            triggerTaskId: expect.any(String),
            toDate: '2026-02-17'
        });

        // Expect the Handshake Rail to appear with the custom summary from the Agent
        const handshakeSummary = page.getByTestId('calendar-handshake-summary');
        await expect(handshakeSummary).toBeVisible();
        await expect(handshakeSummary).toContainText("hit a storm");
    });
});
