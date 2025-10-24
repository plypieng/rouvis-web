'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const t = useTranslations('auth.signIn');
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/calendar');
    }
  }, [status, router]);

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
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-600 mb-2">ROuvis</h1>
          <p className="text-sm text-gray-500">農業チャットアシスタント</p>
        </div>

        {/* Sign-In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
            <p className="mt-2 text-gray-600">{t('subtitle')}</p>
          </div>

          <GoogleSignInButton callbackUrl="/onboarding" />

          <div className="text-center text-xs text-gray-500">
            <p>{t('terms')}</p>
          </div>
        </div>

        {/* Optional: Add illustration or feature highlights */}
        <div className="text-center text-sm text-gray-600 space-y-2">
          <p>✅ チャットで簡単に作業記録</p>
          <p>✅ 天気予報と作業提案</p>
          <p>✅ 農業技術の検索とアドバイス</p>
        </div>
      </div>
    </div>
  );
}
