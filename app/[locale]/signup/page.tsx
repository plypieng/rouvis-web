'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { use } from 'react';

export default function SignupPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const locale = params.locale;
    const t = useTranslations('pages.auth.signup');

    return (
        <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <h1 className="text-2xl font-bold mb-6 text-center">{t('title')}</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <button className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                        {t('cta')}
                    </button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <Link href={`/${locale}/login`} className="text-emerald-600 hover:text-emerald-500">
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
