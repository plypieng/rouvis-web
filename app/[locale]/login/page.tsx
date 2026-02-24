'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GuestSignInButton } from '@/components/auth/GuestSignInButton';
import TrackedEventLink from '@/components/TrackedEventLink';

function LoginPageContent() {
  const t = useTranslations('auth.signIn');
  const { status } = useSession();
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) || 'ja';
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = callbackUrl?.startsWith('/') ? callbackUrl : null;
  const errorCode = searchParams.get('error');
  const errorReason = searchParams.get('reason');
  const isAdmissionDenied = errorCode === 'AccessDenied' && errorReason === 'admission_denied';
  const isGuestSignInEnabled = process.env.NEXT_PUBLIC_GUEST_SIGNIN_ENABLED === 'true';
  const subtitle = isGuestSignInEnabled ? t('subtitleGuest') : t('subtitle');
  const securityBody = isGuestSignInEnabled ? t('securityBodyGuest') : t('securityBody');
  const panelBadge = isGuestSignInEnabled ? t('panelBadgeGuest') : t('panelBadge');

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(safeCallbackUrl ?? `/${locale}`);
    }
  }, [status, router, locale, safeCallbackUrl]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-700">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-14">
          <div className="w-full max-w-[520px]">
            <div className="mb-8 flex items-center justify-start">
              <TrackedEventLink
                href={`/${locale}`}
                eventName="login_back_to_landing_clicked"
                eventProperties={{ source: 'login_page' }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                data-testid="login-back-to-landing"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t('backToLanding')}</span>
              </TrackedEventLink>
            </div>

            <div className="mb-7">
              <Link href={`/${locale}`} className="inline-block transition-opacity hover:opacity-85">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">ROUVIS</h1>
              </Link>
              <p className="mt-2 text-sm text-slate-500">{t('brandTagline')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{t('title')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
              </div>

              {isAdmissionDenied && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p>{t('admissionDenied')}</p>
                  <TrackedEventLink
                    href={`/${locale}/signup?source=login_admission_denied`}
                    eventName="login_admission_denied_request_access_clicked"
                    eventProperties={{ surface: 'login_error' }}
                    className="mt-2 inline-block font-semibold text-amber-900 underline"
                  >
                    {t('requestAccessCta')}
                  </TrackedEventLink>
                </div>
              )}

              {!isAdmissionDenied && Boolean(errorCode) && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {t('error')}
                </div>
              )}

              <div className="space-y-3">
                {isGuestSignInEnabled && (
                  <>
                    <GuestSignInButton
                      callbackUrl={safeCallbackUrl ?? `/${locale}`}
                      dataTestId="login-guest-cta"
                    />
                    <p className="text-xs text-slate-500">{t('guestHint')}</p>
                  </>
                )}

                <GoogleSignInButton
                  callbackUrl={safeCallbackUrl ?? `/${locale}/onboarding`}
                  dataTestId="login-google-cta"
                />
              </div>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>{t('methodDivider')}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">{t('securityTitle')}</p>
                <p className="mt-1">{securityBody}</p>
              </div>

              <div className="mt-5 text-xs text-slate-500">
                <p>{t('terms')}</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-slate-200 bg-gradient-to-br from-[#eaf2fb] via-[#f5f9ff] to-[#eef7f0] lg:flex">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-200/45 blur-3xl" />
          <div className="absolute right-[-70px] bottom-[-40px] h-80 w-80 rounded-full bg-emerald-200/45 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <p className="inline-flex items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {panelBadge}
              </p>
              <h3 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
                {t('panelTitle')}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                {t('panelSubtitle')}
              </p>
            </div>

            <div className="space-y-3">
              <article className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t('panelCard1Label')}</p>
                <p className="mt-2 text-sm text-slate-700">{t('panelCard1Body')}</p>
              </article>

              <article className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('panelCard2Label')}</p>
                <p className="mt-2 text-sm text-slate-700">{t('panelCard2Body')}</p>
              </article>

              <article className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('panelCard3Label')}</p>
                <p className="mt-2 text-sm text-slate-700">{t('panelCard3Body')}</p>
              </article>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_25px_55px_-45px_rgba(15,23,42,0.5)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('panelChecklistLabel')}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {[t('panelChecklist1'), t('panelChecklist2'), t('panelChecklist3')].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="text-slate-700">...</div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
