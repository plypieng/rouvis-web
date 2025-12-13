'use client';

import { useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
    const t = useTranslations('pages.profile');
    const { data: session, status } = useSession();
    const params = useParams<{ locale: string }>();
    const locale = (params?.locale as string) || 'ja';
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/login`);
        }
    }, [status, router, locale]);

    if (status === 'loading') {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    const { user } = session;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('title')}</h1>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="bg-emerald-600 h-32 w-full relative">
                    <div className="absolute -bottom-12 left-6">
                        {user.image ? (
                            <Image
                                src={user.image}
                                alt={user.name || 'User'}
                                width={96}
                                height={96}
                                className="rounded-full border-4 border-white dark:border-gray-800 bg-white"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-emerald-200 flex items-center justify-center text-3xl font-bold text-emerald-700">
                                {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-16 pb-6 px-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name || t('no_name')}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('account_settings')}</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{t('email_notifications')}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('email_notifications_desc')}</p>
                                </div>
                                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-emerald-200">
                                    <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-all duration-200"></span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                {t('sign_out')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
