'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type GeneratedTask = {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
};

type GeneratedWeek = { tasks: GeneratedTask[] };

type GeneratedSchedule = {
    weeks?: GeneratedWeek[];
    pastTasks?: GeneratedWeek[];
    currentWeekTasks?: GeneratedTask[];
    futureTasks?: GeneratedWeek[];
};

type GeneratedScheduleResponse = {
    schedule: GeneratedSchedule;
};

type TaskPayload = {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    status: 'pending' | 'completed';
    isBackfilled?: boolean;
};

type SchedulingPreferences = {
    preferredWorkStartHour: number;
    preferredWorkEndHour: number;
    maxTasksPerDay: number;
    avoidWeekdays: number[];
    riskTolerance: 'conservative' | 'balanced' | 'aggressive';
    irrigationStyle: 'manual' | 'reminder' | 'strict';
    constraintsNote: string;
};

type SchedulingPreferencesInput = Partial<SchedulingPreferences> | null;

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

function normalizePreferences(input?: SchedulingPreferencesInput): SchedulingPreferences {
    const base: SchedulingPreferences = {
        preferredWorkStartHour: 6,
        preferredWorkEndHour: 18,
        maxTasksPerDay: 4,
        avoidWeekdays: [],
        riskTolerance: 'balanced',
        irrigationStyle: 'reminder',
        constraintsNote: '',
    };

    if (!input) return base;

    const startHour = Number.isFinite(input.preferredWorkStartHour)
        ? Math.max(0, Math.min(23, Number(input.preferredWorkStartHour)))
        : base.preferredWorkStartHour;
    const endHourRaw = Number.isFinite(input.preferredWorkEndHour)
        ? Math.max(1, Math.min(24, Number(input.preferredWorkEndHour)))
        : base.preferredWorkEndHour;
    const endHour = endHourRaw <= startHour ? startHour + 1 : endHourRaw;

    return {
        preferredWorkStartHour: startHour,
        preferredWorkEndHour: endHour,
        maxTasksPerDay: Number.isFinite(input.maxTasksPerDay)
            ? Math.max(1, Math.min(12, Number(input.maxTasksPerDay)))
            : base.maxTasksPerDay,
        avoidWeekdays: Array.isArray(input.avoidWeekdays)
            ? [...new Set(input.avoidWeekdays)]
                .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
                .sort((a, b) => a - b)
            : base.avoidWeekdays,
        riskTolerance: input.riskTolerance === 'conservative' || input.riskTolerance === 'aggressive'
            ? input.riskTolerance
            : 'balanced',
        irrigationStyle: input.irrigationStyle === 'manual' || input.irrigationStyle === 'strict'
            ? input.irrigationStyle
            : 'reminder',
        constraintsNote: (input.constraintsNote || '').trim(),
    };
}

function toPreferencePayload(input: SchedulingPreferences): SchedulingPreferences {
    const normalized = normalizePreferences(input);
    return {
        ...normalized,
        constraintsNote: normalized.constraintsNote.slice(0, 300),
    };
}

