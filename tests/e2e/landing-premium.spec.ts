import { expect, test } from '@playwright/test';

test.describe('Premium landing flow', () => {
  test('renders reduced five-section architecture with interactive workflow', async ({ page }) => {
    await page.goto('/ja');

    await expect(page.getByTestId('landing-hero')).toBeVisible();
    await expect(page.getByTestId('landing-proof-strip')).toBeVisible();
    await expect(page.getByTestId('landing-how-it-works')).toBeVisible();
    await expect(page.getByTestId('landing-field-reality')).toBeVisible();
    await expect(page.getByTestId('landing-final-cta')).toBeVisible();

    await page.getByTestId('landing-cta-see-how').click();
    await expect(page.getByTestId('landing-how-it-works')).toBeVisible();

    const activePanel = page.getByTestId('landing-how-active-panel');
    await page.getByTestId('landing-how-step-2').click();
    await expect(activePanel).toContainText('AIが日次プランを生成');

    await page.getByTestId('landing-how-step-3').click();
    await expect(activePanel).toContainText('実行して記録する');
  });

  test('keeps conversion and sign-in paths available from final CTA', async ({ page }) => {
    await page.goto('/ja');

    const applyFinal = page.getByTestId('landing-cta-apply-final');
    const signInFinal = page.getByTestId('landing-cta-signin-final');

    await expect(applyFinal).toBeVisible();
    await expect(signInFinal).toBeVisible();
    await expect(applyFinal).toHaveAttribute('href', /\/ja\/signup\?intent=waitlist&source=landing_footer/);
    await expect(signInFinal).toHaveAttribute('href', /\/ja\/login\?intent=sign_in&source=landing_footer/);

    const responsePanel = page.getByTestId('landing-reality-response');
    await page.getByTestId('landing-reality-weather').click();
    const weatherText = await responsePanel.textContent();
    await page.getByTestId('landing-reality-labor').click();
    const laborText = await responsePanel.textContent();

    expect(laborText).not.toBe(weatherText);
  });
});
