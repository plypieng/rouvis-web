'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { use } from 'react';
import { Mail } from 'lucide-react';

export default function SignupPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const locale = params.locale;
    const t = useTranslations('pages.auth.signup');

    return (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8" />
                </div>

                <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                    {t('title')}
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    Currently, Rouvis is in a closed test phase. We are accepting new farmers on a rolling basis to ensure the best experience.
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Contact us for access
                    </p>
                    <a href="mailto:support@rouvis.jp" className="text-2xl font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                        support@rouvis.jp
                    </a>
                </div>

                <div className="text-sm text-gray-500">
                    <Link href={`/${locale}/login`} className="text-emerald-600 hover:text-emerald-500 font-medium hover:underline">
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
