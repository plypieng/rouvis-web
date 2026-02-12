'use client';

import { useEffect, useRef, useState } from 'react';
import { ROUVIS_TOAST_EVENT, type ToastPayload, type ToastVariant } from '@/lib/feedback';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const MAX_TOASTS = 4;
const TOAST_TTL_MS = 5000;

export default function AlertToastBridge() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timeoutsRef = useRef<Record<number, number>>({});

  const pushToast = (payload: ToastPayload) => {
    const id = ++idRef.current;
    const nextToast: Toast = {
      id,
      message: payload.message,
      variant: payload.variant || 'info',
      durationMs: payload.durationMs || TOAST_TTL_MS,
      action: payload.action,
    };

    setToasts((prev) => [...prev, nextToast].slice(-MAX_TOASTS));

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete timeoutsRef.current[id];
    }, nextToast.durationMs);

    timeoutsRef.current[id] = timeoutId;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAlert = window.alert.bind(window);

    window.alert = (message?: unknown) => {
      const text =
        typeof message === 'string'
          ? message
          : message == null
            ? ''
            : String(message);
      pushToast({ message: text, variant: 'info' });
    };

    const onToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastPayload>;
      const detail = customEvent.detail;
      if (!detail || !detail.message) return;
      pushToast(detail);
    };

    window.addEventListener(ROUVIS_TOAST_EVENT, onToast as EventListener);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener(ROUVIS_TOAST_EVENT, onToast as EventListener);
      Object.values(timeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = {};
    };
  }, []);

  const dismissToast = (id: number) => {
    const timeoutId = timeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete timeoutsRef.current[id];
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (!toasts.length) return null;

  const variantClass = (variant: ToastVariant) => {
    if (variant === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (variant === 'error') return 'border-red-200 bg-red-50 text-red-800';
    if (variant === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-blue-200 bg-blue-50 text-blue-800';
  };

  const variantIcon = (variant: ToastVariant) => {
    if (variant === 'success') return 'check_circle';
    if (variant === 'error') return 'error';
    if (variant === 'warning') return 'warning';
    return 'info';
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-[420px]"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg ${variantClass(toast.variant)}`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 material-symbols-outlined text-base">{variantIcon(toast.variant)}</span>
            <p className="flex-1 whitespace-pre-line">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close notification"
            >
              閉じる
            </button>
          </div>
          {toast.action && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="rounded-md border border-current px-3 py-1 text-xs font-semibold hover:bg-white/40"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
