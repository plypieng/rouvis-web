'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Activity = {
    id: string;
    type: string;
    qty: number | null;
    unit: string | null;
    note: string | null;
    performedAt: string;
    createdAt: string;
};

export default function ProjectLedgerPanel({ projectId }: { projectId: string }) {
    const t = useTranslations('projects');
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchLedger = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/v1/projects/${projectId}/ledger`);
                if (!res.ok) {
                    throw new Error('Failed to fetch ledger activities');
                }
                const data = await res.json();
                if (mounted) {
                    setActivities(data.activities || []);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void fetchLedger();

        return () => {
            mounted = false;
        };
    }, [projectId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-destructive text-center py-12">
                <p>{error}</p>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No activities found in the ledger.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">{t('tabs.ledger')}</h2>
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="p-4 border border-border rounded-lg bg-card">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground capitalize">
                                {activity.type}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                                {formatDate(activity.performedAt)}
                            </span>
                        </div>

                        {(activity.qty !== null || activity.unit) && (
                            <div className="text-sm text-muted-foreground mb-2">
                                Amount: {activity.qty !== null ? activity.qty : ''} {activity.unit || ''}
                            </div>
                        )}

                        {activity.note && (
                            <p className="text-sm text-foreground bg-secondary/50 p-2 rounded">
                                {activity.note}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
