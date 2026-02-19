'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import CropAnalysisCard from './CropAnalysisCard';
import FieldSelector from './FieldSelector';
import ProjectTypeSelector from './ProjectTypeSelector';
import PlantingHistoryInput from './PlantingHistoryInput';
import AIProcessingOverlay, { type AIProcessingMode } from './AIProcessingOverlay';
import ScheduleConstraintForm, {
    advancedConstraintsFromTemplate,
    buildSchedulingPreferencesPayload,
    normalizeAdvancedConstraints,
    parsePositiveNumber,
    type ScheduleConstraintAdvanced,
    type ScheduleConstraintTemplate,
    type YieldRecommendation,
    type YieldUnit,
} from './ScheduleConstraintForm';
import { toastError, toastInfo, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';
import {
    statusForScheduleStage,
    type ScheduleProcessingStatus,
} from './scheduleProgress';

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
    id: ScheduleConstraintTemplate['id'];
    status?: ScheduleConstraintTemplate['status'];
    label: ScheduleConstraintTemplate['label'];
    description: ScheduleConstraintTemplate['description'];
    preferences: ScheduleConstraintTemplate['preferences'];
};

type PreferenceTemplateCatalog = {
    templates?: PreferenceTemplate[];
    recommendedTemplate?: string;
};

type FieldEnvironmentType = 'open_field' | 'greenhouse' | 'home_pot';

type WizardFieldRecord = {
    id: string;
    name: string;
    environmentType?: FieldEnvironmentType | string;
    containerCount?: number | null;
    areaSqm?: number | null;
    area?: number | null;
};

const FALLBACK_TEMPLATE_ID = 'conservative-weather';
const GENERATION_REQUEST_TIMEOUT_MS = 20_000;
const MAX_SCAN_PAYLOAD_BYTES = 3_900_000;
const MAX_SCAN_DIMENSION = 1800;
const MIN_SCAN_SCALE = 0.25;
const SCALE_REDUCTION_FACTOR = 0.82;
const JPEG_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42] as const;
const textEncoder = new TextEncoder();
const BASE_YIELD_T_PER_HA: Record<Exclude<FieldEnvironmentType, 'home_pot'>, number> = {
    open_field: 5.2,
    greenhouse: 8.0,
};

function resolveEnvironmentType(value: unknown): FieldEnvironmentType {
    if (value === 'greenhouse' || value === 'home_pot' || value === 'open_field') return value;
    return 'open_field';
}

function fieldAreaSqm(field: WizardFieldRecord): number {
    const area = typeof field.areaSqm === 'number' ? field.areaSqm : field.area;
    if (typeof area !== 'number' || !Number.isFinite(area) || area <= 0) return 0;
    return area;
}

function roundYield(value: number, digits = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function recommendationForFields(
    fields: WizardFieldRecord[],
    selectedFieldIds: string[],
    primaryFieldId: string | null
): YieldRecommendation | null {
    if (!selectedFieldIds.length || !fields.length) return null;

    const selected = fields.filter((field) => selectedFieldIds.includes(field.id));
    if (!selected.length) return null;

    const primaryField = selected.find((field) => field.id === primaryFieldId) || selected[0];
    const primaryEnvironment = resolveEnvironmentType(primaryField?.environmentType);

    const areaBasedFields = selected
        .map((field) => ({
            environment: resolveEnvironmentType(field.environmentType),
            areaSqm: fieldAreaSqm(field),
        }))
        .filter((field) => field.environment !== 'home_pot' && field.areaSqm > 0);

    if (areaBasedFields.length > 0) {
        const totalAreaSqm = areaBasedFields.reduce((sum, field) => sum + field.areaSqm, 0);
        const weightedRate = areaBasedFields.reduce(
            (sum, field) => {
                const baseRate = field.environment === 'greenhouse'
                    ? BASE_YIELD_T_PER_HA.greenhouse
                    : BASE_YIELD_T_PER_HA.open_field;
                return sum + (baseRate * field.areaSqm);
            },
            0
        ) / totalAreaSqm;
        const recommendation = roundYield(weightedRate, 1);
        return {
            value: recommendation,
            unit: 't_per_ha',
            min: Math.max(0.1, roundYield(recommendation * 0.8, 1)),
            max: roundYield(recommendation * 1.2, 1),
            environment: primaryEnvironment === 'home_pot' ? 'open_field' : primaryEnvironment,
            rationale: `選択圃場の面積 ${roundYield(totalAreaSqm / 10000, 2)}ha をもとに推定`,
        };
    }

    const totalPots = selected.reduce((sum, field) => {
        if (resolveEnvironmentType(field.environmentType) !== 'home_pot') return sum;
        if (typeof field.containerCount === 'number' && field.containerCount > 0) {
            return sum + field.containerCount;
        }
        return sum + 1;
    }, 0);

    if (totalPots > 0) {
        const recommendation = roundYield(totalPots * 1.8, 1);
        return {
            value: recommendation,
            unit: 'kg_total',
            min: Math.max(0.1, roundYield(recommendation * 0.7, 1)),
            max: roundYield(recommendation * 1.3, 1),
            environment: 'home_pot',
            rationale: `家庭ポット ${totalPots}個 をもとに推定`,
        };
    }

    return null;
}

function estimateUtf8Bytes(value: string): number {
    return textEncoder.encode(value).length;
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }
            reject(new Error('画像の読み込みに失敗しました'));
        };
        reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('画像の読み込みに失敗しました'));
        };
        image.src = objectUrl;
    });
}

