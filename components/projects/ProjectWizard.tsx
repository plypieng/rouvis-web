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
    status: 'pending' | 'completed';
    isBackfilled?: boolean;
};

type NoticeState = {
    type: 'info' | 'success' | 'error';
    message: string;
} | null;

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
    const [selectedField, setSelectedField] = useState<{ id: string } | null>(null);
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

    const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
        const payload = await response.json().catch(() => ({}));
        return payload?.error || payload?.message || payload?.details || fallback;
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
        status: TaskPayload['status'],
        isBackfilledTask?: boolean
    ): TaskPayload => ({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status,
        ...(isBackfilledTask ? { isBackfilled: true } : {}),
    });

    const buildTaskPayloads = (schedule: GeneratedSchedule, isBackfilled: boolean): TaskPayload[] => {
        if (isBackfilled) {
            const pastTasks = (schedule.pastTasks || []).flatMap((week) =>
                (week.tasks || []).map((task) => toTaskPayload(task, 'completed', true))
            );
            const currentTasks = (schedule.currentWeekTasks || []).map((task) => toTaskPayload(task, 'pending'));
            const futureTasks = (schedule.futureTasks || []).flatMap((week) =>
                (week.tasks || []).map((task) => toTaskPayload(task, 'pending'))
            );
            return [...pastTasks, ...currentTasks, ...futureTasks];
        }

        return (schedule.weeks || []).flatMap((week) =>
            (week.tasks || []).map((task) => toTaskPayload(task, 'pending'))
        );
    };

    const generateAndPersistInitialSchedule = async (projectId: string): Promise<number> => {
        if (!cropAnalysis) throw new Error('作物情報が見つかりません');

        const isBackfilled = projectType === 'existing' && !!plantingDate;
        const effectivePlantingDate = plantingDate || new Date().toISOString().split('T')[0];
        const endpoint = isBackfilled
            ? '/api/v1/agents/generate-backfilled-schedule'
            : '/api/v1/agents/generate-schedule';

        const preferenceTemplate = selectedTemplateId || FALLBACK_TEMPLATE_ID;
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
                throw new Error(
                    ((generatedData as Record<string, unknown>)?.message as string)
                    || '初回ドラフトの前に、作業設定テンプレートを選択してください。'
                );
            }

            throw new Error(
                ((generatedData as Record<string, unknown>)?.error as string)
                || ((generatedData as Record<string, unknown>)?.message as string)
                || ((generatedData as Record<string, unknown>)?.details as string)
                || '初回スケジュールの生成に失敗しました'
            );
        }

        const schedule: GeneratedSchedule = generatedData?.schedule || generatedData;
        const tasks = buildTaskPayloads(schedule, isBackfilled);
        if (!tasks.length) {
            throw new Error('初回スケジュールにタスクが含まれていませんでした');
        }

        const saveResponse = await fetch(`/api/v1/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tasks,
            }),
        });

        if (!saveResponse.ok) {
            throw new Error(await extractErrorMessage(saveResponse, '生成したタスクの保存に失敗しました'));
        }

        return tasks.length;
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
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
                // 1. First get recommendation/analysis from image
                const res = await fetch(`${baseUrl}/api/v1/agents/recommend`, {
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
                    const knowledgeRes = await fetch(`${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(data.crop)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`, {
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
                setNotice({
                    type: 'error',
                    message: `画像の読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
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
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const variety = ""; // Manual entry doesn't have variety yet
            const region = "Niigata";

            // 1. Fetch/Research Knowledge Base first
            const knowledgeRes = await fetch(`${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(cropName)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`, {
                credentials: 'include',
            });
            let knowledge = null;

            if (knowledgeRes.ok) {
                const kData = await knowledgeRes.json();
                knowledge = kData.knowledge;
            }

            // 2. Get standard recommendation (using knowledge if available to improve result)
            const res = await fetch(`${baseUrl}/api/v1/agents/recommend`, {
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
            setNotice({
                type: 'error',
                message: error instanceof Error ? error.message : '作物分析に失敗しました',
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
        setNotice(null);
        setLoading(true);

        try {
            let projectId = createdProjectId;

            if (!projectId) {
                setNotice({ type: 'info', message: 'プロジェクトを作成しています...' });
                const payload = {
                    name: `${cropAnalysis.crop} ${new Date().getFullYear()}`,
                    crop: cropAnalysis.crop,
                    variety: cropAnalysis.variety,
                    startDate: plantingDate || new Date().toISOString().split('T')[0],
                    fieldId: selectedField?.id,
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
                    throw new Error(await extractErrorMessage(createResponse, 'プロジェクトの作成に失敗しました'));
                }

                const { project } = await createResponse.json();
                projectId = project?.id;
                if (!projectId) {
                    throw new Error('プロジェクトIDを取得できませんでした');
                }
                setCreatedProjectId(projectId);
            }

            setNotice({ type: 'info', message: 'AIが初回スケジュールを作成しています...' });
            const taskCount = await generateAndPersistInitialSchedule(projectId);
            setNotice({ type: 'success', message: `初回スケジュールを作成しました（${taskCount}件）` });

            // Refresh session so onboarding guard sees the new project immediately.
            try {
                await update();
            } catch (error) {
                console.warn('Session update failed after project creation:', error);
            }
            router.refresh(); // Ensure list is updated
            router.push(`/${locale}/projects/${projectId}`);
        } catch (error) {
            console.error('Project creation error:', error);
            setNotice({
                type: 'error',
                message: error instanceof Error
                    ? error.message
                    : 'プロジェクトまたは初回スケジュールの作成に失敗しました',
            });
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
                    selectedFieldId={selectedField?.id ?? ''}
                    onChange={(id) => setSelectedField({ id })}
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
                        disabled={loading || templatesLoading}
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
