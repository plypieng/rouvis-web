'use client';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import MemoryVault from '../../../components/MemoryVault';
import { useState, useEffect, useCallback, use } from 'react';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';
import { resolveFarmerUiMode } from '@/lib/farmerUiMode';

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('pages.settings');
    const [theme, setTheme] = useState<ThemeMode>('system');
    const [emailNotif, setEmailNotif] = useState(true);
    const [weeklyReport, setWeeklyReport] = useState(false);
    const [farmerMode, setFarmerMode] = useState<FarmerUiMode>('new_farmer');
    const [farmerModeLoading, setFarmerModeLoading] = useState(true);
    const [farmerModeSaving, setFarmerModeSaving] = useState(false);
    const [farmerModeError, setFarmerModeError] = useState<string | null>(null);

    const fetchFarmerMode = useCallback(async () => {
        setFarmerModeLoading(true);
        setFarmerModeError(null);
        try {
            const res = await fetch('/api/v1/profile', { cache: 'no-store' });
            if (res.status === 404) {
                setFarmerMode('new_farmer');
                return;
            }
            if (!res.ok) {
                throw new Error(t('farmer_mode_load_error'));
            }

            const payload = await res.json();
            const profile = payload?.profile;
            const resolvedMode = payload?.resolvedUiMode
                || resolveFarmerUiMode(profile?.uiMode, profile?.experienceLevel);
            setFarmerMode(resolvedMode);
        } catch (error) {
            console.error('Failed to fetch farmer mode', error);
            setFarmerModeError(t('farmer_mode_load_error'));
        } finally {
            setFarmerModeLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const saved = (localStorage.getItem('theme') as ThemeMode) || 'system';
        setTheme(saved);
        void fetchFarmerMode();
    }, [fetchFarmerMode]);

    const saveFarmerMode = useCallback(async (nextMode: FarmerUiMode) => {
        if (farmerModeSaving || farmerMode === nextMode) return;

        const previousMode = farmerMode;
        setFarmerMode(nextMode);
        setFarmerModeSaving(true);
        setFarmerModeError(null);

        try {
            const res = await fetch('/api/v1/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uiMode: nextMode }),
            });

            if (!res.ok) {
                throw new Error(t('farmer_mode_save_error'));
            }

            const payload = await res.json();
            const profile = payload?.profile;
            const resolvedMode = payload?.resolvedUiMode
                || resolveFarmerUiMode(profile?.uiMode, profile?.experienceLevel);
            setFarmerMode(resolvedMode);
        } catch (error) {
            console.error('Failed to save farmer mode', error);
            setFarmerMode(previousMode);
            setFarmerModeError(t('farmer_mode_save_error'));
        } finally {
            setFarmerModeSaving(false);
        }
    }, [farmerMode, farmerModeSaving, t]);

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

                {/* Farmer Mode Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">tune</span>
                        {t('farmer_mode_section')}
                    </h2>
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('farmer_mode_desc')}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            data-testid="settings-farmer-mode-new"
                            onClick={() => {
                                void saveFarmerMode('new_farmer');
                            }}
                            disabled={farmerModeSaving || farmerModeLoading}
                            className={`rounded-xl border px-4 py-3 text-left transition ${farmerMode === 'new_farmer'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-100'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                                } disabled:opacity-60`}
                        >
                            <p className="text-sm font-semibold">{t('farmer_mode_new_title')}</p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{t('farmer_mode_new_desc')}</p>
                        </button>
                        <button
                            type="button"
                            data-testid="settings-farmer-mode-veteran"
                            onClick={() => {
                                void saveFarmerMode('veteran_farmer');
                            }}
                            disabled={farmerModeSaving || farmerModeLoading}
                            className={`rounded-xl border px-4 py-3 text-left transition ${farmerMode === 'veteran_farmer'
                                    ? 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-900/20 dark:text-sky-100'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                                } disabled:opacity-60`}
                        >
                            <p className="text-sm font-semibold">{t('farmer_mode_veteran_title')}</p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{t('farmer_mode_veteran_desc')}</p>
                        </button>
                    </div>
                    <div className="mt-3 min-h-[20px] text-xs text-gray-500 dark:text-gray-400">
                        {farmerModeLoading
                            ? t('farmer_mode_loading')
                            : farmerModeSaving
                                ? t('farmer_mode_saving')
                                : farmerModeError
                                    ? (
                                        <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-300">
                                            <span>{farmerModeError}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void fetchFarmerMode();
                                                }}
                                                className="underline"
                                            >
                                                {t('retry')}
                                            </button>
                                        </span>
                                    )
                                    : t('farmer_mode_saved')}
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

                {/* Farmer DNA Vault */}
                <MemoryVault />
            </div>
        </div>
    );
}
