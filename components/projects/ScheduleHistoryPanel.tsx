'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackUXEvent } from '@/lib/analytics';

type ScheduleRevisionSummary = {
  id: string;
  type: 'baseline' | 'replan';
  mode: 'replace_open' | 'replace_all';
  source: 'wizard_initial' | 'project_replan';
  preferenceTemplate?: string | null;
  summary?: Record<string, unknown> | null;
  note?: string | null;
  createdAt: string;
  triggeredByUserId?: string;
};

type ScheduleRevisionDetail = {
  id: string;
  type: 'baseline' | 'replan';
  mode: 'replace_open' | 'replace_all';
  source: 'wizard_initial' | 'project_replan';
  preferenceTemplate?: string | null;
  schedulingPreferences?: Record<string, unknown> | null;
  beforeTasksSnapshot?: Array<Record<string, unknown>>;
  afterTasksSnapshot?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown> | null;
  note?: string | null;
  createdAt: string;
};

type ScheduleHistoryPanelProps = {
  open: boolean;
  onClose?: () => void;
  projectId: string;
  variant?: 'dialog' | 'embedded';
};

function formatRevisionLabel(
  revision: Pick<ScheduleRevisionSummary, 'type' | 'mode'>,
  labels: { baseline: string; replaceAll: string; replaceOpen: string }
): string {
  if (revision.type === 'baseline') return labels.baseline;
  return revision.mode === 'replace_all' ? labels.replaceAll : labels.replaceOpen;
}