export default function ProjectAgentOnboarding({
    projectId,
    crop,
    startDate,
    onGenerate,
    initialPreferences,
}: {
    projectId: string;
    crop: string;
    startDate?: string;
    onGenerate?: () => void;
    initialPreferences?: SchedulingPreferencesInput;
}) {
    const t = useTranslations('projects.agent_onboarding');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<SchedulingPreferences>(() => normalizePreferences(initialPreferences));
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const router = useRouter();

    const preferencePayload = useMemo(() => toPreferencePayload(preferences), [preferences]);

    const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
        const payload = await response.json().catch(() => ({}));
        return payload?.error || payload?.message || payload?.details || fallback;
    };

    const savePreferences = async (silent = false): Promise<boolean> => {
        if (!silent) setErrorMessage(null);
        if (!silent) {
            setIsSavingPreferences(true);
            setProgressMessage('⚙️ 設定を保存しています...');
        }

        try {
            const saveRes = await fetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schedulingPreferences: preferencePayload,
                }),
            });

            if (!saveRes.ok) {
                throw new Error(await extractErrorMessage(saveRes, '設定の保存に失敗しました'));
            }

            setLastSavedAt(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
            if (!silent) {
                setProgressMessage('✅ 設定を保存しました');
                setTimeout(() => setProgressMessage(''), 1200);
            }
            return true;
        } catch (error) {
            console.error('Preference save error:', error);
            if (!silent) {
                setProgressMessage('');
                setErrorMessage(error instanceof Error ? error.message : '設定の保存に失敗しました');
            }
            return false;
        } finally {
            if (!silent) {
                setIsSavingPreferences(false);
            }
        }
    };

    const handleToggleAvoidWeekday = (day: number) => {
        setPreferences(prev => {
            const exists = prev.avoidWeekdays.includes(day);
            const nextDays = exists
                ? prev.avoidWeekdays.filter(item => item !== day)
                : [...prev.avoidWeekdays, day].sort((a, b) => a - b);
            return { ...prev, avoidWeekdays: nextDays };
        });
    };

    const handleGenerate = async () => {
        setErrorMessage(null);
        setIsGenerating(true);
        try {
            const saved = await savePreferences(true);
            if (!saved) {
                throw new Error('Failed to persist preferences before generation');
            }

            setProgressMessage('🤖 スケジュール生成を開始します...');

            // 1. Determine which endpoint to use based on start date
            const isBackfilled = startDate && new Date(startDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const endpoint = isBackfilled
                ? '/api/v1/agents/generate-backfilled-schedule'
                : '/api/v1/agents/generate-schedule';

            setProgressMessage(`📊 ${crop}の栽培計画を分析中...`);

            // 2. Generate Schedule
            const genRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isBackfilled ? {
                    projectId,
                    schedulingPreferences: preferencePayload,
                    cropAnalysis: {
                        crop,
                        startDate: startDate || new Date().toISOString().split('T')[0],
                        targetHarvestDate: ''
                    },
                    plantingDate: startDate,
                    currentDate: new Date().toISOString().split('T')[0],
                } : {
                    projectId,
                    schedulingPreferences: preferencePayload,
                    cropAnalysis: {
                        crop,
                        startDate: startDate || new Date().toISOString().split('T')[0],
                        targetHarvestDate: ''
                    },
                    currentDate: new Date().toISOString().split('T')[0],
                }),
            });

            if (!genRes.ok) {
                throw new Error(await extractErrorMessage(genRes, 'スケジュールの生成に失敗しました'));
            }
            const generatedData = await genRes.json();

            setProgressMessage('🌱 タスクを作成中...');

            // 3. Process Tasks
            const scheduleData = (generatedData as GeneratedScheduleResponse).schedule || generatedData;
            const toPayload = (task: GeneratedTask, status: TaskPayload['status'], isBackfilledTask?: boolean): TaskPayload => ({
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                priority: task.priority,
                status,
                ...(isBackfilledTask ? { isBackfilled: true } : {}),
            });

            let tasks: TaskPayload[] = [];
            if (isBackfilled) {
                const pastTasks = (scheduleData.pastTasks || []).flatMap((week) =>
                    (week.tasks || []).map((task) => toPayload(task, 'completed', true))
                );
                const currentTasks = (scheduleData.currentWeekTasks || []).map((task) => toPayload(task, 'pending'));
                const futureTasks = (scheduleData.futureTasks || []).flatMap((week) =>
                    (week.tasks || []).map((task) => toPayload(task, 'pending'))
                );
                tasks = [...pastTasks, ...currentTasks, ...futureTasks];
            } else {
                tasks = (scheduleData.weeks || []).flatMap((week) =>
                    (week.tasks || []).map((task) => toPayload(task, 'pending'))
                );
            }

            if (!tasks.length) {
                throw new Error('AIがタスクを生成できませんでした。条件を調整して再試行してください。');
            }

            setProgressMessage(`💾 ${tasks.length}個のタスクを保存中...`);

            // 4. Save Tasks and Preferences
            const saveRes = await fetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks,
                    schedulingPreferences: preferencePayload,
                }),
            });

            if (!saveRes.ok) {
                throw new Error(await extractErrorMessage(saveRes, 'タスク保存に失敗しました'));
            }

            setProgressMessage('✅ スケジュール生成が完了しました！');

            // 5. Refresh Page
            setTimeout(() => {
                router.refresh();
                if (onGenerate) onGenerate();
            }, 500);

        } catch (error) {
            console.error('Generation error:', error);
            setProgressMessage('');
            setErrorMessage(error instanceof Error ? error.message : 'スケジュールの生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-100 text-center max-w-3xl mx-auto my-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="material-symbols-outlined text-4xl text-blue-600">smart_toy</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t('welcome_title', { crop })}
            </h2>

            <p className="text-gray-600 mb-6 leading-relaxed">
                {t('welcome_message')}
            </p>

            <div className="bg-white/85 backdrop-blur rounded-xl border border-blue-100 p-5 text-left mb-6">
                <h3 className="font-bold text-gray-900 mb-4">初回ドラフト前の作業設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">作業開始時刻</span>
                        <input
                            type="number"
                            min={0}
                            max={23}
                            value={preferences.preferredWorkStartHour}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                preferredWorkStartHour: Number(e.target.value),
                                preferredWorkEndHour: Math.max(Number(e.target.value) + 1, prev.preferredWorkEndHour),
                            }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </label>
                    <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">作業終了時刻</span>
                        <input
                            type="number"
                            min={1}
                            max={24}
                            value={preferences.preferredWorkEndHour}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                preferredWorkEndHour: Math.max(Number(e.target.value), prev.preferredWorkStartHour + 1),
                            }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </label>
                    <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">1日の最大作業数</span>
                        <input
                            type="number"
                            min={1}
                            max={12}
                            value={preferences.maxTasksPerDay}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                maxTasksPerDay: Math.max(1, Math.min(12, Number(e.target.value))),
                            }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">リスク許容度</span>
                        <select
                            value={preferences.riskTolerance}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                riskTolerance: e.target.value as SchedulingPreferences['riskTolerance'],
                            }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="conservative">慎重</option>
                            <option value="balanced">標準</option>
                            <option value="aggressive">積極</option>
                        </select>
                    </label>
                    <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">灌水スタイル</span>
                        <select
                            value={preferences.irrigationStyle}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                irrigationStyle: e.target.value as SchedulingPreferences['irrigationStyle'],
                            }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="manual">手動判断</option>
                            <option value="reminder">リマインダー重視</option>
                            <option value="strict">厳密運用</option>
                        </select>
                    </label>
                </div>

                <div className="mb-4">
                    <span className="block mb-2 text-sm font-medium text-gray-700">避けたい曜日</span>
                    <div className="flex flex-wrap gap-2">
                        {weekdayLabels.map((label, day) => {
                            const selected = preferences.avoidWeekdays.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleToggleAvoidWeekday(day)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                                        selected
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">補足条件</span>
                    <textarea
                        rows={3}
                        value={preferences.constraintsNote}
                        onChange={(e) => setPreferences(prev => ({ ...prev, constraintsNote: e.target.value }))}
                        placeholder="例: 雨天翌日は重作業を避けたい、午前中中心にしたい"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        maxLength={300}
                    />
                </label>
            </div>

            {/* Progress Message */}
            {progressMessage && (
                <div className="mb-6 p-4 bg-white/80 backdrop-blur rounded-lg border border-blue-200 text-sm text-gray-700 font-medium animate-pulse">
                    {progressMessage}
                </div>
            )}

            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
                    <div className="flex items-center justify-between gap-3">
                        <span>{errorMessage}</span>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || isSavingPreferences}
                            className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
                        >
                            再試行
                        </button>
                    </div>
                </div>
            )}

            {lastSavedAt && (
                <p className="text-xs text-gray-500 mb-4">最終保存: {lastSavedAt}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={() => savePreferences(false)}
                    disabled={isGenerating || isSavingPreferences}
                    className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined">save</span>
                    設定だけ保存
                </button>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || isSavingPreferences}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-bold disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            {t('generating')}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">auto_awesome</span>
                            初回ドラフトを生成
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
