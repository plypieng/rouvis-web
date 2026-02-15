'use client';

import Link from 'next/link';
import { use } from 'react';
import { Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TrackedEventLink from '@/components/TrackedEventLink';
import { trackUXEvent } from '@/lib/analytics';

type WaitlistSource = 'landing' | 'admission_denied' | 'other';

function normalizeWaitlistSource(raw: string | null): WaitlistSource {
    if (typeof raw !== 'string') return 'other';
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return 'other';
    if (normalized.includes('admission_denied')) return 'admission_denied';
    if (normalized.includes('landing')) return 'landing';
    return 'other';
}

export default function SignupPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const locale = params.locale;
    const t = useTranslations('auth.waitlist');
    const searchParams = useSearchParams();
    const source = normalizeWaitlistSource(searchParams.get('source'));
    const sourceHint = source === 'admission_denied'
        ? t('source.admissionDenied')
        : source === 'landing'
            ? t('source.landing')
            : null;

    return (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-10 text-center">
                <Link href={`/${locale}`} className="inline-block hover:opacity-80 transition-opacity">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-8 h-8" />
                    </div>
                </Link>

                <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                    {t('title')}
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    {t('subtitle')}
                </p>

                {sourceHint ? (
                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        {sourceHint}
                    </div>
                ) : null}

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        {t('contactLabel')}
                    </p>
                    <a
                        href="mailto:support@rouvis.jp"
                        onClick={() => {
                            void trackUXEvent('waitlist_email_clicked', {
                                source,
                            });
                        }}
                        className="text-2xl font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                    >
                        support@rouvis.jp
                    </a>
                </div>

                <div className="text-sm text-gray-500">
                    <p className="mb-2">{t('alreadyInvited')}</p>
                    <TrackedEventLink
                        href={`/${locale}/login?intent=sign_in&source=waitlist_page`}
                        eventName="waitlist_sign_in_clicked"
                        eventProperties={{ source }}
                        className="text-emerald-600 hover:text-emerald-500 font-medium hover:underline"
                    >
                        {t('signInCta')}
                    </TrackedEventLink>
                </div>
            </div>
        </div>
    );
}
