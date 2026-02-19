'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
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

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(safeCallbackUrl ?? `/${locale}`);
    }
  }, [status, router, locale, safeCallbackUrl]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center justify-start">
          <TrackedEventLink
            href={`/${locale}`}
            eventName="login_back_to_landing_clicked"
            eventProperties={{ source: 'login_page' }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-200 hover:bg-white"
            data-testid="login-back-to-landing"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backToLanding')}</span>
          </TrackedEventLink>
        </div>

        {/* ROuvis Logo */}
        <div className="text-center mb-6">
          <Link href={`/${locale}`} className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="text-4xl font-bold text-emerald-600 tracking-tight mb-2">ROUVIS</h1>
          </Link>
          <p className="text-sm text-gray-500">{t('brandTagline')}</p>
        </div>

        {/* Sign-In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
            <p className="mt-2 text-gray-600">{t('subtitle')}</p>
          </div>

          {isAdmissionDenied && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t('error')}
            </div>
          )}

          <GoogleSignInButton callbackUrl={safeCallbackUrl ?? `/${locale}/onboarding`} />

          <div className="text-center text-xs text-gray-500">
            <p>{t('terms')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white"><div className="text-gray-600">...</div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
