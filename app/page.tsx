import { redirect } from 'next/navigation';
import { i18nConfig } from '../i18n/config';

export default function RootPage() {
  // Redirect to the default locale
  redirect(`/${i18nConfig.defaultLocale}`);
}
