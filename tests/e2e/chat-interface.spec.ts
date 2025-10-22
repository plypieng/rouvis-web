import { test, expect } from '@playwright/test';

test.describe('Chat Interface with OpenAI ChatKit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should load chat interface with ChatKit', async ({ page }) => {
    // Check that ChatKit components are rendered
    const chatContainer = page.locator('[data-testid="chatkit-container"]');
    await expect(chatContainer).toBeVisible();

    // Check for input field
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    await expect(inputField).toBeVisible();

    // Check for send button
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    // Type a message
    await inputField.fill('こんにちは');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check that message appears in chat
    const userMessage = page.locator('.message-user').last();
    await expect(userMessage).toContainText('こんにちは');

    // Check for assistant response
    const assistantMessage = page.locator('.message-assistant').last();
    await expect(assistantMessage).toBeVisible();
  });

  test('should handle streaming responses', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    // Send a longer message that should trigger streaming
    await inputField.fill('天気予報を教えてください');
    await sendButton.click();

    // Check for streaming indicators
    const streamingIndicator = page.locator('[data-testid="streaming-indicator"]');
    await expect(streamingIndicator).toBeVisible();

    // Wait for streaming to complete
    await page.waitForTimeout(5000);
    await expect(streamingIndicator).not.toBeVisible();
  });

  test('should display evidence cards with citations', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    // Ask a question that should trigger evidence display
    await inputField.fill('米の収穫時期について教えてください');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check for evidence cards
    const evidenceCard = page.locator('[data-testid="evidence-card"]').first();
    await expect(evidenceCard).toBeVisible();

    // Check for citation information
    const citation = evidenceCard.locator('[data-testid="citation"]');
    await expect(citation).toBeVisible();

    // Check for confidence score
    const confidence = evidenceCard.locator('[data-testid="confidence-score"]');
    await expect(confidence).toBeVisible();
  });

  test('should show action confirmation cards', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    // Ask for an action that should trigger confirmation
    await inputField.fill('水やりを記録してください');
    await sendButton.click();

    await page.waitForTimeout(5000);

    // Check for action confirmation card
    const actionCard = page.locator('[data-testid="action-confirmation-card"]');
    await expect(actionCard).toBeVisible();

    // Check for confirm button
    const confirmButton = actionCard.locator('button', { hasText: /確認/ });
    await expect(confirmButton).toBeVisible();

    // Check for cancel button
    const cancelButton = actionCard.locator('button', { hasText: /キャンセル/ });
    await expect(cancelButton).toBeVisible();
  });

  test('should handle Japanese localization correctly', async ({ page }) => {
    // Check that interface is in Japanese
    const chatTitle = page.locator('h1, h2').filter({ hasText: /チャット/ });
    await expect(chatTitle).toBeVisible();

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    await expect(inputField).toHaveAttribute('placeholder', /メッセージ/);

    // Send Japanese message
    const sendButton = page.locator('button[type="submit"]');
    await inputField.fill('こんにちは');
    await sendButton.click();

    await page.waitForTimeout(3000);

    // Check that response is in Japanese
    const assistantMessage = page.locator('.message-assistant').last();
    await expect(assistantMessage).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by blocking API calls
    await page.route('**/api/chat/**', route => route.abort());

    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('テストメッセージ');
    await sendButton.click();

    // Check for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('should show loading states during message processing', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const sendButton = page.locator('button[type="submit"]');

    await inputField.fill('ローディングテスト');
    await sendButton.click();

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();

    // Wait for response
    await page.waitForTimeout(3000);
    await expect(loadingIndicator).not.toBeVisible();
  });
});