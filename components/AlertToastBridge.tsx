'use client';

import { useEffect, useRef, useState } from 'react';

type Toast = {
  id: number;
  message: string;
};

const MAX_TOASTS = 4;
const TOAST_TTL_MS = 5000;

export default function AlertToastBridge() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timeoutsRef = useRef<Record<number, number>>({});

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

      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message: text }].slice(-MAX_TOASTS));

      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        delete timeoutsRef.current[id];
      }, TOAST_TTL_MS);

      timeoutsRef.current[id] = timeoutId;
    };

    return () => {
      window.alert = originalAlert;
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

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-[420px]"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-lg"
          role="status"
        >
          <span className="mt-0.5 material-symbols-outlined text-base text-emerald-600">info</span>
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
      ))}
    </div>
  );
}

