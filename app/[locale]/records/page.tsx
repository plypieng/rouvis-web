'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ActivityDashboard } from '../../../components/ActivityDashboard';
import { ActivityLogModal } from '../../../components/ActivityLogModal';
import { TaskSchedulerModal } from '../../../components/TaskSchedulerModal';
import { trackUXEvent } from '@/lib/analytics';

const OFFLINE_QUEUE_STORAGE_KEY = 'rouvis.records.offline-queue.v1';

type ActivityPayload = {
  type: string;
  qty?: number;
  unit?: string;
  note?: string;
  performedAt?: string;
  fieldId?: string;
};

type TaskPayload = {
  title: string;
  description?: string;
  dueAt: string;
  fieldId?: string;
};

type OfflineQueueItem = {
  id: string;
  kind: 'activity' | 'task';
  payload: ActivityPayload | TaskPayload;
  createdAt: string;
  attempts: number;
};

function readOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OfflineQueueItem[];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function makeQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RecordsPage() {
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) || 'ja';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [isQueueSyncing, setIsQueueSyncing] = useState(false);
  const [queueSyncError, setQueueSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const action = searchParams.get('action');

  const syncCopy = useMemo(() => (
    locale === 'en'
      ? {
          title: 'Sync status',
          online: 'Online',
          offline: 'Offline',
          pending: (count: number) => `${count} item(s) waiting to sync`,
          offlineHint: 'New records will be queued on this device until connection returns.',
          syncNow: 'Sync now',
          syncing: 'Syncing...',
          syncFailed: 'Some records failed to sync. Please retry.',
        }
      : {
          title: '同期ステータス',
          online: 'オンライン',
          offline: 'オフライン',
          pending: (count: number) => `同期待ち ${count} 件`,
          offlineHint: '接続が戻るまで、新しい記録はこの端末にキュー保存されます。',
          syncNow: '今すぐ同期',
          syncing: '同期中...',
          syncFailed: '一部の記録を同期できませんでした。再試行してください。',
        }
  ), [locale]);

  const enqueueOfflineItem = useCallback((
    kind: OfflineQueueItem['kind'],
    payload: ActivityPayload | TaskPayload,
    reason: 'offline' | 'network_error' | 'server_error',
  ) => {
    const nextQueue = [
      ...readOfflineQueue(),
      {
        id: makeQueueId(),
        kind,
        payload,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    ];
    writeOfflineQueue(nextQueue);
    setOfflineQueue(nextQueue);
    setQueueSyncError(null);
    void trackUXEvent('records_offline_queue_enqueued', {
      kind,
      reason,
      queueDepth: nextQueue.length,
    });
  }, []);

  const flushOfflineQueue = useCallback(async (trigger: 'auto' | 'manual') => {
    if (isQueueSyncing) return;
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      setQueueSyncError(syncCopy.syncFailed);
      return;
    }

    const currentQueue = readOfflineQueue();
    if (currentQueue.length === 0) {
      setOfflineQueue([]);
      setQueueSyncError(null);
      return;
    }

    setIsQueueSyncing(true);
    setQueueSyncError(null);

    let syncedCount = 0;
    const remaining: OfflineQueueItem[] = [];

    for (const item of currentQueue) {
      const endpoint = item.kind === 'activity' ? '/api/v1/activities' : '/api/v1/tasks';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          syncedCount += 1;
          continue;
        }

        remaining.push({
          ...item,
          attempts: item.attempts + 1,
        });
      } catch {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
        });
      }
    }

    writeOfflineQueue(remaining);
    setOfflineQueue(remaining);
    setIsQueueSyncing(false);

    if (syncedCount > 0) {
      void trackUXEvent('records_offline_queue_synced', {
        trigger,
        syncedCount,
        remainingCount: remaining.length,
      });
      router.refresh();
    }

    if (remaining.length > 0) {
      setQueueSyncError(syncCopy.syncFailed);
      void trackUXEvent('records_offline_queue_sync_failed', {
        trigger,
        remainingCount: remaining.length,
      });
    }
  }, [isQueueSyncing, router, syncCopy.syncFailed]);

  useEffect(() => {
    setOfflineQueue(readOfflineQueue());
    if (typeof window === 'undefined') return;

    setIsOnline(window.navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (action === 'log' || action === 'voice') {
      setShowLogModal(true);
    }
    if (action === 'schedule') {
      setShowTaskModal(true);
    }
  }, [action]);

  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) return;
    void flushOfflineQueue('auto');
  }, [flushOfflineQueue, isOnline, offlineQueue.length]);

  const clearActionQuery = () => {
    if (!action) return;
    router.replace(`/${locale}/records`);
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">記録・分析</h1>

      {(offlineQueue.length > 0 || !isOnline || queueSyncError) ? (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="records-sync-status"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{syncCopy.title}</p>
              <p className="mt-1">{isOnline ? syncCopy.online : syncCopy.offline}</p>
              <p className="mt-1">{syncCopy.pending(offlineQueue.length)}</p>
              {!isOnline ? <p className="mt-1 text-xs">{syncCopy.offlineHint}</p> : null}
              {queueSyncError ? <p className="mt-1 text-xs text-red-700">{queueSyncError}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                void trackUXEvent('records_offline_queue_flush_clicked', {
                  queueDepth: offlineQueue.length,
                });
                void flushOfflineQueue('manual');
              }}
              disabled={isQueueSyncing || offlineQueue.length === 0}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isQueueSyncing ? syncCopy.syncing : syncCopy.syncNow}
            </button>
          </div>
        </section>
      ) : null}

      <ActivityDashboard
        onLogActivity={() => setShowLogModal(true)}
        onScheduleTask={() => setShowTaskModal(true)}
        onViewCalendar={() => router.push(`/${locale}/calendar`)}
      />

      <ActivityLogModal
        isOpen={showLogModal}
        autoStartVoice={action === 'voice'}
        locale={locale}
        onClose={() => {
          setShowLogModal(false);
          clearActionQuery();
        }}
        onSave={async (activity) => {
          const payload: ActivityPayload = {
            type: activity.type,
            qty: activity.quantity,
            unit: activity.unit,
            note: activity.note,
            performedAt: activity.performedAt ? new Date(activity.performedAt).toISOString() : undefined,
            fieldId: activity.fieldId,
          };

          if (typeof window !== 'undefined' && !window.navigator.onLine) {
            enqueueOfflineItem('activity', payload, 'offline');
            return { queued: true };
          }

          try {
            const res = await fetch('/api/v1/activities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const message = data.error || 'Failed to log activity';
              if (res.status >= 500) {
                enqueueOfflineItem('activity', payload, 'server_error');
                return { queued: true };
              }
              throw new Error(message);
            }

            router.refresh();
            return {};
          } catch (error) {
            if (error instanceof TypeError) {
              enqueueOfflineItem('activity', payload, 'network_error');
              return { queued: true };
            }
            throw error;
          }
        }}
      />

      <TaskSchedulerModal
        isOpen={showTaskModal}
        locale={locale}
        onClose={() => {
          setShowTaskModal(false);
          clearActionQuery();
        }}
        onSave={async (task) => {
          const payload: TaskPayload = {
            title: task.title,
            description: task.notes,
            dueAt: new Date(task.dueAt).toISOString(),
            fieldId: task.fieldId,
          };

          if (typeof window !== 'undefined' && !window.navigator.onLine) {
            enqueueOfflineItem('task', payload, 'offline');
            return { queued: true };
          }

          try {
            const res = await fetch('/api/v1/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const message = data.error || 'Failed to create task';
              if (res.status >= 500) {
                enqueueOfflineItem('task', payload, 'server_error');
                return { queued: true };
              }
              throw new Error(message);
            }

            router.refresh();
            return {};
          } catch (error) {
            if (error instanceof TypeError) {
              enqueueOfflineItem('task', payload, 'network_error');
              return { queued: true };
            }
            throw error;
          }
        }}
      />
    </div>
  );
}
