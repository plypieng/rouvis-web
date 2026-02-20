'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import ScheduleHistoryPanel from '@/components/projects/ScheduleHistoryPanel';

type ProjectSchedulingPreferences = {
    preferredWorkStartHour?: number;
    preferredWorkEndHour?: number;
    maxTasksPerDay?: number;
    avoidWeekdays?: number[];
    riskTolerance?: 'conservative' | 'balanced' | 'aggressive';
    irrigationStyle?: 'manual' | 'reminder' | 'strict';
    constraintsNote?: string;
} | null;

type SettingsProject = {
    id: string;
    name: string;
    crop: string;
    variety?: string;
    startDate: string;
    targetHarvestDate?: string;
    status: string;
    notes?: string;
    primaryFieldId?: string | null;
    schedulingPreferences?: ProjectSchedulingPreferences;
};

interface ProjectSettingsPanelProps {
    project: SettingsProject;
    onEditProject: () => void;
    onArchiveProject?: () => void;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">{title}</h3>
            {children}
        </div>
    );
}

function SettingsRow({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <div className="text-sm text-muted-foreground mt-0.5">{value}</div>
            </div>
            {action && <div className="flex-shrink-0 ml-4">{action}</div>}
        </div>
    );
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function ProjectSettingsPanel({ project, onEditProject, onArchiveProject }: ProjectSettingsPanelProps) {
    const t = useTranslations('projects');
    const locale = useLocale();
    const [showScheduleHistory, setShowScheduleHistory] = useState(false);

    const prefs = project.schedulingPreferences;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    const formatHour = (hour: number) => {
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    const getRiskLabel = (risk: string) => {
        const key = `settings.risk_${risk}` as const;
        try { return t(key); } catch { return risk; }
    };

    const getIrrigationLabel = (style: string) => {
        const key = `settings.irrigation_${style}` as const;
        try { return t(key); } catch { return style; }
    };

    const getStatusLabel = (status: string) => {
        const key = `settings.status_${status}` as const;
        try { return t(key); } catch { return status; }
    };

    const statusColor: Record<string, string> = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'on-hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t('tabs.settings')}</h2>
                <button
                    type="button"
                    onClick={onEditProject}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                >
                    {t('edit')}
                </button>
            </div>

            {/* Section 1: Project Information */}
            <SettingsSection title={t('settings.project_info')}>
                <SettingsRow
                    label={t('project_name')}
                    value={project.name}
                />
                <SettingsRow
                    label={t('crop')}
                    value={`${project.crop}${project.variety ? ` — ${project.variety}` : ''}`}
                />
                <SettingsRow
                    label={t('settings.start_date')}
                    value={formatDate(project.startDate)}
                />
                <SettingsRow
                    label={t('target_harvest_date')}
                    value={project.targetHarvestDate ? formatDate(project.targetHarvestDate) : '—'}
                />
                <SettingsRow
                    label={t('settings.status')}
                    value={
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[project.status] || statusColor.active}`}>
                            {getStatusLabel(project.status)}
                        </span>
                    }
                />
                {project.notes && (
                    <SettingsRow
                        label={t('notes')}
                        value={<span className="whitespace-pre-wrap">{project.notes}</span>}
                    />
                )}
            </SettingsSection>

            {/* Section 2: AI Scheduling Preferences */}
            <SettingsSection title={t('settings.scheduling_prefs')}>
                {prefs ? (
                    <>
                        {(prefs.preferredWorkStartHour !== undefined || prefs.preferredWorkEndHour !== undefined) && (
                            <SettingsRow
                                label={t('settings.work_hours')}
                                value={`${formatHour(prefs.preferredWorkStartHour ?? 6)} – ${formatHour(prefs.preferredWorkEndHour ?? 18)}`}
                            />
                        )}
                        {prefs.maxTasksPerDay !== undefined && (
                            <SettingsRow
                                label={t('settings.max_tasks_per_day')}
                                value={prefs.maxTasksPerDay}
                            />
                        )}
                        {prefs.riskTolerance && (
                            <SettingsRow
                                label={t('settings.risk_tolerance')}
                                value={getRiskLabel(prefs.riskTolerance)}
                            />
                        )}
                        {prefs.irrigationStyle && (
                            <SettingsRow
                                label={t('settings.irrigation_style')}
                                value={getIrrigationLabel(prefs.irrigationStyle)}
                            />
                        )}
                        {prefs.avoidWeekdays && prefs.avoidWeekdays.length > 0 && (
                            <SettingsRow
                                label={t('settings.avoid_weekdays')}
                                value={prefs.avoidWeekdays
                                    .map((d) => t(`calendar.weekday_${WEEKDAY_KEYS[d]}`))
                                    .join(', ')}
                            />
                        )}
                        {prefs.constraintsNote && (
                            <SettingsRow
                                label={t('settings.constraints_note')}
                                value={<span className="whitespace-pre-wrap">{prefs.constraintsNote}</span>}
                            />
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground py-2">{t('settings.no_scheduling_prefs')}</p>
                )}
            </SettingsSection>

            {/* Section 3: Schedule Revision History (collapsed by default) */}
            <SettingsSection title={t('settings.schedule_history')}>
                {showScheduleHistory ? (
                    <div className="mt-2">
                        <ScheduleHistoryPanel
                            open={true}
                            projectId={project.id}
                            variant="embedded"
                        />
                        <button
                            type="button"
                            onClick={() => setShowScheduleHistory(false)}
                            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition"
                        >
                            {t('settings.hide_schedule_history')}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowScheduleHistory(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition"
                    >
                        {t('settings.show_schedule_history')}
                    </button>
                )}
            </SettingsSection>

            {/* Section 4: Danger Zone */}
            <div className="bg-card border border-destructive/30 rounded-xl p-6">
                <h3 className="text-sm font-medium text-destructive uppercase tracking-wide mb-4">
                    {t('settings.danger_zone')}
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">{t('settings.archive_project')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('settings.archive_description')}</p>
                    </div>
                    {onArchiveProject && (
                        <button
                            type="button"
                            onClick={onArchiveProject}
                            className="px-4 py-2 text-sm font-medium border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 transition"
                        >
                            {t('archive')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
