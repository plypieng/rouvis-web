'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    CloudSun,
    Leaf,
    MapPinned,
    MessageSquareQuote,
    PlayCircle,
    ShieldCheck,
    Sprout,
    Tractor,
} from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import { Logo } from './Logo';
import { useTranslations } from 'next-intl';

interface LandingPageProps {
    locale: string;
}

const notoSansJp = Noto_Sans_JP({
    subsets: ['latin'],
    weight: ['400', '500', '700', '900'],
    display: 'swap',
});

const notoSerifJp = Noto_Serif_JP({
    subsets: ['latin'],
    weight: ['600', '700'],
    display: 'swap',
});

export default function LandingPage({ locale }: LandingPageProps) {
    const t = useTranslations('landing');
    const searchParams = useSearchParams();
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const isClosedBeta = true;

    const handleStartDemo = useCallback(async () => {
        setIsDemoLoading(true);
        try {
            let deviceId = localStorage.getItem('rouvis_demo_device_id');
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem('rouvis_demo_device_id', deviceId);
            }

            const result = await signIn('demo-device', {
                deviceId,
                callbackUrl: `/${locale}/onboarding`,
                redirect: true,
            });

            if (result?.error) {
                console.error('Demo login failed:', result.error);
                setIsDemoLoading(false);
            }
        } catch (error) {
            console.error('Demo error:', error);
            setIsDemoLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        if (searchParams.get('demo') === 'true' && demoModeEnabled) {
            void handleStartDemo();
        }
    }, [searchParams, demoModeEnabled, handleStartDemo]);

    const painPoints = [
        {
            key: 'weather',
            icon: CloudSun,
            tone: 'from-sky-100 to-white text-sky-600',
            border: 'border-sky-200',
        },
        {
            key: 'labor',
            icon: Tractor,
            tone: 'from-amber-100 to-white text-amber-700',
            border: 'border-amber-200',
        },
        {
            key: 'records',
            icon: ClipboardList,
            tone: 'from-emerald-100 to-white text-emerald-700',
            border: 'border-emerald-200',
        },
    ];

    const valueFeatures = [
        {
            key: 'daily_brief',
            icon: CalendarDays,
            tone: 'bg-[#f5f0e8] text-[#6d4c32]',
        },
        {
            key: 'field_ai',
            icon: Sprout,
            tone: 'bg-[#e9f4ea] text-[#1d7a41]',
        },
        {
            key: 'weather_risk',
            icon: CloudSun,
            tone: 'bg-[#e9f1fb] text-[#245e9e]',
        },
        {
            key: 'traceability',
            icon: ShieldCheck,
            tone: 'bg-[#f4efe8] text-[#7a5f2f]',
        },
    ];

    const workflowSteps = [
        { key: 'capture', icon: ClipboardList },
        { key: 'suggest', icon: Leaf },
        { key: 'execute', icon: CheckCircle2 },
    ];

    const faqItems = ['setup', 'pricing', 'support'] as const;

    return (
        <div className={`${notoSansJp.className} min-h-screen overflow-x-hidden bg-[#f6f3ec] text-slate-900`}>
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#e8f0e4] via-[#edf3eb] to-transparent" />
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#d6ead5]/70 blur-3xl" />
                <div className="absolute top-12 right-0 h-80 w-80 rounded-full bg-[#d8e8f8]/60 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#f2e6d4]/70 blur-3xl" />
            </div>

            <header className="sticky top-0 z-30 border-b border-[#d9d4c9] bg-[#f6f3ec]/95 backdrop-blur">
                <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Logo className="h-9 w-auto" />
                        <span className="hidden text-xs font-medium tracking-[0.2em] text-slate-500 md:block">
                            {t('hero.header_tag')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href={`/${locale}/login`}
                            className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:text-slate-900"
                        >
                            {t('hero.cta_login')}
                        </Link>
                        <Link
                            href={`/${locale}/signup`}
                            className="inline-flex min-h-[44px] items-center rounded-full bg-[#1a7c44] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#136236] sm:px-6"
                        >
                            {isClosedBeta ? t('hero.cta_beta') : t('hero.cta_start')}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative z-10">
                <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:pt-16">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#bfd4be] bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#1a7c44]">
                            <MapPinned className="h-3.5 w-3.5" />
                            <span>{t('hero.eyebrow')}</span>
                        </div>

                        <h1 className={`${notoSerifJp.className} text-balance text-4xl font-semibold leading-[1.2] text-[#16202a] sm:text-5xl lg:text-[3.35rem]`}>
                            {t('hero.title')}
                            <span className="mt-2 block text-[#1c7c44]">{t('hero.title_accent')}</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                            {t('hero.subtitle')}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2.5">
                            <span className="rounded-full border border-[#c3d7c2] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                {t('hero.chip_1')}
                            </span>
                            <span className="rounded-full border border-[#c8d6e8] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                {t('hero.chip_2')}
                            </span>
                            <span className="rounded-full border border-[#dfd4c3] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                {t('hero.chip_3')}
                            </span>
                        </div>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={`/${locale}/signup`}
                                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#1a7c44] px-7 py-3 text-base font-semibold text-white shadow-lg shadow-[#1a7c44]/20 transition hover:-translate-y-0.5 hover:bg-[#136236]"
                            >
                                {isClosedBeta ? t('hero.cta_beta') : t('hero.cta_start')}
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            {demoModeEnabled ? (
                                <button
                                    onClick={() => {
                                        void handleStartDemo();
                                    }}
                                    disabled={isDemoLoading}
                                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#cfd8e4] bg-white px-7 py-3 text-base font-semibold text-slate-700 transition hover:border-[#9ebbe0] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isDemoLoading ? (
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                                    ) : (
                                        <>
                                            <PlayCircle className="h-5 w-5" />
                                            <span>{t('hero.cta_demo')}</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={`/${locale}/login`}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#cfd8e4] bg-white px-7 py-3 text-base font-semibold text-slate-700 transition hover:border-[#9ebbe0] hover:text-slate-900"
                                >
                                    {t('hero.cta_login')}
                                </Link>
                            )}
                        </div>

                        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-[#d7e6d5] bg-white/90 p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{t('trust.stat_1_label')}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{t('trust.stat_1')}</p>
                            </div>
                            <div className="rounded-2xl border border-[#d8e3f3] bg-white/90 p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{t('trust.stat_2_label')}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{t('trust.stat_2')}</p>
                            </div>
                            <div className="rounded-2xl border border-[#e4dccf] bg-white/90 p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{t('trust.stat_3_label')}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{t('trust.stat_3')}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                        className="relative"
                    >
                        <div className="relative overflow-hidden rounded-[28px] border border-[#d5d2c8] bg-white p-3 shadow-2xl shadow-slate-300/30">
                            <div className="relative overflow-hidden rounded-2xl border border-slate-100">
                                <Image
                                    src="/landing-hero.png"
                                    alt={t('hero.image_alt')}
                                    width={1200}
                                    height={900}
                                    className="h-auto w-full object-cover"
                                    priority
                                />
                            </div>

                            <div className="absolute left-5 top-5 rounded-xl border border-[#dce9db] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                                <p className="text-[11px] font-medium text-slate-500">{t('hero.overlay.weather_label')}</p>
                                <p className="text-sm font-semibold text-slate-800">{t('hero.overlay.weather_value')}</p>
                            </div>

                            <div className="absolute bottom-5 right-5 max-w-[220px] rounded-xl border border-[#d8e3f3] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                                <p className="text-[11px] font-medium text-slate-500">{t('hero.overlay.task_label')}</p>
                                <p className="text-sm font-semibold text-slate-800">{t('hero.overlay.task_value')}</p>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section className="border-y border-[#dfdacd] bg-[#f9f6ef]/70 py-16 sm:py-20">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            <h2 className={`${notoSerifJp.className} text-2xl font-semibold text-slate-900 sm:text-3xl`}>
                                {t('pain_points.title')}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                                {t('pain_points.subtitle')}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {painPoints.map((point, index) => {
                                const Icon = point.icon;
                                return (
                                    <motion.article
                                        key={point.key}
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: '-80px' }}
                                        transition={{ duration: 0.35, delay: index * 0.08 }}
                                        className={`rounded-2xl border bg-white p-5 shadow-sm ${point.border}`}
                                    >
                                        <div className={`inline-flex rounded-xl bg-gradient-to-br p-3 ${point.tone}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`pain_points.${point.key}.title`)}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(`pain_points.${point.key}.problem`)}</p>
                                        <div className="mt-4 rounded-xl border border-[#e4e0d6] bg-[#f9f8f4] p-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1c7c44]">
                                                {t('pain_points.solution_label')}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-700">{t(`pain_points.${point.key}.solution`)}</p>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="py-16 sm:py-20">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            <h2 className={`${notoSerifJp.className} text-2xl font-semibold text-slate-900 sm:text-3xl`}>
                                {t('value_section.title')}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                                {t('value_section.subtitle')}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {valueFeatures.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.article
                                        key={feature.key}
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: '-80px' }}
                                        transition={{ duration: 0.35, delay: index * 0.08 }}
                                        className="group rounded-2xl border border-[#ded8cc] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                    >
                                        <div className={`inline-flex rounded-xl p-3 ${feature.tone}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`value_section.features.${feature.key}.title`)}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            {t(`value_section.features.${feature.key}.desc`)}
                                        </p>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="border-y border-[#dfdacd] bg-[#f9f6ef]/70 py-16 sm:py-20">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            <h2 className={`${notoSerifJp.className} text-2xl font-semibold text-slate-900 sm:text-3xl`}>
                                {t('workflow.title')}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                                {t('workflow.subtitle')}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {workflowSteps.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <motion.article
                                        key={step.key}
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: '-80px' }}
                                        transition={{ duration: 0.35, delay: index * 0.08 }}
                                        className="rounded-2xl border border-[#ddd7cc] bg-white p-5 shadow-sm"
                                    >
                                        <p className="text-xs font-semibold tracking-[0.14em] text-[#1c7c44]">0{index + 1}</p>
                                        <div className="mt-3 inline-flex rounded-xl bg-[#edf4eb] p-3 text-[#1c7c44]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`workflow.steps.${step.key}.title`)}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(`workflow.steps.${step.key}.desc`)}</p>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="py-16 sm:py-20">
                    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
                        <motion.article
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.4 }}
                            className="rounded-2xl border border-[#d9d3c7] bg-white p-6 shadow-sm"
                        >
                            <div className="inline-flex rounded-xl bg-[#eef4eb] p-3 text-[#1d7a41]">
                                <MessageSquareQuote className="h-5 w-5" />
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-slate-900">{t('testimonial.title')}</h2>
                            <p className="mt-3 text-base leading-relaxed text-slate-700">{t('testimonial.quote')}</p>
                            <p className="mt-4 text-sm font-medium text-slate-500">{t('testimonial.author')}</p>
                        </motion.article>

                        <motion.article
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.4, delay: 0.08 }}
                            className="rounded-2xl border border-[#d9d3c7] bg-white p-6 shadow-sm"
                        >
                            <h2 className="text-xl font-bold text-slate-900">{t('faq.title')}</h2>
                            <div className="mt-5 space-y-4">
                                {faqItems.map((item) => (
                                    <div key={item} className="rounded-xl border border-[#e4dfd4] bg-[#faf8f3] p-4">
                                        <p className="text-sm font-semibold text-slate-900">{t(`faq.items.${item}.q`)}</p>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(`faq.items.${item}.a`)}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.article>
                    </div>
                </section>

                <section className="pb-20">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.4 }}
                            className="rounded-[30px] border border-[#2d7448] bg-gradient-to-r from-[#1c7c44] via-[#2b8d58] to-[#2f7d8f] px-6 py-10 text-white shadow-xl sm:px-10"
                        >
                            <h2 className={`${notoSerifJp.className} text-2xl leading-snug sm:text-3xl`}>
                                {t('cta.title')}
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                                {t('cta.subtitle')}
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href={`/${locale}/signup`}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-[#1b7b44] transition hover:bg-[#eaf5ed]"
                                >
                                    {isClosedBeta ? t('hero.cta_beta') : t('cta.primary')}
                                </Link>
                                <Link
                                    href={`/${locale}/login`}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/70 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                                >
                                    {t('cta.secondary')}
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            <footer className="relative z-10 border-t border-[#ddd8cc] bg-[#f6f3ec] py-10">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
                    <p>{t('footer.copyright')}</p>
                    <div className="flex items-center gap-5">
                        <Link href={`/${locale}/privacy`} className="transition hover:text-slate-700">
                            {t('footer.privacy')}
                        </Link>
                        <Link href={`/${locale}/terms`} className="transition hover:text-slate-700">
                            {t('footer.terms')}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
