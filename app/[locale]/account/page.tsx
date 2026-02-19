'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lock, Download, Trash2, Clock3, Loader2 } from 'lucide-react';
import InlineFeedbackNotice from '@/components/InlineFeedbackNotice';
import { trackUXEvent } from '@/lib/analytics';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/feedback';

type RequestType = 'EXPORT' | 'DELETE';
type RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELED';

type AccountDataRequest = {
  id: string;
  type: RequestType;
  status: RequestStatus;
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  reason: string | null;
  resultUrl: string | null;
  resultExpiresAt: string | null;
};

const ACTIVE_STATUSES = new Set<RequestStatus>(['PENDING', 'PROCESSING']);

type RecoverableAction =
  | { kind: 'load' }
  | { kind: 'submit'; requestType: RequestType };

function formatStatus(status: RequestStatus, t: (key: string) => string): string {
  switch (status) {
    case 'PENDING':
      return t('status.pending');
    case 'PROCESSING':
      return t('status.processing');
    case 'COMPLETED':
      return t('status.completed');
    case 'REJECTED':
      return t('status.rejected');
    case 'CANCELED':
      return t('status.canceled');
    default:
      return status;
  }
}

function formatDate(value: string | null, locale: string): string {
  if (!value) {
    return '-';
  }
  const localeTag = locale === 'ja' ? 'ja-JP' : 'en-US';
  return new Date(value).toLocaleString(localeTag);
}

