'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  MapPinned,
  ShieldCheck,
  Sprout,
  Tractor,
} from 'lucide-react';
import { Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import { useTranslations } from 'next-intl';

import { trackUXEvent } from '@/lib/analytics';
import { Logo } from './Logo';
import TrackedEventLink from './TrackedEventLink';

interface LandingPageProps {
  locale: string;
}

type WorkflowKey = 'capture' | 'suggest' | 'execute';
type RealityKey = 'weather' | 'labor' | 'records';

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

const workflowToFeatureMap: Record<WorkflowKey, 'daily_brief' | 'field_ai' | 'traceability'> = {
  capture: 'daily_brief',
  suggest: 'field_ai',
  execute: 'traceability',
};

export default function LandingPage({ locale }: LandingPageProps) {
  const t = useTranslations('landing');
  const isClosedBeta = process.env.NEXT_PUBLIC_CLOSED_BETA !== 'false';
  const prefersReducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState<WorkflowKey>('capture');
  const [focusedReality, setFocusedReality] = useState<RealityKey>('weather');

  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 28]);
  const heroOverlayY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -18]);

  const buildSignInHref = (surface: string) => `/${locale}/login?intent=sign_in&source=${surface}`;
  const buildWaitlistHref = (surface: string) => `/${locale}/signup?intent=waitlist&source=${surface}`;

  const proofCards = useMemo(() => ([
    {
      key: 'stat_1',
      border: 'border-emerald-200/90',
      tint: 'from-emerald-50 to-white',
      labelColor: 'text-emerald-700',
    },
    {
      key: 'stat_2',
      border: 'border-sky-200/90',
      tint: 'from-sky-50 to-white',
      labelColor: 'text-sky-700',
    },
    {
      key: 'stat_3',
      border: 'border-amber-200/90',
      tint: 'from-amber-50 to-white',
      labelColor: 'text-amber-700',
    },
  ] as const), []);

  const workflowSteps = useMemo(() => ([
    {
      key: 'capture' as const,
      icon: ClipboardList,
      accent: 'text-[#78532f]',
      tone: 'from-[#f7f1e8] to-[#fffdfa]',
      border: 'border-[#e7d8c4]',
    },
    {
      key: 'suggest' as const,
      icon: Sprout,
      accent: 'text-[#25683f]',
      tone: 'from-[#edf7ef] to-[#fcfffd]',
      border: 'border-[#cfe8d4]',
    },
    {
      key: 'execute' as const,
      icon: CheckCircle2,
      accent: 'text-[#2f5e92]',
      tone: 'from-[#ecf3fb] to-[#fcfeff]',
      border: 'border-[#cfe0f2]',
    },
  ]), []);

  const realityPairs = useMemo(() => ([
    {
      key: 'weather' as const,
      icon: CloudSun,
      accent: 'text-[#2f5e92]',
      border: 'border-sky-200/90',
      activeBg: 'bg-sky-50/80',
    },
    {
      key: 'labor' as const,
      icon: Tractor,
      accent: 'text-[#7a4d1f]',
      border: 'border-amber-200/90',
      activeBg: 'bg-amber-50/80',
    },
    {
      key: 'records' as const,
      icon: ShieldCheck,
      accent: 'text-[#21603a]',
      border: 'border-emerald-200/90',
      activeBg: 'bg-emerald-50/80',
    },
  ]), []);

  const activeFeatureKey = workflowToFeatureMap[activeStep];

  const handleStepSelect = (step: WorkflowKey) => {
    setActiveStep(step);
    void trackUXEvent('landing_how_it_works_step_selected', { step });
  };

  return (
    <div className={`${notoSansJp.className} min-h-screen overflow-x-hidden bg-[#f6f3ec] text-slate-900`}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[#e7efe3] via-[#eef4eb] to-transparent" />
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#d7ebd5]/70 blur-3xl" />
        <div className="absolute top-8 right-0 h-80 w-80 rounded-full bg-[#d8e8f8]/65 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#f4e9d7]/65 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[#d9d4c9] bg-[#f6f3ec]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="hidden text-xs font-semibold tracking-[0.2em] text-slate-500 md:block">
              {t('hero.header_tag')}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <TrackedEventLink
              href={buildSignInHref('landing_header')}
              eventName="landing_cta_sign_in_clicked"
              eventProperties={{ surface: 'header', destination: 'login' }}
              className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:text-slate-900"
              data-testid="landing-cta-signin-header"
            >
              {t('hero.cta_login')}
            </TrackedEventLink>
            <TrackedEventLink
              href={buildSignInHref('landing_header_demo')}
              eventName="landing_cta_sign_in_clicked"
              eventProperties={{ surface: 'header_demo', destination: 'login' }}
              className="inline-flex min-h-[44px] items-center rounded-full bg-[#1a7c44] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#136236] sm:px-6"
              data-testid="landing-cta-apply-header"
            >
              {t('hero.cta_demo')}
            </TrackedEventLink>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section
          ref={heroRef}
          className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:pt-16"
          data-testid="landing-hero"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#bfd4be] bg-white/85 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#1a7c44]">
              <MapPinned className="h-3.5 w-3.5" />
              <span>{t('hero.eyebrow')}</span>
            </div>

            <h1 className={`${notoSerifJp.className} text-balance text-4xl font-semibold leading-[1.2] text-[#16202a] sm:text-5xl lg:text-[3.2rem]`}>
              {t('hero.title')}
              <span className="mt-2 block text-[#1c7c44]">{t('hero.title_accent')}</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-[#c3d7c2] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                {t('hero.chip_1')}
              </span>
              <span className="rounded-full border border-[#c8d6e8] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                {t('hero.chip_2')}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrackedEventLink
                href={buildSignInHref('landing_hero_primary')}
                eventName="landing_cta_sign_in_clicked"
                eventProperties={{ surface: 'hero_primary', destination: 'login' }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#1a7c44] px-7 py-3 text-base font-semibold text-white shadow-lg shadow-[#1a7c44]/25 transition hover:bg-[#136236]"
                data-testid="landing-cta-see-how"
              >
                {t('hero.cta_demo')}
                <motion.span
                  animate={prefersReducedMotion ? undefined : { x: [0, 3, 0] }}
                  transition={prefersReducedMotion ? undefined : { duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </TrackedEventLink>
              <TrackedEventLink
                href={buildWaitlistHref('landing_hero_secondary')}
                eventName="landing_cta_waitlist_clicked"
                eventProperties={{ surface: 'hero_secondary', destination: 'signup' }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#cfd8e4] bg-white px-7 py-3 text-base font-semibold text-slate-700 transition hover:border-[#9ebbe0] hover:text-slate-900"
                data-testid="landing-cta-apply-hero"
              >
                {isClosedBeta ? t('hero.cta_beta') : t('hero.cta_start')}
              </TrackedEventLink>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {t('hero.choice_signin_desc')}{' '}
              <TrackedEventLink
                href={buildSignInHref('landing_hero_text')}
                eventName="landing_cta_sign_in_clicked"
                eventProperties={{ surface: 'hero_text', destination: 'login' }}
                className="font-semibold text-[#245e9e] underline decoration-[#adc5e3] underline-offset-4 transition hover:text-[#174777]"
                data-testid="landing-cta-signin-inline"
              >
                {t('hero.cta_login')}
              </TrackedEventLink>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.12 }}
            style={{ y: heroImageY }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[30px] border border-[#d7d2c7] bg-white p-3 shadow-2xl shadow-slate-300/30">
              <div className="relative overflow-hidden rounded-2xl border border-slate-100">
                <Image
                  src="/landing-hero-premium.jpg"
                  alt={t('hero.image_alt')}
                  width={1536}
                  height={1024}
                  className="h-auto w-full object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#11263e]/30 via-transparent to-[#20694b]/15" />
              </div>

              <motion.div
                style={{ y: heroOverlayY }}
                className="absolute left-5 top-5 rounded-xl border border-[#dce9db] bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
              >
                <p className="text-[11px] font-medium text-slate-500">{t('hero.overlay.weather_label')}</p>
                <p className="text-sm font-semibold text-slate-800">{t('hero.overlay.weather_value')}</p>
              </motion.div>

              <motion.div
                style={{ y: heroOverlayY }}
                className="absolute bottom-5 right-5 max-w-[240px] rounded-xl border border-[#d8e3f3] bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
              >
                <p className="text-[11px] font-medium text-slate-500">{t('hero.overlay.task_label')}</p>
                <p className="text-sm font-semibold text-slate-800">{t('hero.overlay.task_value')}</p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-[#dfdacd] bg-[#f9f6ef]/70 py-12 sm:py-14" data-testid="landing-proof-strip">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {proofCards.map((proof, index) => (
                <motion.article
                  key={proof.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-shadow hover:shadow-lg ${proof.border} ${proof.tint}`}
                >
                  <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${proof.labelColor}`}>
                    {t(`trust.${proof.key}_label`)}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-800 sm:text-base">
                    {t(`trust.${proof.key}`)}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 sm:py-20" data-testid="landing-how-it-works">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className={`${notoSerifJp.className} text-2xl font-semibold text-slate-900 sm:text-3xl`}>
                {t('workflow.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('workflow.subtitle')}
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.46fr_0.54fr]">
              <div className="space-y-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeStep === step.key;
                  return (
                    <motion.button
                      key={step.key}
                      type="button"
                      onClick={() => handleStepSelect(step.key)}
                      onMouseEnter={() => setActiveStep(step.key)}
                      onFocus={() => setActiveStep(step.key)}
                      whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                      className={`w-full rounded-2xl border p-5 text-left transition ${step.border} ${
                        isActive
                          ? `${step.tone} bg-gradient-to-br shadow-lg`
                          : 'bg-white shadow-sm hover:bg-[#fcfbf7]'
                      }`}
                      data-testid={`landing-how-step-${index + 1}`}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex rounded-xl bg-white/80 p-2.5 ${step.accent}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500">0{index + 1}</p>
                            <p className="text-base font-semibold text-slate-900">
                              {t(`workflow.steps.${step.key}.title`)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={`h-4 w-4 transition ${isActive ? 'translate-x-1 text-slate-700' : 'text-slate-300'}`} />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(`workflow.steps.${step.key}.desc`)}</p>
                    </motion.button>
                  );
                })}
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-[#ddd7cc] bg-white p-6 shadow-xl shadow-slate-300/20">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#d7ebd5]/70 blur-2xl" />
                <div className="pointer-events-none absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[#d8e8f8]/65 blur-2xl" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    data-testid="landing-how-active-panel"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1c7c44]">
                      {t('workflow.title')}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {t(`workflow.steps.${activeStep}.title`)}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {t(`workflow.steps.${activeStep}.desc`)}
                    </p>

                    <div className="mt-6 rounded-2xl border border-[#dfe7de] bg-[#f7faf7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#21603a]">
                        {t(`value_section.features.${activeFeatureKey}.title`)}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {t(`value_section.features.${activeFeatureKey}.desc`)}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfdacd] bg-[#f9f6ef]/70 py-16 sm:py-20" data-testid="landing-field-reality">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className={`${notoSerifJp.className} text-2xl font-semibold text-slate-900 sm:text-3xl`}>
                {t('pain_points.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('pain_points.subtitle')}
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                {realityPairs.map((pair) => {
                  const Icon = pair.icon;
                  const isActive = focusedReality === pair.key;
                  return (
                    <motion.button
                      key={pair.key}
                      type="button"
                      onMouseEnter={() => setFocusedReality(pair.key)}
                      onFocus={() => setFocusedReality(pair.key)}
                      onClick={() => setFocusedReality(pair.key)}
                      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                      className={`w-full rounded-2xl border p-5 text-left transition ${
                        isActive ? `${pair.activeBg} shadow-md` : 'bg-white shadow-sm'
                      } ${pair.border}`}
                      data-testid={`landing-reality-${pair.key}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex rounded-xl bg-white/90 p-2.5 ${pair.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-base font-semibold text-slate-900">
                          {t(`pain_points.${pair.key}.title`)}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {t(`pain_points.${pair.key}.problem`)}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              <motion.article
                key={focusedReality}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="rounded-2xl border border-[#d8e4d7] bg-white p-6 shadow-lg shadow-slate-300/15"
                data-testid="landing-reality-response"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[#1c7c44]">
                  {t('pain_points.solution_label')}
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {t(`pain_points.${focusedReality}.title`)}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {t(`pain_points.${focusedReality}.solution`)}
                </p>
                <div className="mt-6 inline-flex rounded-xl border border-[#dfe8dc] bg-[#f5faf5] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#23663c]">
                  {t('value_section.title')}
                </div>
              </motion.article>
            </div>
          </div>
        </section>

        <section className="pb-20 pt-16 sm:pt-20" data-testid="landing-final-cta">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.35 }}
              animate={prefersReducedMotion ? undefined : { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              className="rounded-[32px] border border-[#2d7448] bg-gradient-to-r from-[#1b7040] via-[#248657] to-[#2b6e97] px-6 py-10 text-white shadow-2xl shadow-[#1f5f85]/25 sm:px-10"
              style={{ backgroundSize: '180% 180%' }}
            >
              <h2 className={`${notoSerifJp.className} text-2xl leading-snug sm:text-3xl`}>
                {t('cta.title')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                {t('cta.subtitle')}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <TrackedEventLink
                    href={buildWaitlistHref('landing_footer')}
                    eventName="landing_cta_waitlist_clicked"
                    eventProperties={{ surface: 'footer', destination: 'signup' }}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-[#1b7b44] transition hover:bg-[#eaf5ed]"
                    data-testid="landing-cta-apply-final"
                  >
                    {isClosedBeta ? t('hero.cta_beta') : t('cta.primary')}
                  </TrackedEventLink>
                </motion.div>
                <TrackedEventLink
                  href={buildSignInHref('landing_footer')}
                  eventName="landing_cta_sign_in_clicked"
                  eventProperties={{ surface: 'footer', destination: 'login' }}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/70 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                  data-testid="landing-cta-signin-final"
                >
                  {t('cta.secondary')}
                </TrackedEventLink>
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
