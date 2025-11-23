export const i18nConfig = {
  locales: ['ja', 'en'], // Japanese first for Niigata farmers
  defaultLocale: 'ja',
  localeDetection: true,
};

export type Locale = (typeof i18nConfig.locales)[number];
