'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sprout, BookOpen, Calendar, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useTranslations } from 'next-intl';

interface LandingPageProps {
    locale: string;
}

export default function LandingPage({ locale }: LandingPageProps) {
    const t = useTranslations('landing');
    const tCommon = useTranslations('common');

    const features = [
        {
            key: 'chat',
            icon: <MessageCircle className="w-8 h-8 text-green-500" />,
            color: 'bg-green-100 dark:bg-green-900/30',
        },
        {
            key: 'scheduling',
            icon: <Calendar className="w-8 h-8 text-blue-500" />,
            color: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            key: 'learning',
            icon: <BookOpen className="w-8 h-8 text-amber-500" />,
            color: 'bg-amber-100 dark:bg-amber-900/30',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-green-100 dark:selection:bg-green-900">
            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-6 md:px-12 xl:px-24 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Logo className="h-36 w-auto drop-shadow-md" />
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link
                            href={`/${locale}/login`}
                            className="text-sm font-medium hover:text-green-600 transition-colors"
                        >
                            {t('hero.cta_login')}
                        </Link>
                        <Link
                            href={`/${locale}/signup`}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full transition-colors"
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
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                                    <span className="block">{t('hero.title')}</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                                    {t('hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-start gap-4">
                                    <Link
                                        href={`/${locale}/login`}
                                        className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 text-slate-900 dark:text-white font-bold rounded-full transition-all flex items-center justify-center"
                                    >
                                        {t('hero.cta_login')}
                                    </Link>
                                    <Link
                                        href={`/${locale}/auth/signup`}
                                        className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
                                    >
                                        {t('hero.cta_start')}
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
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
                                    className="group bg-white dark:bg-slate-900/50 p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-7px_rgba(6,81,237,0.1)] border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-green-600 transition-colors">{t(`features.${feature.key}.title`)}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {t(`features.${feature.key}.desc`)}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-8 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-6 md:px-12 xl:px-24 text-center text-slate-500 text-sm">
                    <p>{t('footer.copyright')}</p>
                </div>
            </footer>
        </div>
    );
}
