'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lock, Download, Trash2, Clock3, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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

function formatStatus(status: RequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'PROCESSING':
      return 'Processing';
    case 'COMPLETED':
      return 'Completed';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELED':
      return 'Canceled';
    default:
      return status;
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
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
  const pendingIdempotencyKeysRef = useRef<Partial<Record<RequestType, string>>>({});

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/v1/account/data-requests', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to fetch account data requests');
      }

      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch account data requests';
      setErrorMessage(message);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

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
    async (type: RequestType) => {
      if (type === 'DELETE') {
        const confirmed = window.confirm(
          'Submit an account deletion request? This starts a compliance review workflow.'
        );
        if (!confirmed) {
          return;
        }
      }

      setErrorMessage(null);
      setInfoMessage(null);
      setSubmittingType(type);

      try {
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
          throw new Error(payload?.error || 'Failed to submit request');
        }

        if (payload?.duplicate) {
          setInfoMessage(`${type === 'EXPORT' ? 'Export' : 'Delete'} request is already active.`);
        } else {
          setInfoMessage(`${type === 'EXPORT' ? 'Export' : 'Delete'} request submitted successfully.`);
        }

        delete pendingIdempotencyKeysRef.current[type];
        await loadRequests();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit request';
        setErrorMessage(message);
      } finally {
        setSubmittingType(null);
      }
    },
    [loadRequests]
  );

  if (!session?.user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your account details and data.</p>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {session.user.id}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">{session.user.email}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Data Management</h2>

          <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              Data actions are processed asynchronously for compliance review. You can submit one active request per action type.
            </p>
          </div>

          {loadingRequests && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading account request status...
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{infoMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Export Personal Data</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Submit a request to receive a copy of your personal data.
              </p>
              {exportRequest && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Latest: {formatStatus(exportRequest.status)} at {formatDate(exportRequest.requestedAt)}
                </p>
              )}
              {exportRequest?.status === 'COMPLETED' && exportRequest.resultUrl && (
                <a
                  href={exportRequest.resultUrl}
                  className="mt-1 inline-block text-xs text-emerald-700 underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download latest export
                </a>
              )}
            </div>
            <button
              onClick={() => void submitRequest('EXPORT')}
              disabled={submittingType !== null || exportPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingType === 'EXPORT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {submittingType === 'EXPORT' ? 'Submitting...' : exportPending ? 'Request Pending' : 'Request Export'}
            </button>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-700 dark:text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Delete Account</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                Submit an account deletion request. Processing can take additional review time.
              </p>
              {deleteRequest && (
                <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
                  Latest: {formatStatus(deleteRequest.status)} at {formatDate(deleteRequest.requestedAt)}
                </p>
              )}
            </div>
            <button
              onClick={() => void submitRequest('DELETE')}
              disabled={submittingType !== null || deletePending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingType === 'DELETE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {submittingType === 'DELETE' ? 'Submitting...' : deletePending ? 'Request Pending' : 'Request Deletion'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p>
            Need urgent account assistance? Contact support from chat and include your user ID.
            <Link href={`/${locale}/chat`} className="ml-1 text-emerald-700 underline underline-offset-2">
              Open chat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
