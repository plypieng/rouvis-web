'use client';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = useTranslations('pages.settings');
    const [theme, setTheme] = useState<ThemeMode>('system');
    const [emailNotif, setEmailNotif] = useState(true);
    const [weeklyReport, setWeeklyReport] = useState(false);

    useEffect(() => {
        const saved = (localStorage.getItem('theme') as ThemeMode) || 'system';
        setTheme(saved);
    }, []);

    const handleThemeChange = (mode: ThemeMode) => {
        setTheme(mode);
        localStorage.setItem('theme', mode);

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldDark = mode === 'dark' || (mode === 'system' && prefersDark);
        document.documentElement.classList.toggle('dark', shouldDark);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{t('desc')}</p>

            <div className="space-y-6">
                {/* Language Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">language</span>
                        {t('language_section')}
                    </h2>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{t('select_language')}</span>
                        <LanguageSwitcher locale={locale} />
                    </div>
                </div>

                {/* Theme Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">palette</span>
                        {t('theme_section')}
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {(['light', 'dark', 'system'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleThemeChange(mode)}
                                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${theme === mode
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <span className="material-symbols-outlined mb-2 text-gray-700 dark:text-gray-300">
                                    {mode === 'light' ? 'light_mode' : mode === 'dark' ? 'dark_mode' : 'settings_brightness'}
                                </span>
                                <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                                    {t(`theme_${mode}`)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">notifications</span>
                        {t('notifications_section')}
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t('email_alerts')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('email_alerts_desc')}</p>
                            </div>
                            <button
                                onClick={() => setEmailNotif(!emailNotif)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${emailNotif ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotif ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t('weekly_report')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('weekly_report_desc')}</p>
                            </div>
                            <button
                                onClick={() => setWeeklyReport(!weeklyReport)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${weeklyReport ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${weeklyReport ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
