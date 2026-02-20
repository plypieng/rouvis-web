'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';

type LedgerEntry = {
    id: string;
    kind: 'activity' | 'task';
    type: string;
    title: string | null;
    description: string | null;
    qty: number | null;
    unit: string | null;
    note: string | null;
    performedAt: string;
    fieldId: string | null;
    fieldName: string | null;
};

type PageInfo = {
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
};

const ACTIVITY_ICONS: Record<string, string> = {
    watering: '💧',
    fertilizer: '🌱',
    harvest: '🌾',
    inspection: '🔍',
    maintenance: '🔧',
    completed_task: '✅',
};

function getActivityIcon(type: string): string {
    return ACTIVITY_ICONS[type] || '📋';
}

export default function ProjectLedgerPanel({ projectId }: { projectId: string }) {
    const t = useTranslations('projects');
    const locale = useLocale();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLedger = useCallback(async (cursor?: string) => {
        const isInitial = !cursor;
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const url = new URL(`/api/v1/projects/${projectId}/ledger`, window.location.origin);
            if (cursor) url.searchParams.set('cursor', cursor);

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error(t('ledger.fetch_error'));

            const data = await res.json();
            if (isInitial) {
                setEntries(data.entries || []);
            } else {
                setEntries((prev) => [...prev, ...(data.entries || [])]);
            }
            setPageInfo(data.page || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('ledger.fetch_error'));
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        void fetchLedger();
    }, [fetchLedger]);

    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }, [locale]);

    const getTypeLabel = useCallback((entry: LedgerEntry): string => {
        if (entry.kind === 'task') return t('ledger.type_completed_task');
        const key = `ledger.type_${entry.type}` as const;
        // Try the translated key, fall back to capitalized raw type
        try {
            return t(key);
        } catch {
            return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
        }
    }, [t]);

    // Skeleton loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-7 w-32 bg-secondary rounded animate-pulse" />
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 border border-border rounded-lg bg-card">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-secondary rounded animate-pulse" />
                                    <div className="h-5 w-24 bg-secondary rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                            </div>
                            <div className="h-4 w-48 bg-secondary rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state with retry
    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <button
                    type="button"
                    onClick={() => void fetchLedger()}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                >
                    {t('ledger.retry')}
                </button>
            </div>
        );
    }

    // Empty state
    if (entries.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>{t('ledger.empty_state')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t('tabs.ledger')}</h2>
                {pageInfo && (
                    <span className="text-xs text-muted-foreground">
                        {t('ledger.total_entries', { count: pageInfo.total })}
                    </span>
                )}
            </div>
            <div className="space-y-3">
                {entries.map((entry) => (
                    <div
                        key={`${entry.kind}-${entry.id}`}
                        className="p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg" role="img" aria-label={entry.type}>
                                    {getActivityIcon(entry.type)}
                                </span>
                                <h3 className="font-semibold text-foreground">
                                    {entry.kind === 'task' && entry.title
                                        ? entry.title
                                        : getTypeLabel(entry)}
                                </h3>
                                {entry.kind === 'task' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                        {t('ledger.badge_task')}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatDate(entry.performedAt)}
                            </span>
                        </div>

                        {entry.fieldName && (
                            <div className="text-xs text-muted-foreground mb-2">
                                📍 {entry.fieldName}
                            </div>
                        )}

                        {(entry.qty !== null || entry.unit) && (
                            <div className="text-sm text-muted-foreground mb-2">
                                {t('ledger.amount_label')}: {entry.qty !== null ? entry.qty : ''} {entry.unit || ''}
                            </div>
                        )}

                        {entry.note && (
                            <p className="text-sm text-foreground bg-secondary/50 p-2 rounded">
                                {entry.note}
                            </p>
                        )}

                        {entry.description && entry.kind === 'task' && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {entry.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Load more pagination */}
            {pageInfo?.hasMore && (
                <div className="text-center py-4">
                    <button
                        type="button"
                        onClick={() => pageInfo.nextCursor && void fetchLedger(pageInfo.nextCursor)}
                        disabled={loadingMore}
                        className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition disabled:opacity-50"
                    >
                        {loadingMore ? t('ledger.loading_more') : t('ledger.load_more')}
                    </button>
                </div>
            )}
        </div>
    );
}
