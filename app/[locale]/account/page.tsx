'use client';

import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function AccountPage() {
    const t = useTranslations('pages.account');
    const { data: session } = useSession();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleExport = () => {
        alert('Data export started. You will receive an email when it is ready.');
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            setIsDeleting(true);
            setTimeout(() => {
                setIsDeleting(false);
                alert('Account deletion request submitted.');
            }, 1000);
        }
    };

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
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Export Personal Data</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Download a copy of your data.</p>
                        </div>
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
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
                            <p className="text-sm text-red-600/80 dark:text-red-400/80">Permanently delete your account and all data.</p>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
