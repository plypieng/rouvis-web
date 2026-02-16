'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import CropAnalysisCard from './CropAnalysisCard';
import FieldSelector from './FieldSelector';
import ProjectTypeSelector from './ProjectTypeSelector';
import PlantingHistoryInput from './PlantingHistoryInput';
import AIProcessingOverlay from './AIProcessingOverlay';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/feedback';
import { buildStarterTasks } from '@/lib/starter-tasks';
import { trackUXEvent } from '@/lib/analytics';

type WizardStep = 'project-type' | 'selection' | 'crop-analysis' | 'planting-history' | 'field-context';

type CropAnalysis = {
    crop: string;
    variety?: string;
    startDate: string;
    targetHarvestDate: string;
    notes?: string;
    daysToHarvest?: number;
    knowledge?: unknown;
};

type GeneratedTask = {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
};

type GeneratedWeek = { tasks?: GeneratedTask[] };

type GeneratedSchedule = {
    weeks?: GeneratedWeek[];
    pastTasks?: GeneratedWeek[];
    currentWeekTasks?: GeneratedTask[];
    futureTasks?: GeneratedWeek[];
};

type TaskPayload = {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    fieldId: string;
    status: 'pending' | 'completed';
    isBackfilled?: boolean;
    isAssumed?: boolean;
};

type PersistedTask = {
    id: string;
    title: string;
    dueDate?: string;
    status: 'pending' | 'completed';
};

type NoticeState = {
    type: 'info' | 'success' | 'error';
    message: string;
} | null;

type ApiErrorPayload = {
    code?: string;
    message?: string;
    error?: string;
    details?: unknown;
};

type ParsedApiError = {
    message: string;
    code?: string;
    upgradeHint?: string;
};

type PreferenceTemplate = {
    id: string;
    label: string;
    description: string;
    preferences: Record<string, unknown>;
};

type PreferenceTemplateCatalog = {
    templates?: PreferenceTemplate[];
    recommendedTemplate?: string;
};

const FALLBACK_TEMPLATE_ID = 'balanced-new-farmer';

// Visual step progress indicator
const WIZARD_STEPS = [
    { key: 'project-type', label: '種類', icon: '📋' },
    { key: 'selection', label: '作物', icon: '🌱' },
    { key: 'crop-analysis', label: '分析', icon: '🔍' },
    { key: 'field-context', label: '作成', icon: '🚀' },
] as const;

