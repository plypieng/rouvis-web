'use client';

import { useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const t = useTranslations('pages.profile');
    const { data: session, status } = useSession();
    const params = useParams<{ locale: string }>();
    const locale = (params?.locale as string) || 'ja';
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        displayName: '',
        region: '',
        farmingType: 'conventional',
        experienceLevel: 'intermediate',
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/login`);
        } else if (status === 'authenticated') {
            fetchProfile();
        }
    }, [status, router, locale]);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/v1/profile');
            if (res.ok) {
                const data = await res.json();
                const profileData = data?.profile ?? data;
                setProfile(profileData);
                setFormData({
                    displayName: profileData?.displayName || '',
                    region: profileData?.region || '',
                    farmingType: profileData?.farmingType || 'conventional',
                    experienceLevel: profileData?.experienceLevel || 'intermediate',
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/v1/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated?.profile ?? updated);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to save profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading' || isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!session?.user) return null;

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
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.displayName || user.name || t('no_name')}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-md hover:bg-emerald-50"
                            >
                                {t('edit_profile')}
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('display_name')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('region')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('farming_type')}
                                    </label>
                                    <select
                                        value={formData.farmingType}
                                        onChange={(e) => setFormData({ ...formData, farmingType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="conventional">{t('types.conventional')}</option>
                                        <option value="organic">{t('types.organic')}</option>
                                        <option value="natural">{t('types.natural')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('experience_level')}
                                    </label>
                                    <select
                                        value={formData.experienceLevel}
                                        onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="beginner">{t('levels.beginner')}</option>
                                        <option value="intermediate">{t('levels.intermediate')}</option>
                                        <option value="expert">{t('levels.expert')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                                >
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('region')}</p>
                                <p className="mt-1 text-lg text-gray-900 dark:text-white">{profile?.region || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('farming_type')}</p>
                                <p className="mt-1 text-lg text-gray-900 dark:text-white">
                                    {profile?.farmingType ? t(`types.${profile.farmingType}`) : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('experience_level')}</p>
                                <p className="mt-1 text-lg text-gray-900 dark:text-white">
                                    {profile?.experienceLevel ? t(`levels.${profile.experienceLevel}`) : '-'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
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
