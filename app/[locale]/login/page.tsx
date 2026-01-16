'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

function LoginPageContent() {
  const t = useTranslations('auth.signIn');
  const { status } = useSession();
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) || 'ja';
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = callbackUrl?.startsWith('/') ? callbackUrl : null;

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(safeCallbackUrl ?? `/${locale}`);
    }
  }, [status, router, locale, safeCallbackUrl]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* ROuvis Logo */}
        <div className="text-center mb-6">
          <Link href={`/${locale}`} className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="text-4xl font-bold text-emerald-600 tracking-tight mb-2">ROUVIS</h1>
          </Link>
          <p className="text-sm text-gray-500">農業チャットアシスタント</p>
        </div>

        {/* Sign-In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
            <p className="mt-2 text-gray-600">{t('subtitle')}</p>
          </div>

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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white"><div className="text-gray-600">Loading...</div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