function WizardProgress({ currentStep, showPlantingHistory }: { currentStep: WizardStep; showPlantingHistory?: boolean }) {
    const steps = showPlantingHistory
        ? [...WIZARD_STEPS.slice(0, 3), { key: 'planting-history' as const, label: '植付け', icon: '📅' }, WIZARD_STEPS[3]]
        : [...WIZARD_STEPS];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between relative">
                {/* Connecting line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-border/70" />
                <div
                    className="absolute top-4 left-0 h-0.5 bg-brand-seedling transition-all duration-500"
                    style={{ width: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%` }}
                />

                {steps.map((step, i) => {
                    const isDone = i < currentIndex;
                    const isCurrent = i === currentIndex;
                    return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isDone
                                    ? 'bg-brand-seedling text-primary-foreground'
                                    : isCurrent
                                        ? 'bg-brand-seedling/15 text-foreground ring-2 ring-brand-seedling/50'
                                        : 'bg-secondary text-muted-foreground'
                                    }`}
                            >
                                {isDone ? '✓' : step.icon}
                            </div>
                            <span
                                className={`text-xs mt-1 font-medium ${isCurrent ? 'text-foreground' : isDone ? 'text-brand-seedling' : 'text-muted-foreground'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function noticeClassName(type: NonNullable<NoticeState>['type']): string {
    if (type === 'error') return 'status-critical';
    if (type === 'success') return 'status-safe';
    return 'status-watch';
}

export default function ProjectWizard({ locale }: { locale: string }) {
    const t = useTranslations('projects.create.wizard');
    const router = useRouter();
    const { update } = useSession();

    const [step, setStep] = useState<WizardStep>('project-type');
    const [cropAnalysis, setCropAnalysis] = useState<CropAnalysis | null>(null);
    const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
    const [primaryFieldId, setPrimaryFieldId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMode, setLoadingMode] = useState<'scan' | 'manual' | null>(null);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [preferenceTemplates, setPreferenceTemplates] = useState<PreferenceTemplate[]>([]);
    const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(FALLBACK_TEMPLATE_ID);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(FALLBACK_TEMPLATE_ID);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState<string | null>(null);

    // State for new workflow
    const [projectType, setProjectType] = useState<'new' | 'existing' | null>(null);
    const [plantingDate, setPlantingDate] = useState<string | null>(null);

    const extractApiError = async (response: Response, fallback: string): Promise<ParsedApiError> => {
        const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
        const details = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
            ? payload.details as Record<string, unknown>
            : null;
        const upgradeHint = typeof details?.upgradeHint === 'string' ? details.upgradeHint : undefined;
        const code = typeof payload.code === 'string' ? payload.code : undefined;
        const defaultMessage = code === 'ENTITLEMENT_REQUIRED'
            ? upgradeHint || payload.message || payload.error || fallback
            : payload.error || payload.message || (typeof payload.details === 'string' ? payload.details : fallback);

        return {
            message: defaultMessage,
            code,
            upgradeHint,
        };
    };

    const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
        const parsed = await extractApiError(response, fallback);
        return parsed.message;
    };

    const applyTemplateCatalog = (catalog: PreferenceTemplateCatalog): void => {
        const templates = Array.isArray(catalog.templates) ? catalog.templates : [];
        const recommendedTemplate = typeof catalog.recommendedTemplate === 'string'
            ? catalog.recommendedTemplate
            : null;
        setRecommendedTemplateId(recommendedTemplate);
        if (templates.length === 0) return;

        setPreferenceTemplates(templates);
        setSelectedTemplateId((current) => {
            if (templates.some((template) => template.id === current)) return current;
            if (recommendedTemplate && templates.some((template) => template.id === recommendedTemplate)) {
                return recommendedTemplate;
            }
            return templates[0].id;
        });
    };

    useEffect(() => {
        let cancelled = false;

        const fetchTemplateCatalog = async () => {
            setTemplatesLoading(true);
            setTemplatesError(null);
            try {
                const response = await fetch('/api/v1/projects/preference-templates');
                const payload = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        payload?.error
                        || payload?.message
                        || '設定テンプレートの取得に失敗しました'
                    );
                }

                if (!cancelled) {
                    applyTemplateCatalog(payload as PreferenceTemplateCatalog);
                }
            } catch (error) {
                console.error('Failed to fetch preference templates:', error);
                if (!cancelled) {
                    setTemplatesError(
                        error instanceof Error
                            ? error.message
                            : '設定テンプレートの取得に失敗しました'
                    );
                    setPreferenceTemplates([]);
                    setRecommendedTemplateId(FALLBACK_TEMPLATE_ID);
                    setSelectedTemplateId(FALLBACK_TEMPLATE_ID);
                }
            } finally {
                if (!cancelled) {
                    setTemplatesLoading(false);
                }
            }
        };

        fetchTemplateCatalog();
        return () => {
            cancelled = true;
        };
    }, []);

    const toTaskPayload = (
        task: GeneratedTask,
        fieldId: string,
        status: TaskPayload['status'],
        isBackfilledTask?: boolean
    ): TaskPayload => ({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        fieldId,
        status,
        ...(isBackfilledTask ? { isBackfilled: true } : {}),
    });

    const buildTaskPayloads = (schedule: GeneratedSchedule, isBackfilled: boolean, fieldId: string): TaskPayload[] => {
        if (isBackfilled) {
            const pastTasks = (schedule.pastTasks || []).flatMap((week) =>
                (week.tasks || []).map((task) => toTaskPayload(task, fieldId, 'completed', true))
            );
            const currentTasks = (schedule.currentWeekTasks || []).map((task) => toTaskPayload(task, fieldId, 'pending'));
            const futureTasks = (schedule.futureTasks || []).flatMap((week) =>
                (week.tasks || []).map((task) => toTaskPayload(task, fieldId, 'pending'))
            );
            return [...pastTasks, ...currentTasks, ...futureTasks];
        }

        return (schedule.weeks || []).flatMap((week) =>
            (week.tasks || []).map((task) => toTaskPayload(task, fieldId, 'pending'))
        );
    };

    const persistGeneratedTasks = async (projectId: string, tasks: TaskPayload[]): Promise<PersistedTask[]> => {
        const selectedTemplatePreferences = preferenceTemplates.find(
            (template) => template.id === selectedTemplateId
        )?.preferences;
        const saveResponse = await fetch(`/api/v1/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tasks,
                ...(selectedTemplatePreferences ? { schedulingPreferences: selectedTemplatePreferences } : {}),
            }),
        });

        if (!saveResponse.ok) {
            throw new Error(await extractErrorMessage(saveResponse, '生成したタスクの保存に失敗しました'));
        }

        const payload = await saveResponse.json().catch(() => ({}));
        const persistedTasks = Array.isArray(payload?.project?.tasks)
            ? (payload.project.tasks as Array<{ id?: string; title?: string; dueDate?: string; status?: string }>)
            : [];

        return persistedTasks
            .filter((task): task is { id: string; title: string; dueDate?: string; status: string } => Boolean(task?.id && task?.title))
            .map((task) => ({
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                status: task.status === 'completed' ? 'completed' : 'pending',
            }));
    };

    const generateAndPersistInitialSchedule = async (
        projectId: string,
        defaultFieldId: string
    ): Promise<{ taskCount: number; usedFallback: boolean; firstPendingTaskId: string | null }> => {
        if (!cropAnalysis) throw new Error('作物情報が見つかりません');

        const isBackfilled = projectType === 'existing' && !!plantingDate;
        const effectivePlantingDate = plantingDate || new Date().toISOString().split('T')[0];
        const endpoint = isBackfilled
            ? '/api/v1/agents/generate-backfilled-schedule'
            : '/api/v1/agents/generate-schedule';
        const preferenceTemplate = selectedTemplateId || FALLBACK_TEMPLATE_ID;
        let usedFallback = false;
        let tasks: TaskPayload[] = [];

        try {
            const scheduleResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    isBackfilled
                        ? {
                            projectId,
                            preferenceTemplate,
                            cropAnalysis: {
                                crop: cropAnalysis.crop,
                                variety: cropAnalysis.variety,
                                startDate: effectivePlantingDate,
                                targetHarvestDate: cropAnalysis.targetHarvestDate || '',
                                notes: cropAnalysis.notes,
                            },
                            plantingDate: effectivePlantingDate,
                            currentDate: new Date().toISOString().split('T')[0],
                        }
                        : {
                            projectId,
                            preferenceTemplate,
                            cropAnalysis: {
                                crop: cropAnalysis.crop,
                                variety: cropAnalysis.variety,
                                startDate: cropAnalysis.startDate || new Date().toISOString().split('T')[0],
                                targetHarvestDate: cropAnalysis.targetHarvestDate || '',
                                notes: cropAnalysis.notes,
                            },
                            currentDate: new Date().toISOString().split('T')[0],
                        }
                ),
            });

            const generatedData = await scheduleResponse.json().catch(() => ({}));
            if (!scheduleResponse.ok) {
                if (
                    scheduleResponse.status === 409
                    && (generatedData as Record<string, unknown>)?.error === 'SCHEDULING_PREFERENCES_REQUIRED'
                ) {
                    applyTemplateCatalog(generatedData as PreferenceTemplateCatalog);
                }

                throw new Error(
                    ((generatedData as Record<string, unknown>)?.error as string)
                    || ((generatedData as Record<string, unknown>)?.message as string)
                    || ((generatedData as Record<string, unknown>)?.details as string)
                    || '初回スケジュールの生成に失敗しました'
                );
            }

            const schedule: GeneratedSchedule = generatedData?.schedule || generatedData;
            tasks = buildTaskPayloads(schedule, isBackfilled, defaultFieldId);
            if (!tasks.length) {
                throw new Error('初回スケジュールにタスクが含まれていませんでした');
            }
        } catch (generationError) {
            console.warn('Schedule generation failed. Falling back to starter tasks.', generationError);
            usedFallback = true;
            tasks = buildStarterTasks({
                crop: cropAnalysis.crop,
                startDate: effectivePlantingDate,
                isBackfilled,
            }).map((task) => ({
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                priority: task.priority,
                fieldId: defaultFieldId,
                status: task.status,
                isBackfilled: task.isBackfilled,
                isAssumed: task.isAssumed,
            }));
        }

        if (!tasks.length) {
            throw new Error('初回タスクの作成に失敗しました');
        }

        const persistedTasks = await persistGeneratedTasks(projectId, tasks);
        const firstPendingTask = persistedTasks
            .filter((task) => task.status === 'pending')
            .sort((left, right) => {
                const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
                const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
                return leftTime - rightTime;
            })[0];

        return {
            taskCount: tasks.length,
            usedFallback,
            firstPendingTaskId: firstPendingTask?.id ?? null,
        };
    };

    // Step 0: Project Type Selection (FIRST STEP)
    if (step === 'project-type') {
        return (
            <div className="space-y-6">
                <WizardProgress currentStep={step} />
                <ProjectTypeSelector onSelect={(type) => {
                    setNotice(null);
                    setCreatedProjectId(null);
                    setProjectType(type);
                    setStep('selection'); // Move to crop selection
                }} />
            </div>
        );
    }

    // Step 1: Selection (Scan or Manual) - Modified to handle flow
    const handleScanImage = async (file: File) => {
        setNotice(null);
        setLoading(true);
        setLoadingMode('scan');
        const reader = new FileReader();

        reader.onloadend = async () => {
            try {
                // 1. First get recommendation/analysis from image
                const res = await fetch('/api/v1/agents/recommend', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: reader.result }),
                });

                if (!res.ok) {
                    throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
                }

                if (res.ok) {
                    const data = await res.json() as CropAnalysis;

                    // Extract variety if available, otherwise empty string
                    const variety = data.variety || "";
                    const region = "Niigata"; // Default for now, could be dynamic later

                    // 2. Then fetch/research knowledge base for this crop
                    const knowledgeRes = await fetch(`/api/v1/knowledge/crops?crop=${encodeURIComponent(data.crop)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`, {
                        credentials: 'include',
                    });
                    if (knowledgeRes.ok) {
                        const knowledgeData = await knowledgeRes.json();
                        // Merge knowledge into analysis
                        setCropAnalysis({ ...data, knowledge: knowledgeData.knowledge });
                    } else {
                        setCropAnalysis(data);
                    }

                    setStep('crop-analysis');
                }
            } catch (error) {
                console.error('Scan error:', error);
                const message = `画像の読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`;
                setNotice({
                    type: 'error',
                    message,
                });
                toastError(message);
            } finally {
                setLoading(false);
                setLoadingMode(null);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleManualCropInput = async (cropName: string) => {
        if (!cropName) return;
        setNotice(null);
        setLoading(true);
        setLoadingMode('manual');

        try {
            const variety = ""; // Manual entry doesn't have variety yet
            const region = "Niigata";

            // 1. Fetch/Research Knowledge Base first
            const knowledgeRes = await fetch(`/api/v1/knowledge/crops?crop=${encodeURIComponent(cropName)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`, {
                credentials: 'include',
            });
            let knowledge = null;

            if (knowledgeRes.ok) {
                const kData = await knowledgeRes.json();
                knowledge = kData.knowledge;
            }

            // 2. Get standard recommendation (using knowledge if available to improve result)
            const res = await fetch('/api/v1/agents/recommend', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop: cropName, knowledge }),
            });

            if (!res.ok) {
                throw new Error(await extractErrorMessage(res, '作物分析に失敗しました'));
            }

            const data = await res.json() as CropAnalysis;
            setCropAnalysis({ ...data, knowledge });
            setStep('crop-analysis');
        } catch (error) {
            console.error('Analysis error:', error);
            const message = error instanceof Error ? error.message : '作物分析に失敗しました';
            setNotice({
                type: 'error',
                message,
            });
            toastError(message, {
                label: '再試行',
                onClick: () => {
                    void handleManualCropInput(cropName);
                },
            });
        } finally {
            setLoading(false);
            setLoadingMode(null);
        }
    };

    // Step 2: Crop Analysis Review -> Field Context OR Planting History
    const handleProceedFromAnalysis = () => {
        if (!cropAnalysis) return;
        setNotice(null);
        if (projectType === 'existing') {
            setStep('planting-history');
        } else {
            setStep('field-context');
        }
    };

    // Step 2.5: Planting History (For Existing Projects)
    const handlePlantingHistoryComplete = (data: { plantingDate: string }) => {
        setNotice(null);
        setPlantingDate(data.plantingDate);
        setStep('field-context');
    };

    // Step 3: Field Context -> Create Project (Directly)
    const handleCreateProject = async () => {
        if (!cropAnalysis) return;
        if (!selectedFieldIds.length || !primaryFieldId) {
            const message = '圃場を1つ以上選択し、Primary圃場を設定してください。';
            setNotice({
                type: 'error',
                message,
            });
            toastError(message);
            return;
        }
        setNotice(null);
        setLoading(true);

        try {
            let projectId = createdProjectId;

            if (!projectId) {
                setNotice({ type: 'info', message: 'プロジェクトを作成しています...' });
                toastInfo('プロジェクトを作成しています...');
                const payload = {
                    name: `${cropAnalysis.crop} ${new Date().getFullYear()}`,
                    crop: cropAnalysis.crop,
                    variety: cropAnalysis.variety,
                    startDate: plantingDate || new Date().toISOString().split('T')[0],
                    fieldIds: selectedFieldIds,
                    primaryFieldId,
                    fieldId: primaryFieldId,
                    notes: cropAnalysis.notes,
                    tasks: [],
                    schedulingPreferences: preferenceTemplates.find(
                        (template) => template.id === selectedTemplateId
                    )?.preferences,
                };
                console.log('Creating project with payload:', payload);

                // Use local API proxy to handle cross-origin auth
                const createResponse = await fetch('/api/v1/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!createResponse.ok) {
                    const parsedError = await extractApiError(createResponse, 'プロジェクトの作成に失敗しました');
                    const error = new Error(parsedError.message) as Error & {
                        apiCode?: string;
                        upgradeHint?: string;
                    };
                    error.apiCode = parsedError.code;
                    error.upgradeHint = parsedError.upgradeHint;
                    throw error;
                }

                const { project } = await createResponse.json();
                projectId = project?.id;
                if (!projectId) {
                    throw new Error('プロジェクトIDを取得できませんでした');
                }
                setCreatedProjectId(projectId);
                void trackUXEvent('project_created', {
                    projectId,
                    flow: 'wizard',
                    projectType: projectType || 'new',
                    hasField: selectedFieldIds.length > 0,
                });
            }

            setNotice({ type: 'info', message: 'AIが初回スケジュールを作成しています...' });
            toastInfo('AIが初回スケジュールを作成しています...');
            const { taskCount, usedFallback, firstPendingTaskId } = await generateAndPersistInitialSchedule(projectId, primaryFieldId);
            void trackUXEvent('schedule_generated', {
                projectId,
                flow: 'wizard',
                taskCount,
                usedFallback,
                projectType: projectType || 'new',
            });
            if (usedFallback) {
                const fallbackMessage = `AI生成が不安定だったため、スタータータスクを作成しました（${taskCount}件）`;
                setNotice({ type: 'info', message: fallbackMessage });
                toastWarning(fallbackMessage);
                void trackUXEvent('schedule_generation_fallback_used', {
                    flow: 'wizard',
                    taskCount,
                });
            } else {
                const successMessage = `初回スケジュールを作成しました（${taskCount}件）`;
                setNotice({ type: 'success', message: successMessage });
                toastSuccess(successMessage);
            }

            // Refresh session so onboarding guard sees the new project immediately.
            try {
                await update();
            } catch (error) {
                console.warn('Session update failed after project creation:', error);
            }
            router.refresh(); // Ensure list is updated
            const activationParams = new URLSearchParams({
                activation: '1',
                projectId,
            });
            if (firstPendingTaskId) {
                activationParams.set('taskId', firstPendingTaskId);
            }

            void trackUXEvent('activation_flow_redirected', {
                destination: 'dashboard',
                hasFirstTask: Boolean(firstPendingTaskId),
            });
            router.push(`/${locale}?${activationParams.toString()}`);
        } catch (error) {
            console.error('Project creation error:', error);
            const apiCode = typeof error === 'object'
                && error !== null
                && 'apiCode' in error
                && typeof (error as { apiCode?: unknown }).apiCode === 'string'
                ? (error as { apiCode: string }).apiCode
                : undefined;
            const upgradeHint = typeof error === 'object'
                && error !== null
                && 'upgradeHint' in error
                && typeof (error as { upgradeHint?: unknown }).upgradeHint === 'string'
                ? (error as { upgradeHint: string }).upgradeHint
                : undefined;
            const isUpgradeRequired = apiCode === 'ENTITLEMENT_REQUIRED';
            const message = error instanceof Error
                ? error.message
                : 'プロジェクトまたは初回スケジュールの作成に失敗しました';
            setNotice({
                type: 'error',
                message,
            });
            void trackUXEvent('project_setup_failed', {
                flow: 'wizard',
                step: 'create_or_schedule',
            });
            toastError(message, {
                label: isUpgradeRequired ? 'プランを確認' : '再試行',
                onClick: () => {
                    if (isUpgradeRequired) {
                        router.push(`/${locale}/account`);
                        return;
                    }
                    void handleCreateProject();
                },
            });
            if (isUpgradeRequired && upgradeHint && upgradeHint !== message) {
                toastInfo(upgradeHint);
            }
        } finally {
            setLoading(false);
        }
    };

    // Render based on step
    if (step === 'selection') {
        return (
            <div className="space-y-6 relative min-h-[400px]">
                <WizardProgress currentStep={step} showPlantingHistory={projectType === 'existing'} />
                {loading && loadingMode && (
                    <AIProcessingOverlay mode={loadingMode} />
                )}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setStep('project-type')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        戻る
                    </button>
                    <h2 className="flex-1 text-center text-xl font-semibold text-foreground">{t('title')}</h2>
                </div>

                {notice && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${noticeClassName(notice.type)}`}>
                        {notice.message}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Scan Option */}
                    <div className="surface-base p-8 transition hover:border-brand-seedling/60 hover:bg-secondary/40">
                        <div className="flex flex-col items-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                                <span className="material-symbols-outlined text-3xl text-brand-seedling">qr_code_scanner</span>
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">{t('scan_seed_bag')}</h3>
                            <p className="mb-4 text-center text-sm text-muted-foreground">{t('scan_description')}</p>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleScanImage(e.target.files[0])}
                                className="hidden"
                                id="seed-bag-input"
                            />
                            <label
                                htmlFor="seed-bag-input"
                                className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                            >
                                {loading ? '解析中...' : '写真を選択'}
                            </label>
                        </div>
                    </div>

                    {/* Manual Option */}
                    <div className="surface-base p-8 transition hover:border-border/90 hover:bg-secondary/25">
                        <div className="flex flex-col items-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                                <span className="material-symbols-outlined text-3xl text-foreground/70">edit_note</span>
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">{t('manual_entry')}</h3>
                            <p className="mb-4 text-center text-sm text-muted-foreground">{t('manual_description')}</p>

                            <div className="w-full">
                                <input
                                    type="text"
                                    placeholder="例: コシヒカリ"
                                    className="control-inset mb-2 w-full px-4 py-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleManualCropInput((e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.querySelector('input[placeholder="例: コシヒカリ"]') as HTMLInputElement;
                                        handleManualCropInput(input?.value || '');
                                    }}
                                    disabled={loading}
                                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                                >
                                    {loading ? '解析中...' : '次へ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!cropAnalysis) {
        return (
            <div className="text-sm text-muted-foreground">
                作物情報を読み込めませんでした。最初からやり直してください。
            </div>
        );
    }

    if (step === 'crop-analysis') {
        return (
            <div className="space-y-6">
                <WizardProgress currentStep={step} showPlantingHistory={projectType === 'existing'} />
                {notice && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${noticeClassName(notice.type)}`}>
                        {notice.message}
                    </div>
                )}
                <CropAnalysisCard analysis={cropAnalysis} />
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setStep('selection')}
                        className="rounded-lg px-6 py-2 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                        戻る
                    </button>
                    <button
                        onClick={handleProceedFromAnalysis}
                        className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
                    >
                        {projectType === 'existing' ? '次へ：植付け時期' : '次へ：圃場を選択'}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'planting-history') {
        return (
            <div className="space-y-6">
                <WizardProgress currentStep={step} showPlantingHistory={true} />
                {notice && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${noticeClassName(notice.type)}`}>
                        {notice.message}
                    </div>
                )}
                <PlantingHistoryInput
                    crop={cropAnalysis.crop}
                    onComplete={handlePlantingHistoryComplete}
                />
                <div className="flex justify-start">
                    <button
                        onClick={() => setStep('crop-analysis')}
                        className="rounded-lg px-6 py-2 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'field-context') {
        return (
            <div className="space-y-6">
                <WizardProgress currentStep={step} showPlantingHistory={projectType === 'existing'} />
                {notice && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${noticeClassName(notice.type)}`}>
                        <div className="flex items-center justify-between gap-3">
                            <span>{notice.message}</span>
                            {notice.type === 'error' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={loading}
                                        className="rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:bg-white/50 disabled:opacity-50"
                                    >
                                        再試行
                                    </button>
                                    {createdProjectId && (
                                        <button
                                            onClick={() => router.push(`/${locale}/projects/${createdProjectId}`)}
                                            className="rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:bg-white/50"
                                        >
                                            プロジェクトを開く
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <CropAnalysisCard analysis={cropAnalysis} />
                <div className="surface-base p-4">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-foreground">初回ドラフトの作業スタイル</h3>
                        <p className="text-xs text-muted-foreground">
                            テンプレートを選ぶと、最初のスケジュールの優先度と作業量が調整されます。
                        </p>
                    </div>
                    {templatesLoading && (
                        <p className="text-xs text-muted-foreground">テンプレートを読み込み中...</p>
                    )}
                    {!templatesLoading && templatesError && (
                        <p className="text-xs text-orange-700 dark:text-orange-200">
                            {templatesError} 標準テンプレートで続行します。
                        </p>
                    )}
                    {!templatesLoading && preferenceTemplates.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            {preferenceTemplates.map((template) => {
                                const selected = template.id === selectedTemplateId;
                                const recommended = template.id === recommendedTemplateId;
                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        className={`rounded-lg border px-3 py-3 text-left transition ${selected
                                            ? 'border-brand-seedling/70 bg-secondary/30'
                                            : 'border-border bg-card hover:border-brand-seedling/50'
                                            }`}
                                    >
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {template.label}
                                            </span>
                                            {recommended && (
                                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                                    推奨
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{template.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <FieldSelector
                    value={{
                        fieldIds: selectedFieldIds,
                        primaryFieldId,
                    }}
                    onChange={(scope) => {
                        setSelectedFieldIds(scope.fieldIds);
                        setPrimaryFieldId(scope.primaryFieldId);
                    }}
                />
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setStep(projectType === 'existing' ? 'planting-history' : 'crop-analysis')}
                        className="rounded-lg px-6 py-2 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                        戻る
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={loading || templatesLoading || !selectedFieldIds.length || !primaryFieldId}
                        className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                        {loading
                            ? '作成中...'
                            : templatesLoading
                                ? 'テンプレート読込中...'
                                : 'プロジェクトを作成'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
