'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf, Calendar, TrendingUp, PlayCircle, Star, Users, MapPin, Database } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from './Logo';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface LandingPageProps {
    locale: string;
}

export default function LandingPage({ locale }: LandingPageProps) {
    const t = useTranslations('landing');
    const searchParams = useSearchParams();
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    // Auto-start demo if ?demo=true is present
    useEffect(() => {
        if (searchParams.get('demo') === 'true' && demoModeEnabled) {
            handleStartDemo();
        }
    }, [searchParams]);

    const handleStartDemo = async () => {
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
    };

    const features = [
        {
            key: 'ai_advisor',
            icon: <Leaf className="w-8 h-8 text-green-600" />,
            color: 'bg-green-100 dark:bg-green-900/40',
            cols: 'md:col-span-2',
        },
        {
            key: 'precision_calendar',
            icon: <Calendar className="w-8 h-8 text-amber-500" />,
            color: 'bg-amber-100 dark:bg-amber-900/40',
            cols: 'md:col-span-1',
        },
        {
            key: 'field_monitoring',
            icon: <MapPin className="w-8 h-8 text-blue-500" />,
            color: 'bg-blue-100 dark:bg-blue-900/40',
            cols: 'md:col-span-3',
        },
    ];

    return (
        <div className="min-h-screen bg-earth-gradient text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-green-200 dark:selection:bg-green-900">

            {/* --- Navigation --- */}
            <header className="fixed top-0 w-full z-50 transition-all duration-300">
                {/* Glassmorphism Panel */}
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm"></div>

                <div className="container mx-auto px-6 md:px-12 h-20 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <Logo className="h-10 w-auto text-green-700 dark:text-green-500 transition-transform group-hover:scale-105" />
                        <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white hidden sm:block">ROUVIS</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link
                            href={`/${locale}/login`}
                            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 transition-colors px-4 py-2"
                        >
                            {t('hero.cta_login')}
                        </Link>
                        <Link
                            href={`/${locale}/signup`}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-all transform hover:scale-105 shadow-xl shadow-green-900/5"
                        >
                            {t('hero.cta_start')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-grow pt-16">
                <section className="relative overflow-hidden pt-4 pb-20 lg:pt-8 lg:pb-32">
                    <div className="absolute inset-0 z-0">
                        {/* Elegant background gradients */}
                        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent pointer-events-none" />
                        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-3xl pointer-events-none" />
                        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-green-100/40 dark:bg-green-900/10 blur-3xl pointer-events-none" />

                        {/* Subtle grid pattern */}
                        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.03 }}></div>
                    </div>

                    <div className="container mx-auto px-6 md:px-12 xl:px-24 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-left"
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100/50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-6">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>The Future of Farming</span>
                                </div>

                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white leading-[1.1]">
                                    <span className="block">{t('hero.title')}</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                                    {t('hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-start gap-4">
                                    {demoModeEnabled ? (
                                        <button
                                            onClick={handleStartDemo}
                                            disabled={isDemoLoading}
                                            className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isDemoLoading ? (
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <PlayCircle className="w-5 h-5" />
                                                    <span>Start Demo</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <Link
                                            href={`/${locale}/signup`}
                                            className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
                                        >
                                            {t('hero.cta_start')}
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    )}

                                    <Link
                                        href={`/${locale}/login`}
                                        className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 text-slate-900 dark:text-white font-bold rounded-full transition-all flex items-center justify-center"
                                    >
                                        {t('hero.cta_login')}
                                    </Link>
                                </div>

                                {/* Verified Badge Stick */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.8 }}
                                    className="mt-8 flex items-center gap-6 text-slate-500 text-sm font-medium flex-wrap"
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>{t('trust.stat_1')}</span>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{t('trust.stat_2')}</span>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        <span>{t('trust.stat_3')}</span>
                                    </div>
                                </motion.div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="relative hidden lg:block"
                            >
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <img
                                        src="/landing-hero.png"
                                        alt="App Screenshot"
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                                {/* Decorative elements behind image */}
                                <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-blue-500/10 rounded-3xl blur-2xl"></div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
                    <div className="container mx-auto px-6 md:px-12 xl:px-24">
                        <div className="grid md:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={feature.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    className={`group relative overflow-hidden bg-white dark:bg-slate-900/50 p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-7px_rgba(6,81,237,0.1)] border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:-translate-y-1 ${feature.key === 'market_insights' ? 'md:col-span-3' : feature.key === 'ai_advisor' ? 'md:col-span-2' : ''}`}
                                >
                                    <div className={`absolute top-0 right-0 p-8 opacity-5 pointer-events-none transform group-hover:scale-150 transition-transform duration-700`}>
                                        {/* Big Background Icon Effect */}
                                        {React.cloneElement(feature.icon as React.ReactElement<{ className?: string }>, { className: "w-40 h-40" })}
                                    </div>

                                    <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-green-600 transition-colors">{t(`features.${feature.key}.title`)}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed z-10 relative">
                                        {t(`features.${feature.key}.desc`)}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

            </main>

            {/* --- Simple Footer --- */}
            <footer className="py-12 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-6 text-center">
                    <Logo className="h-8 w-auto mx-auto mb-6 opacity-50 grayscale hover:grayscale-0 transition-all font-mono" />
                    <p className="text-slate-500 text-sm mb-4">{t('footer.copyright')}</p>
                    <div className="flex justify-center gap-6 text-sm text-slate-400">
                        <span className="hover:text-slate-600 cursor-pointer transition-colors">{t('footer.privacy')}</span>
                        <span className="hover:text-slate-600 cursor-pointer transition-colors">{t('footer.terms')}</span>
                    </div>
                </div>
            </footer>

        </div>
    );
}
