'use client';

import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lock, Download, Trash2, Clock3 } from 'lucide-react';

export default function AccountPage() {
    const t = useTranslations('pages.account');
    const { data: session } = useSession();
    const params = useParams<{ locale: string }>();
    const locale = params?.locale || 'ja';

    if (!session?.user) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your account details and data.</p>

            <div className="space-y-6">
                {/* Profile Summary */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Profile Information</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                {session.user.id}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.name}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.email}</div>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Data Management</h2>
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-sm">
                            Data export and account deletion workflows are not available yet.
                            We will enable these once compliance processing is ready.
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Export Personal Data</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Download a copy of your data (coming soon).</p>
                        </div>
                        <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4" />
                            Export Data
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-red-700 dark:text-red-400">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-400">Delete Account</p>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                Permanently delete your account and all data (currently unavailable).
                            </p>
                        </div>
                        <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                        </button>
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <p>
                        Need urgent account assistance? Contact support from chat and include your user ID.
                        <Link href={`/${locale}/chat`} className="ml-1 text-emerald-700 underline underline-offset-2">
                            Open chat
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