async function prepareSeedBagImagePayload(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
    }

    const originalDataUrl = await readFileAsDataUrl(file);
    if (estimateUtf8Bytes(originalDataUrl) <= MAX_SCAN_PAYLOAD_BYTES) {
        return originalDataUrl;
    }

    const image = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('画像の処理に失敗しました');
    }

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    let scale = longestSide > MAX_SCAN_DIMENSION ? MAX_SCAN_DIMENSION / longestSide : 1;

    while (scale >= MIN_SCAN_SCALE) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of JPEG_QUALITIES) {
            const candidate = canvas.toDataURL('image/jpeg', quality);
            if (estimateUtf8Bytes(candidate) <= MAX_SCAN_PAYLOAD_BYTES) {
                return candidate;
            }
        }

        scale *= SCALE_REDUCTION_FACTOR;
    }

    throw new Error('画像サイズが大きすぎます。より小さい画像を選択してください');
}

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
    const [loadingMode, setLoadingMode] = useState<AIProcessingMode | null>(null);
    const [processingStatus, setProcessingStatus] = useState<ScheduleProcessingStatus | null>(null);
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
    const [availableFields, setAvailableFields] = useState<WizardFieldRecord[]>([]);
    const [preferredYieldInput, setPreferredYieldInput] = useState('');
    const [preferredYieldUnit, setPreferredYieldUnit] = useState<YieldUnit>('t_per_ha');
    const [yieldEdited, setYieldEdited] = useState(false);
    const [advancedConstraints, setAdvancedConstraints] = useState<ScheduleConstraintAdvanced>(
        () => normalizeAdvancedConstraints()
    );
    const [showAdvancedConstraints, setShowAdvancedConstraints] = useState(false);

    const activeTemplates = useMemo(
        () => preferenceTemplates.filter((template) => (template.status ?? 'active') === 'active'),
        [preferenceTemplates]
    );

    const effectiveTemplateId = useMemo(() => {
        if (selectedTemplateId && activeTemplates.some((template) => template.id === selectedTemplateId)) {
            return selectedTemplateId;
        }
        if (recommendedTemplateId && activeTemplates.some((template) => template.id === recommendedTemplateId)) {
            return recommendedTemplateId;
        }
        return activeTemplates[0]?.id ?? null;
    }, [activeTemplates, recommendedTemplateId, selectedTemplateId]);

    const effectiveTemplate = useMemo(
        () => activeTemplates.find((template) => template.id === effectiveTemplateId) ?? null,
        [activeTemplates, effectiveTemplateId]
    );

    const yieldRecommendation = useMemo(
        () => recommendationForFields(availableFields, selectedFieldIds, primaryFieldId),
        [availableFields, primaryFieldId, selectedFieldIds]
    );

    const preferredYieldValue = useMemo(
        () => parsePositiveNumber(preferredYieldInput),
        [preferredYieldInput]
    );

    useEffect(() => {
        if (!selectedFieldIds.length) {
            setYieldEdited(false);
            setPreferredYieldInput('');
            setPreferredYieldUnit('t_per_ha');
            return;
        }
        if (!yieldEdited && yieldRecommendation) {
            setPreferredYieldInput(String(yieldRecommendation.value));
            setPreferredYieldUnit(yieldRecommendation.unit);
        }
    }, [selectedFieldIds, yieldEdited, yieldRecommendation]);

    useEffect(() => {
        if (!effectiveTemplate) return;
        setAdvancedConstraints(advancedConstraintsFromTemplate(effectiveTemplate));
    }, [effectiveTemplate]);

    const mergedSchedulingPreferences = useMemo(() => buildSchedulingPreferencesPayload({
        template: effectiveTemplate,
        advanced: advancedConstraints,
        preferredYieldInput,
        preferredYieldUnit,
        yieldRecommendation,
    }), [advancedConstraints, effectiveTemplate, preferredYieldInput, preferredYieldUnit, yieldRecommendation]);

    const hasInvalidYieldInput = preferredYieldInput.trim().length > 0 && preferredYieldValue === null;

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
        const activeTemplateIds = templates
            .filter((template) => (template.status ?? 'active') === 'active')
            .map((template) => template.id);
        const recommendedFromCatalog = typeof catalog.recommendedTemplate === 'string'
            ? catalog.recommendedTemplate
            : null;
        setPreferenceTemplates(templates);
        const resolvedRecommended = recommendedFromCatalog && activeTemplateIds.includes(recommendedFromCatalog)
            ? recommendedFromCatalog
            : activeTemplateIds.includes(FALLBACK_TEMPLATE_ID)
                ? FALLBACK_TEMPLATE_ID
                : activeTemplateIds[0] || null;

        setRecommendedTemplateId(resolvedRecommended);
        setSelectedTemplateId((current) => {
            if (activeTemplateIds.includes(current)) return current;
            if (resolvedRecommended) return resolvedRecommended;
            return current;
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

    const generateInitialSchedule = async (
        projectId: string,
        schedulingPreferences?: Record<string, unknown>,
        preferenceTemplateId?: string | null,
        onProgress?: (status: ScheduleProcessingStatus) => void,
    ): Promise<{ mode: 'sync' | 'async'; runId: string | null; taskCount: number | null }> => {
        if (!cropAnalysis) throw new Error('作物情報が見つかりません');

        const isBackfilled = projectType === 'existing' && !!plantingDate;
        const effectivePlantingDate = plantingDate || new Date().toISOString().split('T')[0];
        const endpoint = isBackfilled
            ? '/api/v1/agents/generate-backfilled-schedule'
            : '/api/v1/agents/generate-schedule';
        const preferenceTemplate = preferenceTemplateId || undefined;
        onProgress?.(statusForScheduleStage('generate_schedule'));
        const generationPayload = isBackfilled
            ? {
                projectId,
                source: 'wizard_initial',
                ...(preferenceTemplate ? { preferenceTemplate } : {}),
                ...(schedulingPreferences ? { schedulingPreferences } : {}),
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
                source: 'wizard_initial',
                ...(preferenceTemplate ? { preferenceTemplate } : {}),
                ...(schedulingPreferences ? { schedulingPreferences } : {}),
                cropAnalysis: {
                    crop: cropAnalysis.crop,
                    variety: cropAnalysis.variety,
                    startDate: cropAnalysis.startDate || new Date().toISOString().split('T')[0],
                    targetHarvestDate: cropAnalysis.targetHarvestDate || '',
                    notes: cropAnalysis.notes,
                },
                currentDate: new Date().toISOString().split('T')[0],
            };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GENERATION_REQUEST_TIMEOUT_MS);
        try {
            const scheduleResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generationPayload),
                signal: controller.signal,
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

            const generation = (generatedData as Record<string, unknown>)?.generation as Record<string, unknown> | undefined;
            const generationMode = typeof generation?.mode === 'string' ? generation.mode : 'sync';
            const runId = typeof generation?.runId === 'string' ? generation.runId : null;
            const taskCount = typeof (generatedData as Record<string, unknown>)?.taskCount === 'number'
                ? (generatedData as Record<string, unknown>).taskCount as number
                : null;
            onProgress?.(statusForScheduleStage('finalize'));

            return {
                mode: generationMode === 'async' ? 'async' : 'sync',
                runId,
                taskCount,
            };
        } catch (error) {
            if ((error as { name?: string })?.name === 'AbortError') {
                throw new Error('初回スケジュール生成がタイムアウトしました。もう一度お試しください。');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
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
        try {
            const imagePayload = await prepareSeedBagImagePayload(file);

            // 1. First get recommendation/analysis from image
            const res = await fetch('/api/v1/agents/recommend', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imagePayload }),
            });

            if (!res.ok) {
                throw new Error(await extractErrorMessage(res, '画像の読み込みに失敗しました'));
            }

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
        } catch (error) {
            console.error('Scan error:', error);
            const message = error instanceof Error
                ? error.message
                : '画像の読み込みに失敗しました';
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
        if (preferredYieldInput.trim() && preferredYieldValue === null) {
            const message = '目標収量は0より大きい数値で入力してください。';
            setNotice({
                type: 'error',
                message,
            });
            toastError(message);
            return;
        }
        setNotice(null);
        setLoading(true);
        setLoadingMode('schedule');
        setProcessingStatus(statusForScheduleStage('prepare'));

        try {
            let projectId = createdProjectId;
            const schedulingPreferences = mergedSchedulingPreferences;

            if (!projectId) {
                setNotice({ type: 'info', message: 'プロジェクトを作成しています...' });
                toastInfo('プロジェクトを作成しています...');
                setProcessingStatus(statusForScheduleStage('create_project'));
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
                    schedulingPreferences,
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
            setProcessingStatus(statusForScheduleStage('generate_schedule'));
            const generationResult = await generateInitialSchedule(
                projectId,
                schedulingPreferences,
                effectiveTemplateId,
                (status) => setProcessingStatus(status),
            );
            void trackUXEvent('schedule_generated', {
                projectId,
                flow: 'wizard',
                taskCount: generationResult.taskCount ?? 0,
                generationMode: generationResult.mode,
                projectType: projectType || 'new',
            });

            const successMessage = generationResult.mode === 'async'
                ? '初回スケジュールの生成を開始しました。進捗を表示します。'
                : `初回スケジュールを作成しました${typeof generationResult.taskCount === 'number' ? `（${generationResult.taskCount}件）` : ''}`;
            setNotice({ type: 'success', message: successMessage });
            toastSuccess(successMessage);
            setProcessingStatus(statusForScheduleStage('redirect'));

            // Refresh session so onboarding guard sees the new project immediately.
            try {
                await update();
            } catch (error) {
                console.warn('Session update failed after project creation:', error);
            }
            router.refresh(); // Ensure list is updated
            void trackUXEvent('activation_flow_redirected', {
                destination: 'project_page',
                generationMode: generationResult.mode,
            });
            const generationRunIdQuery = generationResult.mode === 'async' && generationResult.runId
                ? `?generationRunId=${encodeURIComponent(generationResult.runId)}`
                : '';
            router.push(`/${locale}/projects/${projectId}${generationRunIdQuery}`);
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
            setLoadingMode(null);
            setProcessingStatus(null);
        }
    };

    // Render based on step
    if (step === 'selection') {
        return (
            <div className="space-y-6 relative min-h-[400px]">
                <WizardProgress currentStep={step} showPlantingHistory={projectType === 'existing'} />
                {loading && loadingMode && loadingMode !== 'schedule' && (
                    <AIProcessingOverlay mode={loadingMode} testId="wizard-analysis-processing-overlay" />
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
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        void handleScanImage(file);
                                    }
                                    e.target.value = '';
                                }}
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
            <div className="space-y-6 relative">
                <WizardProgress currentStep={step} showPlantingHistory={projectType === 'existing'} />
                {loading && loadingMode === 'schedule' && (
                    <AIProcessingOverlay
                        mode="schedule"
                        statusMessage={processingStatus?.message}
                        statusDetail={processingStatus?.detail}
                        progress={processingStatus?.progress}
                        testId="wizard-schedule-processing-overlay"
                    />
                )}
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
                <FieldSelector
                    value={{
                        fieldIds: selectedFieldIds,
                        primaryFieldId,
                    }}
                    onChange={(scope) => {
                        setSelectedFieldIds(scope.fieldIds);
                        setPrimaryFieldId(scope.primaryFieldId);
                    }}
                    onFieldsLoaded={(fields) => {
                        setAvailableFields(fields);
                    }}
                />
                <ScheduleConstraintForm
                    templates={preferenceTemplates}
                    templatesLoading={templatesLoading}
                    templatesError={templatesError}
                    recommendedTemplateId={recommendedTemplateId}
                    selectedTemplateId={effectiveTemplateId}
                    onSelectTemplate={(templateId) => {
                        setSelectedTemplateId(templateId);
                        const selectedTemplate = preferenceTemplates.find((template) => template.id === templateId);
                        if (selectedTemplate) {
                            setAdvancedConstraints(advancedConstraintsFromTemplate(selectedTemplate));
                        }
                    }}
                    preferredYieldInput={preferredYieldInput}
                    preferredYieldUnit={preferredYieldUnit}
                    onChangeYieldInput={(value) => {
                        setYieldEdited(true);
                        setPreferredYieldInput(value);
                    }}
                    onChangeYieldUnit={(unit) => {
                        setYieldEdited(true);
                        setPreferredYieldUnit(unit);
                    }}
                    yieldRecommendation={yieldRecommendation}
                    hasInvalidYieldInput={hasInvalidYieldInput}
                    onApplyRecommendedYield={() => {
                        if (!yieldRecommendation) return;
                        setPreferredYieldInput(String(yieldRecommendation.value));
                        setPreferredYieldUnit(yieldRecommendation.unit);
                        setYieldEdited(false);
                    }}
                    advanced={advancedConstraints}
                    onChangeAdvanced={setAdvancedConstraints}
                    showAdvanced={showAdvancedConstraints}
                    onChangeShowAdvanced={setShowAdvancedConstraints}
                />
                <CropAnalysisCard analysis={cropAnalysis} />
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setStep(projectType === 'existing' ? 'planting-history' : 'crop-analysis')}
                        className="rounded-lg px-6 py-2 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                        戻る
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={loading || !selectedFieldIds.length || !primaryFieldId || hasInvalidYieldInput}
                        className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? '作成中...' : 'プロジェクトを作成'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
