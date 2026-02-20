'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type AnalyticsData = {
    progress: {
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        cancelledTasks: number;
        completionRate: number;
    };
    timeline: {
        daysUntilHarvest: number | null;
        daysSinceStart: number | null;
        totalProjectDays: number | null;
        startDate: string | null;
        targetHarvestDate: string | null;
    };
    performanceLogs: Array<{
        id: string;
        cropName: string;
        variety: string;
        region: string;
        year: number;
        yield: number;
        rating: number;
        notes: string | null;
    }>;
    activityBreakdown: Record<string, number>;
};

function ProgressRing({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-secondary"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="text-primary transition-all duration-700 ease-out"
            />
        </svg>
    );
}

function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
    return (
        <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
    );
}

export default function ProjectAnalyticsPanel({ projectId }: { projectId: string }) {
    const t = useTranslations('projects');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/v1/projects/${projectId}/analytics`);
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const json = await res.json();
                if (mounted) setData(json);
            } catch (err) {
                if (mounted) setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        void fetchAnalytics();
        return () => { mounted = false; };
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-destructive text-center py-16">
                <p>{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const { progress, timeline, performanceLogs, activityBreakdown } = data;
    const activityTypes = Object.entries(activityBreakdown);
    const totalActivities = activityTypes.reduce((sum, [, count]) => sum + count, 0);

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-semibold text-foreground">{t('tabs.analytics')}</h2>

            {/* Task Completion Section */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    {t('analytics.task_progress')}
                </h3>
                <div className="flex items-center gap-8">
                    <div className="relative flex-shrink-0">
                        <ProgressRing percentage={progress.completionRate} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-foreground">{progress.completionRate}%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        <StatCard label={t('analytics.total_tasks')} value={progress.totalTasks} />
                        <StatCard label={t('analytics.completed')} value={progress.completedTasks} />
                        <StatCard label={t('analytics.pending')} value={progress.pendingTasks} />
                        <StatCard label={t('analytics.cancelled')} value={progress.cancelledTasks} />
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    {t('analytics.timeline')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <StatCard
                        label={t('analytics.days_since_start')}
                        value={timeline.daysSinceStart !== null ? timeline.daysSinceStart : '—'}
                    />
                    <StatCard
                        label={t('analytics.days_until_harvest')}
                        value={timeline.daysUntilHarvest !== null ? timeline.daysUntilHarvest : '—'}
                    />
                    <StatCard
                        label={t('analytics.total_project_days')}
                        value={timeline.totalProjectDays !== null ? timeline.totalProjectDays : '—'}
                    />
                </div>
                {timeline.totalProjectDays && timeline.daysSinceStart !== null && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{t('analytics.season_progress')}</span>
                            <span>{Math.min(100, Math.max(0, Math.round((timeline.daysSinceStart / timeline.totalProjectDays) * 100)))}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5">
                            <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, Math.max(0, (timeline.daysSinceStart / timeline.totalProjectDays) * 100))}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Activity Breakdown */}
            {totalActivities > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                        {t('analytics.activity_breakdown')}
                    </h3>
                    <div className="space-y-3">
                        {activityTypes.map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-foreground capitalize w-28">{type}</span>
                                <div className="flex-1 bg-secondary rounded-full h-3">
                                    <div
                                        className="bg-primary h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${(count / totalActivities) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Yield Performance */}
            {performanceLogs.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                        {t('analytics.yield_history')}
                    </h3>
                    <div className="space-y-3">
                        {performanceLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                <div>
                                    <span className="font-medium text-foreground">{log.year}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        {log.cropName} {log.variety}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-foreground font-semibold">{log.yield} kg</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                        {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state if nothing to show */}
            {progress.totalTasks === 0 && totalActivities === 0 && performanceLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>{t('analytics.empty_state')}</p>
                </div>
            )}
        </div>
    );
}
