export type QuickActionTargets = {
  logActivity: string;
  askQuestion: string;
  takePhoto: string;
  weekPlan: string;
  voiceInput: string;
};

function localizedPrompt(locale: string, ja: string, en: string): string {
  return locale === 'ja' ? ja : en;
}

function buildChatHref(
  locale: string,
  params: Record<string, string>,
): string {
  const query = new URLSearchParams(params);
  return `/${locale}/chat?${query.toString()}`;
}

export function buildQuickActionTargets(locale: string): QuickActionTargets {
  const normalizedLocale = locale || 'ja';

  return {
    logActivity: `/${normalizedLocale}/records?action=log&source=quick-action`,
    askQuestion: buildChatHref(normalizedLocale, {
      intent: 'today',
      mode: 'default',
      fresh: '1',
      prompt: localizedPrompt(
        normalizedLocale,
        '今日の作業で優先すべきことを、天気と未完了タスクを踏まえて教えてください。',
        'What should I prioritize today based on weather and unfinished tasks?',
      ),
    }),
    takePhoto: buildChatHref(normalizedLocale, {
      intent: 'project',
      mode: 'diagnosis',
      fresh: '1',
      prompt: localizedPrompt(
        normalizedLocale,
        '作物の写真を確認して、病害虫や生育リスクを診断してください。',
        'Inspect a crop photo and diagnose disease, pest, or growth risks.',
      ),
    }),
    weekPlan: `/${normalizedLocale}/calendar?view=week&source=quick-action`,
    voiceInput: `/${normalizedLocale}/records?action=voice&source=quick-action`,
  };
}
