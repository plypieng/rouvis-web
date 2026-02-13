import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

type SessionOptions = {
  onboardingComplete: boolean;
  profileComplete?: boolean;
  uiMode?: 'new_farmer' | 'veteran_farmer';
};

type SessionState = {
  onboardingComplete: boolean;
  profileComplete: boolean;
  uiMode?: 'new_farmer' | 'veteran_farmer';
};

async function attachAuthenticatedSession(context: BrowserContext, options: SessionOptions) {
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: 'e2e-user-1',
      id: 'e2e-user-1',
      email: 'e2e@example.com',
      name: 'E2E User',
      onboardingComplete: options.onboardingComplete,
      profileComplete: options.profileComplete ?? options.onboardingComplete,
      uiMode: options.uiMode,
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

async function mockAuthSession(page: Page, state: SessionState) {
  await page.route('**/api/auth/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/auth/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'e2e-user-1',
            email: 'e2e@example.com',
            name: 'E2E User',
            onboardingComplete: state.onboardingComplete,
            profileComplete: state.profileComplete,
            uiMode: state.uiMode,
          },
          expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      });
      return;
    }

    if (url.includes('/api/auth/csrf')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'e2e-csrf-token' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

test.describe('Farmer UI mode flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/telemetry/events', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
  });

  test('onboarding profile step blocks continue until mode is chosen', async ({ context, page }) => {
    await attachAuthenticatedSession(context, {
      onboardingComplete: false,
      profileComplete: false,
    });
    const sessionState: SessionState = {
      onboardingComplete: false,
      profileComplete: false,
    };
    await mockAuthSession(page, sessionState);

    await page.route('**/api/v1/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Profile not found' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: 'profile_1',
            uiMode: 'new_farmer',
            experienceLevel: '1_3',
          },
          resolvedUiMode: 'new_farmer',
        }),
      });
    });

    await page.goto('/ja/onboarding');
    await page.getByRole('button', { name: 'セットアップを始める' }).click();

    const nextButton = page.getByRole('button', { name: '次へ' });
    await expect(nextButton).toBeDisabled();

    await page.getByTestId('onboarding-farmer-mode-new').click();
    await expect(nextButton).toBeEnabled();
  });

  test('onboarding mode selection is sent and drives dashboard mode after completion', async ({ context, page }) => {
    await attachAuthenticatedSession(context, {
      onboardingComplete: false,
      profileComplete: false,
    });
    const sessionState: SessionState = {
      onboardingComplete: false,
      profileComplete: false,
    };
    await mockAuthSession(page, sessionState);

    let postedMode: 'new_farmer' | 'veteran_farmer' = 'new_farmer';

    await page.route('**/api/v1/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Profile not found' }),
        });
        return;
      }

      const body = route.request().postDataJSON() as { uiMode?: 'new_farmer' | 'veteran_farmer' };
      postedMode = body.uiMode || 'new_farmer';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: 'profile_1',
            uiMode: postedMode,
            experienceLevel: 'over_10',
          },
          resolvedUiMode: postedMode,
        }),
      });
    });

    await page.goto('/ja/onboarding');
    await page.getByRole('button', { name: 'セットアップを始める' }).click();
    await page.getByTestId('onboarding-farmer-mode-veteran').click();
    await page.getByRole('button', { name: '次へ' }).click();

    await expect.poll(() => postedMode).toBe('veteran_farmer');

    await attachAuthenticatedSession(context, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: postedMode,
    });
    sessionState.onboardingComplete = true;
    sessionState.profileComplete = true;
    sessionState.uiMode = postedMode;

    await page.goto('/ja');
    await expect(page.getByTestId('dashboard-mode-veteran')).toBeVisible();
  });

  test('settings toggle posts mode and dashboard reflects mode after refresh', async ({ context, page }) => {
    await attachAuthenticatedSession(context, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'new_farmer',
    });
    const sessionState: SessionState = {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'new_farmer',
    };
    await mockAuthSession(page, sessionState);

    let currentMode: 'new_farmer' | 'veteran_farmer' = 'new_farmer';

    await page.route('**/api/v1/profile', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile: {
              id: 'profile_1',
              uiMode: currentMode,
              experienceLevel: currentMode === 'veteran_farmer' ? 'over_10' : '1_3',
            },
            resolvedUiMode: currentMode,
          }),
        });
        return;
      }

      const body = route.request().postDataJSON() as { uiMode?: 'new_farmer' | 'veteran_farmer' };
      currentMode = body.uiMode || currentMode;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: 'profile_1',
            uiMode: currentMode,
            experienceLevel: currentMode === 'veteran_farmer' ? 'over_10' : '1_3',
          },
          resolvedUiMode: currentMode,
        }),
      });
    });

    await page.goto('/ja/settings');
    await page.getByTestId('settings-farmer-mode-veteran').click();
    await expect.poll(() => currentMode).toBe('veteran_farmer');

    await attachAuthenticatedSession(context, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: currentMode,
    });
    sessionState.uiMode = currentMode;

    await page.goto('/ja');
    await expect(page.getByTestId('dashboard-mode-veteran')).toBeVisible();
  });

  test('new mode hides season rail by default and reveals it via disclosure', async ({ context, page }) => {
    await attachAuthenticatedSession(context, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'new_farmer',
    });
    await mockAuthSession(page, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'new_farmer',
    });

    await page.goto('/ja');
    await expect(page.getByTestId('dashboard-mode-new')).toBeVisible();
    await expect(page.getByTestId('season-rail-disclosure')).toBeVisible();
    await expect(page.getByTestId('season-rail-expanded')).not.toBeVisible();
    await expect(page.getByText('Invalid Date')).toHaveCount(0);

    await page.getByTestId('season-rail-disclosure').click();
    await expect(page.getByTestId('season-rail-expanded')).toBeVisible();
  });

  test('veteran mode shows season rail by default', async ({ context, page }) => {
    await attachAuthenticatedSession(context, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'veteran_farmer',
    });
    await mockAuthSession(page, {
      onboardingComplete: true,
      profileComplete: true,
      uiMode: 'veteran_farmer',
    });

    await page.goto('/ja');
    await expect(page.getByTestId('dashboard-mode-veteran')).toBeVisible();
    await expect(page.getByTestId('season-rail-expanded')).toBeVisible();
    await expect(page.getByTestId('season-rail-disclosure')).toHaveCount(0);
    await expect(page.getByText('Invalid Date')).toHaveCount(0);
  });
});
