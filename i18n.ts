import { getRequestConfig } from 'next-intl/server';


export const locales = ['ja', 'en'];
export const defaultLocale = 'ja';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  let locale = await requestLocale;

  // If no locale is provided, or it's invalid, use default or handle accordingly
  // Usually middleware ensures a valid locale is present.
  if (!locale || !locales.includes(locale)) {
    // If strict validation is needed:
    // notFound();
    // For robustness, fallback to default:
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./i18n/locales/${locale}/common.json`)).default
  };
});
