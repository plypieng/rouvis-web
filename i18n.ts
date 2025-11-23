import { notFound } from 'next/navigation';
 
export const locales = ['ja', 'en'];
export const defaultLocale = 'ja';
 
// This is the default messages loader used for server components
export default async function getMessages(locale: string) {
  // Make sure that the locale is one of the supported locales
  if (!locales.includes(locale)) {
    notFound();
  }

  try {
    // Alternatively, you can also use i18n/locales path if your app is set up to use it
    return (await import(`./i18n/locales/${locale}/common.json`)).default;
  } catch (error) {
    // If there's an error loading the messages for a specific locale, fallback to default locale
    if (locale !== defaultLocale) {
      console.warn(`Could not load messages for locale ${locale}, falling back to ${defaultLocale}`);
      return (await import(`./i18n/locales/${defaultLocale}/common.json`)).default;
    }
    throw error;
  }
}
