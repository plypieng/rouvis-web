'use client';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
};

export const ROUVIS_TOAST_EVENT = 'rouvis:toast';

export function pushToast(payload: ToastPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(ROUVIS_TOAST_EVENT, { detail: payload }));
}

export function toastSuccess(message: string, action?: ToastAction): void {
  pushToast({ message, variant: 'success', action });
}

export function toastError(message: string, action?: ToastAction): void {
  pushToast({ message, variant: 'error', action });
}

export function toastWarning(message: string, action?: ToastAction): void {
  pushToast({ message, variant: 'warning', action });
}

export function toastInfo(message: string, action?: ToastAction): void {
  pushToast({ message, variant: 'info', action });
}
