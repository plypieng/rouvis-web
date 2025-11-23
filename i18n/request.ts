import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '../i18n';

export default getRequestConfig(async ({ locale }) => {
  // Ensure we're using a valid locale
  const safeLocale = locale && locales.includes(locale) ? locale : defaultLocale;

  // Load the messages for the locale
  const messages = (await import(`./locales/${safeLocale}/common.json`)).default;

  return {
    locale: safeLocale,
    messages,
    // You can also add other options like timeZone if needed
    // timeZone: 'Asia/Tokyo',
  };
});
