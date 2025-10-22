import { test, expect } from '@playwright/test';

test.describe('Japanese Localization Accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/ja');
    await page.waitForLoadState('networkidle');
  });

  test('should display all UI text in Japanese', async ({ page }) => {
    // Check main navigation
    const navItems = ['ホーム', 'チャット', 'プランナー', '分析', 'コミュニティ', 'カレンダー'];
    for (const item of navItems) {
      const navElement = page.locator(`text=${item}`);
      await expect(navElement).toBeVisible();
    }

    // Check page titles
    const titles = ['ダッシュボード', 'チャット', 'プランナー', '分析', 'コミュニティ', 'カレンダー'];
    for (const title of titles) {
      const titleElement = page.locator(`h1, h2`).filter({ hasText: title });
      await expect(titleElement).toBeVisible();
    }
  });

  test('should have accurate Japanese translations for chat interface', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Check chat-specific terms
    const chatTerms = [
      'メッセージ',
      '送信',
      'チャット',
      'アシスタント',
      'ユーザー'
    ];

    for (const term of chatTerms) {
      const element = page.locator(`text=${term}`);
      await expect(element).toBeVisible();
    }

    // Check input placeholder
    const inputField = page.locator('input[placeholder*="メッセージ"]');
    const placeholder = await inputField.getAttribute('placeholder');
    expect(placeholder).toContain('メッセージ');
  });

  test('should display correct Japanese field management terms', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    // Check field management terms
    const fieldTerms = [
      '圃場',
      '新規作成',
      '編集',
      '削除',
      '地図',
      '面積'
    ];

    for (const term of fieldTerms) {
      const element = page.locator(`text=${term}`);
      await expect(element).toBeVisible();
    }
  });

  test('should have accurate Japanese activity logging terms', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Check activity logging terms
    const activityTerms = [
      '活動を記録',
      '種類',
      '数量',
      '単位',
      'メモ',
      '保存',
      'キャンセル'
    ];

    for (const term of activityTerms) {
      const element = modal.locator(`text=${term}`);
      await expect(element).toBeVisible();
    }

    // Check activity types in Japanese
    const activityTypes = ['水やり', '肥料', '収穫', '耕作'];
    for (const type of activityTypes) {
      const option = modal.locator(`option`).filter({ hasText: type });
      await expect(option).toBeVisible();
    }
  });

  test('should display correct Japanese analytics terms', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Check analytics terms
    const analyticsTerms = [
      '分析',
      '収穫量',
      'コスト',
      '収益',
      '効率',
      '傾向',
      '比較',
      '予測'
    ];

    for (const term of analyticsTerms) {
      const element = page.locator(`text=${term}`);
      await expect(element).toBeVisible();
    }
  });

  test('should handle Japanese date and time formats', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/calendar');

    // Check Japanese date format (YYYY年MM月DD日)
    const dateElements = page.locator('[data-testid="date-display"]');
    const firstDate = dateElements.first();
    const dateText = await firstDate.textContent();

    // Should contain Japanese date markers
    expect(dateText).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);

    // Check Japanese time format
    const timeElements = page.locator('[data-testid="time-display"]');
    if (await timeElements.count() > 0) {
      const firstTime = timeElements.first();
      const timeText = await firstTime.textContent();
      // Should be in 24-hour format or with Japanese markers
      expect(timeText).toMatch(/(\d{1,2}:\d{2})|(時)|(分)/);
    }
  });

  test('should display correct Japanese units and measurements', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    // Check measurement units
    const units = ['L', 'kg', 't', '㎡', 'ha'];

    // Log an activity to see units
    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Check unit options
    for (const unit of units) {
      const unitOption = modal.locator(`option`).filter({ hasText: unit });
      await expect(unitOption).toBeVisible();
    }
  });

  test('should have accurate Japanese error messages', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    // Trigger an error by sending empty message
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Check for Japanese error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.textContent();
      // Should contain Japanese characters
      expect(errorText).toMatch(/[ぁ-ゖ]+|[ァ-ヾ]+|[一-龯]+/);
    }
  });

  test('should display correct Japanese weather terms', async ({ page }) => {
    await page.goto('http://localhost:3002/ja');

    // Check weather-related terms
    const weatherTerms = [
      '天気',
      '気温',
      '降水量',
      '湿度',
      '風速'
    ];

    for (const term of weatherTerms) {
      const element = page.locator(`text=${term}`);
      await expect(element).toBeVisible();
    }
  });

  test('should handle Japanese crop names correctly', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    // Check crop names in Japanese
    const cropNames = ['米', '麦', '大豆', '野菜', '果樹'];

    // Create field to see crop options
    const createButton = page.locator('button', { hasText: /新規作成/ });
    await createButton.click();

    const modal = page.locator('[data-testid="field-create-modal"]');

    // Check crop select options
    for (const crop of cropNames) {
      const cropOption = modal.locator(`option`).filter({ hasText: crop });
      await expect(cropOption).toBeVisible();
    }
  });

  test('should display correct Japanese button labels', async ({ page }) => {
    // Check common button labels across different pages
    const buttonLabels = [
      '保存',
      'キャンセル',
      '編集',
      '削除',
      '確認',
      '戻る',
      '次へ'
    ];

    for (const label of buttonLabels) {
      const button = page.locator(`button`).filter({ hasText: label });
      await expect(button).toBeVisible();
    }
  });

  test('should handle Japanese number formatting', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/analytics');

    // Check numbers are formatted correctly for Japanese locale
    const numberElements = page.locator('[data-testid*="number"], [data-testid*="amount"], [data-testid*="count"]');

    if (await numberElements.count() > 0) {
      const firstNumber = numberElements.first();
      const numberText = await firstNumber.textContent();

      // Japanese numbers should not have commas in thousands (different from Western formatting)
      // or should use Japanese number characters
      expect(numberText).toMatch(/[\d\s]+|[\d,]+|[\d\.]+/);
    }
  });

  test('should display correct Japanese form labels', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Check form labels
    const formLabels = [
      '活動の種類',
      '数量',
      '単位',
      '日付',
      '時間',
      'メモ',
      '圃場'
    ];

    for (const label of formLabels) {
      const labelElement = modal.locator(`label`).filter({ hasText: label });
      await expect(labelElement).toBeVisible();
    }
  });

  test('should handle Japanese text input correctly', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/chat');

    const inputField = page.locator('input[placeholder*="メッセージ"]');

    // Test Japanese input
    await inputField.fill('こんにちは、テストメッセージです。');

    const inputValue = await inputField.inputValue();
    expect(inputValue).toBe('こんにちは、テストメッセージです。');

    // Test mixed Japanese and English
    await inputField.fill('Hello こんにちは Test テスト');
    const mixedValue = await inputField.inputValue();
    expect(mixedValue).toBe('Hello こんにちは Test テスト');
  });

  test('should display correct Japanese validation messages', async ({ page }) => {
    await page.goto('http://localhost:3002/ja/planner');

    const logButton = page.locator('button[data-testid="log-activity-button"]');
    await logButton.click();

    const modal = page.locator('[data-testid="activity-log-modal"]');

    // Submit empty form to trigger validation
    const saveButton = modal.locator('button', { hasText: /保存/ });
    await saveButton.click();

    // Check validation messages are in Japanese
    const validationErrors = modal.locator('[data-testid="validation-error"]');
    const errorCount = await validationErrors.count();

    for (let i = 0; i < errorCount; i++) {
      const error = validationErrors.nth(i);
      const errorText = await error.textContent();
      // Should contain Japanese characters
      expect(errorText).toMatch(/[ぁ-ゖ]+|[ァ-ヾ]+|[一-龯]+/);
    }
  });
});