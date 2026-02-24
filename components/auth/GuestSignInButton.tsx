'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface GuestSignInButtonProps {
  callbackUrl?: string;
  className?: string;
  buttonClassName?: string;
  dataTestId?: string;
}

const DEMO_DEVICE_ID_KEY = 'rouvis_demo_device_id';

function resolveDemoDeviceId(): string {
  if (typeof window === 'undefined') {
    return `guest-${Date.now()}`;
  }

  const existingId = window.localStorage.getItem(DEMO_DEVICE_ID_KEY);
  if (existingId) return existingId;

  const generatedId = typeof window.crypto?.randomUUID === 'function'
    ? `guest-${window.crypto.randomUUID()}`
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(DEMO_DEVICE_ID_KEY, generatedId);
  return generatedId;
}

export function GuestSignInButton({
  callbackUrl = '/',
  className = '',
  buttonClassName = '',
  dataTestId,
}: GuestSignInButtonProps) {
  const t = useTranslations('auth.signIn');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const deviceId = resolveDemoDeviceId();
      await signIn('demo-device', { callbackUrl, deviceId });
    } catch (err) {
      console.error('Guest sign in error:', err);
      setError(t('guestError'));
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        data-testid={dataTestId}
        className={`w-full flex items-center justify-center gap-3 rounded-xl border border-emerald-800 bg-emerald-700 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        <span className="material-symbols-outlined text-xl">flash_on</span>
        <span>{isLoading ? t('guestLoading') : t('guestButton')}</span>
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