export default function AccountPage() {
  const t = useTranslations('pages.account');
  const { data: session } = useSession();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'ja';

  const [requests, setRequests] = useState<AccountDataRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submittingType, setSubmittingType] = useState<RequestType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [recoverableAction, setRecoverableAction] = useState<RecoverableAction | null>(null);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState(false);
  const pendingIdempotencyKeysRef = useRef<Partial<Record<RequestType, string>>>({});

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/account/data-requests', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || t('errors.fetch_requests'));
      }

      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      setRecoverableAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.fetch_requests');
      setErrorMessage(message);
      setRecoverableAction({ kind: 'load' });
      void trackUXEvent('account_feedback_notice_shown', {
        variant: 'error',
        context: 'load',
      });
      toastError(message, {
        label: t('actions.retry'),
        onClick: () => {
          void trackUXEvent('account_feedback_retry_clicked', {
            surface: 'toast',
            context: 'load',
          });
          void loadRequests();
        },
      });
    } finally {
      setLoadingRequests(false);
    }
  }, [t]);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    void loadRequests();
  }, [session?.user, loadRequests]);

  const exportRequest = useMemo(
    () => requests.find((request) => request.type === 'EXPORT'),
    [requests]
  );
  const deleteRequest = useMemo(
    () => requests.find((request) => request.type === 'DELETE'),
    [requests]
  );

  const exportPending = Boolean(exportRequest && ACTIVE_STATUSES.has(exportRequest.status));
  const deletePending = Boolean(deleteRequest && ACTIVE_STATUSES.has(deleteRequest.status));

  const submitRequest = useCallback(
    async function runSubmitRequest(
      type: RequestType,
      options?: {
        skipDeleteConfirmation?: boolean;
        surface?: 'primary' | 'inline' | 'toast';
      }
    ) {
      const surface = options?.surface ?? 'primary';

      if (type === 'DELETE' && !options?.skipDeleteConfirmation) {
        setPendingDeleteConfirmation(true);
        setErrorMessage(null);
        setInfoMessage(t('messages.confirm_delete_continue'));
        void trackUXEvent('account_delete_confirmation_shown', { surface });
        void trackUXEvent('account_feedback_notice_shown', {
          variant: 'warning',
          context: 'delete_confirmation',
        });
        toastWarning(t('messages.confirm_delete_continue'), {
          label: t('actions.review'),
          onClick: () => {
            void trackUXEvent('account_delete_confirmation_review_clicked', {
              surface: 'toast',
            });
            setPendingDeleteConfirmation(true);
          },
        });
        return;
      }

      setErrorMessage(null);
      setInfoMessage(null);
      setSubmittingType(type);

      try {
        if (type === 'DELETE') {
          setPendingDeleteConfirmation(false);
          void trackUXEvent('account_delete_confirmation_confirmed', { surface });
        }

        const requestId = crypto.randomUUID();
        const idempotencyKey = pendingIdempotencyKeysRef.current[type]
          ?? `account:${type.toLowerCase()}:${crypto.randomUUID()}`;
        pendingIdempotencyKeysRef.current[type] = idempotencyKey;

        const res = await fetch('/api/v1/account/data-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            type,
            metadata: {
              source: 'account-page',
            },
          }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || t('errors.submit_request'));
        }

        const typeLabel = type === 'EXPORT' ? t('types.export') : t('types.delete');
        if (payload?.duplicate) {
          const message = t('messages.request_active', { type: typeLabel });
          setInfoMessage(message);
          toastInfo(message);
        } else {
          const message = t('messages.request_submitted', { type: typeLabel });
          setInfoMessage(message);
          toastSuccess(message);
        }

        setRecoverableAction(null);
        void trackUXEvent('account_request_submitted', {
          requestType: type,
          duplicate: Boolean(payload?.duplicate),
        });
        delete pendingIdempotencyKeysRef.current[type];
        await loadRequests();
      } catch (error) {
        const message = error instanceof Error ? error.message : t('errors.submit_request');
        setErrorMessage(message);
        setRecoverableAction({ kind: 'submit', requestType: type });
        void trackUXEvent('account_request_submit_failed', {
          requestType: type,
          surface,
        });
        void trackUXEvent('account_feedback_notice_shown', {
          variant: 'error',
          context: 'submit',
          requestType: type,
        });
        toastError(message, {
          label: t('actions.retry'),
          onClick: () => {
            void trackUXEvent('account_feedback_retry_clicked', {
              surface: 'toast',
              context: 'submit',
              requestType: type,
            });
            void runSubmitRequest(type, {
              skipDeleteConfirmation: true,
              surface: 'toast',
            });
          },
        });
      } finally {
        setSubmittingType(null);
      }
    },
    [loadRequests, t]
  );

  const retryRecoverableAction = useCallback(() => {
    if (!recoverableAction) return;
    if (recoverableAction.kind === 'load') {
      void trackUXEvent('account_feedback_retry_clicked', {
        surface: 'inline',
        context: 'load',
      });
      void loadRequests();
      return;
    }

    void trackUXEvent('account_feedback_retry_clicked', {
      surface: 'inline',
      context: 'submit',
      requestType: recoverableAction.requestType,
    });
    void submitRequest(recoverableAction.requestType, {
      skipDeleteConfirmation: true,
      surface: 'inline',
    });
  }, [loadRequests, recoverableAction, submitRequest]);

  const cancelDeleteConfirmation = useCallback(() => {
    setPendingDeleteConfirmation(false);
    const message = t('messages.deletion_not_submitted');
    setInfoMessage(message);
    void trackUXEvent('account_delete_confirmation_cancelled', {
      surface: 'inline',
    });
    toastInfo(message);
  }, [t]);

  if (!session?.user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">{t('description')}</p>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('sections.profile_information')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('labels.user_id')}</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {session.user.id}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('labels.name')}</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('labels.email')}</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.email}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('sections.data_management')}</h2>

          <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              {t('notices.async_processing')}
            </p>
          </div>

          {loadingRequests && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading.requests')}
            </div>
          )}

          {infoMessage ? (
            <InlineFeedbackNotice
              variant="success"
              message={infoMessage}
              className="mb-4"
            />
          ) : null}

          {errorMessage ? (
            <InlineFeedbackNotice
              variant="error"
              message={errorMessage}
              className="mb-4"
              primaryAction={recoverableAction
                ? {
                    label: t('actions.retry'),
                    onClick: retryRecoverableAction,
                    disabled: submittingType !== null || loadingRequests,
                  }
                : undefined}
            />
          ) : null}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('export.title')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('export.description')}
              </p>
              {exportRequest && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('messages.latest_status', {
                    status: formatStatus(exportRequest.status, (key) => t(key)),
                    date: formatDate(exportRequest.requestedAt, locale),
                  })}
                </p>
              )}
              {exportRequest?.status === 'COMPLETED' && exportRequest.resultUrl && (
                <a
                  href={exportRequest.resultUrl}
                  className="mt-1 inline-block text-xs text-emerald-700 underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('actions.download_latest_export')}
                </a>
              )}
            </div>
            <button
              onClick={() => void submitRequest('EXPORT')}
              disabled={submittingType !== null || exportPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingType === 'EXPORT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {submittingType === 'EXPORT'
                ? t('actions.submitting')
                : exportPending
                  ? t('actions.request_pending')
                  : t('actions.request_export')}
            </button>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-700 dark:text-red-400">{t('sections.danger_zone')}</h2>
          {pendingDeleteConfirmation ? (
            <InlineFeedbackNotice
              variant="warning"
              title={t('confirm.delete_request_title')}
              message={t('confirm.delete_request_message')}
              className="mb-4"
              primaryAction={{
                label: submittingType === 'DELETE' ? t('actions.submitting') : t('actions.submit_deletion_request'),
                onClick: () => {
                  void submitRequest('DELETE', {
                    skipDeleteConfirmation: true,
                    surface: 'inline',
                  });
                },
                disabled: submittingType !== null || deletePending,
              }}
              secondaryAction={{
                label: t('actions.cancel'),
                onClick: cancelDeleteConfirmation,
                disabled: submittingType !== null,
              }}
            />
          ) : null}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">{t('delete.title')}</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                {t('delete.description')}
              </p>
              {deleteRequest && (
                <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
                  {t('messages.latest_status', {
                    status: formatStatus(deleteRequest.status, (key) => t(key)),
                    date: formatDate(deleteRequest.requestedAt, locale),
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => void submitRequest('DELETE')}
              disabled={submittingType !== null || deletePending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingType === 'DELETE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {submittingType === 'DELETE'
                ? t('actions.submitting')
                : deletePending
                  ? t('actions.request_pending')
                  : t('actions.request_deletion')}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p>
            {t('support.message')}
            <Link href={`/${locale}/chat`} className="ml-1 text-emerald-700 underline underline-offset-2">
              {t('actions.open_chat')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
