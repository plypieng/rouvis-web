'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Sprout, BookOpen, Calendar } from 'lucide-react';

export default function LandingPage({ locale }: { locale: string }) {
    const t = useTranslations('landing');

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navbar */}
            <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="Rouvis" width={32} height={32} />
                    <span className="text-xl font-bold text-white tracking-tight">Rouvis</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/login`} className="text-sm font-medium text-white/90 hover:text-white transition-colors">
                        {t('hero.cta_login')}
                    </Link>
                    <Link href={`/${locale}/signup`} className="px-5 py-2.5 text-sm font-semibold text-emerald-900 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg shadow-black/5">
                        {t('hero.cta_start')}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/landing-hero.png"
                        alt="Modern Farm"
                        fill
                        className="object-cover"
                        priority
                        quality={90}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-6"
                    >
                        {t('hero.title')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        {t('hero.subtitle')}
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href={`/${locale}/signup`}
                            className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-all transform hover:scale-105 shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2"
                        >
                            {t('hero.cta_start')}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                                <Sprout className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.doctor.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('features.doctor.desc')}
                            </p>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                                <BookOpen className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.knowledge.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('features.knowledge.desc')}
                            </p>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
                                <Calendar className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.planning.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('features.planning.desc')}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 opacity-80">
                        <Image src="/logo.svg" alt="Rouvis" width={24} height={24} className="grayscale" />
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Rouvis</span>
                    </div>
                    <p className="text-sm text-gray-500">
                        {t('footer.copyright')}
                    </p>
                </div>
            </footer>
        </div>
    );
}