function parseCount(summary: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!summary) return null;
  const raw = summary[key];
  return typeof raw === 'number' ? raw : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ScheduleHistoryPanel({ open, onClose, projectId, variant = 'dialog' }: ScheduleHistoryPanelProps) {
  const t = useTranslations('projects');
  const [revisions, setRevisions] = useState<ScheduleRevisionSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ScheduleRevisionDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [baselineNotice, setBaselineNotice] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) || null,
    [revisions, selectedRevisionId]
  );

  const loadList = async (cursor?: string | null) => {
    setLoadingList(true);
    setErrorMessage(null);
    try {
      const query = cursor ? `?limit=20&cursor=${encodeURIComponent(cursor)}` : '?limit=20';
      const response = await fetch(`/api/v1/projects/${projectId}/schedule-revisions${query}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (payload as Record<string, unknown>)?.error as string
          || (payload as Record<string, unknown>)?.message as string
          || 'Failed to fetch schedule revisions'
        );
      }

      const rows = Array.isArray((payload as Record<string, unknown>)?.revisions)
        ? (payload as Record<string, unknown>).revisions as ScheduleRevisionSummary[]
        : [];
      const page = ((payload as Record<string, unknown>)?.page || {}) as { nextCursor?: string | null; hasMore?: boolean };

      setRevisions((current) => (cursor ? [...current, ...rows] : rows));
      setNextCursor(page.nextCursor || null);
      setHasMore(Boolean(page.hasMore));

      if (!cursor && rows.length > 0) {
        setSelectedRevisionId(rows[0].id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch schedule revisions');
    } finally {
      setLoadingList(false);
    }
  };

  const loadRevisionDetail = async (revisionId: string) => {
    setLoadingDetail(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/schedule-revisions/${revisionId}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (payload as Record<string, unknown>)?.error as string
          || (payload as Record<string, unknown>)?.message as string
          || 'Failed to fetch schedule revision detail'
        );
      }

      const revision = ((payload as Record<string, unknown>)?.revision || null) as ScheduleRevisionDetail | null;
      setSelectedDetail(revision);
      if (revision) {
        void trackUXEvent('schedule_revision_viewed', {
          projectId,
          revisionId: revision.id,
          type: revision.type,
          mode: revision.mode,
          source: revision.source,
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch schedule revision detail');
      setSelectedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const bootstrapThenLoad = async () => {
      setBaselineNotice(null);
      setSelectedRevisionId(null);
      setSelectedDetail(null);

      void trackUXEvent('schedule_history_opened', { projectId });

      try {
        const bootstrapResponse = await fetch(`/api/v1/projects/${projectId}/schedule-revisions/bootstrap`, {
          method: 'POST',
        });
        const bootstrapPayload = await bootstrapResponse.json().catch(() => ({}));
        if (!cancelled && bootstrapResponse.ok && (bootstrapPayload as { created?: boolean })?.created) {
          setBaselineNotice(t('schedule_history.baseline_created'));
        }
      } catch (error) {
        console.warn('Failed to bootstrap schedule baseline revision', error);
      }

      if (!cancelled) {
        await loadList(null);
      }
    };

    void bootstrapThenLoad();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!selectedRevisionId || !open) return;
    void loadRevisionDetail(selectedRevisionId);
  }, [open, selectedRevisionId]);

  if (!open) return null;

  const revisionLabels = {
    baseline: t('schedule_history.revision_label_baseline'),
    replaceAll: t('schedule_history.revision_label_replace_all'),
    replaceOpen: t('schedule_history.revision_label_replace_open'),
  };

  const isEmbedded = variant === 'embedded';

  const content = (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('schedule_history.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('schedule_history.subtitle')}</p>
        </div>
        {onClose && !isEmbedded ? (
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : null}
      </header>

      <div className="grid h-[calc(100%-64px)] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] flex-1 min-h-0">
        <section className="border-b border-border lg:border-b-0 lg:border-r flex flex-col">
          {baselineNotice ? (
            <p className="mx-3 mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex-none">
              {baselineNotice}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex-none">{errorMessage}</p>
          ) : null}

          <div className="h-full overflow-y-auto p-3 flex-1">
            {loadingList && revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('schedule_history.loading')}</p>
            ) : null}

            {!loadingList && revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('schedule_history.empty')}</p>
            ) : null}

            <ul className="space-y-2">
              {revisions.map((revision) => {
                const selected = revision.id === selectedRevisionId;
                const summary = revision.summary || null;
                const generated = parseCount(summary, 'generatedTaskCount');
                const replaced = parseCount(summary, 'replacedTaskCount');
                const after = parseCount(summary, 'afterTaskCount');

                return (
                  <li key={revision.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRevisionId(revision.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${selected
                        ? 'border-brand-seedling/60 bg-brand-seedling/10'
                        : 'border-border bg-card hover:bg-secondary'
                        }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{revision.type}</p>
                      <p className="text-sm font-semibold text-foreground">{formatRevisionLabel(revision, revisionLabels)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(revision.createdAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        generated={generated ?? '-'} · replaced={replaced ?? '-'} · after={after ?? '-'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            {hasMore ? (
              <button
                type="button"
                onClick={() => {
                  void loadList(nextCursor);
                }}
                disabled={loadingList || !nextCursor}
                className="mt-3 w-full rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
              >
                {loadingList ? t('schedule_history.loading_more') : t('schedule_history.load_more')}
              </button>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto p-4 flex-1">
          {loadingDetail ? (
            <p className="text-sm text-muted-foreground">{t('schedule_history.loading_detail')}</p>
          ) : null}

          {!loadingDetail && !selectedSummary ? (
            <p className="text-sm text-muted-foreground">{t('schedule_history.empty_detail')}</p>
          ) : null}

          {!loadingDetail && selectedSummary && selectedDetail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t('schedule_history.revision_meta')}</p>
                <p className="text-sm font-semibold text-foreground">{formatRevisionLabel(selectedSummary, revisionLabels)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(selectedSummary.createdAt)}</p>
                {selectedDetail.note ? <p className="mt-2 text-sm text-foreground">{selectedDetail.note}</p> : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t('schedule_history.before_snapshot')}</p>
                  <p className="text-sm font-semibold text-foreground">{t('schedule_history.task_count', { count: selectedDetail.beforeTasksSnapshot?.length || 0 })}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(selectedDetail.beforeTasksSnapshot || []).slice(0, 12).map((task, index) => (
                      <li key={`${task.id || 'before'}-${index}`}>
                        {typeof task.title === 'string' ? task.title : t('schedule_history.untitled_task')}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t('schedule_history.after_snapshot')}</p>
                  <p className="text-sm font-semibold text-foreground">{t('schedule_history.task_count', { count: selectedDetail.afterTasksSnapshot?.length || 0 })}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(selectedDetail.afterTasksSnapshot || []).slice(0, 12).map((task, index) => (
                      <li key={`${task.id || 'after'}-${index}`}>
                        {typeof task.title === 'string' ? task.title : t('schedule_history.untitled_task')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="h-full w-full bg-card flex flex-col rounded-lg border border-border overflow-hidden" data-testid="schedule-history-panel">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-5xl border-l border-border bg-card shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        data-testid="schedule-history-panel"
      >
        {content}
      </aside>
    </div>
  );
}
