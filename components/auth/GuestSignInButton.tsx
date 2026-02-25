'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
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
  const [traceStepIndex, setTraceStepIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setTraceStepIndex(0);
      return;
    }

    const finalStepIndex = 2;
    const timer = window.setInterval(() => {
      setTraceStepIndex((prev) => (prev < finalStepIndex ? prev + 1 : finalStepIndex));
    }, 900);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Let loading UI paint before NextAuth redirects/navigation starts.
      if (typeof window !== 'undefined') {
        await new Promise<void>((resolve) => {
          if (typeof window.requestAnimationFrame !== 'function') {
            window.setTimeout(resolve, 0);
            return;
          }
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          });
        });
      }
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

      {isLoading && (
        <div
          aria-live="polite"
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
          data-testid="login-guest-trace"
        >
          <p className="font-semibold">{t('guestPreparingTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            {[t('guestPreparingStep1'), t('guestPreparingStep2'), t('guestPreparingStep3')].map((step, index) => {
              const isDone = index < traceStepIndex;
              const isCurrent = index === traceStepIndex;

              return (
                <li key={step} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                          ? 'border border-emerald-500'
                          : 'border border-emerald-300 bg-white text-emerald-400'
                    }`}
                  >
                    {isDone ? '✓' : isCurrent ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> : '•'}
                  </span>
                  <span className={isDone ? 'text-emerald-700' : 'text-emerald-800'}>{step}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
