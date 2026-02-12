import type { CropStage, RiskTone, SeasonRailMilestone, SeasonRailState } from '@/types/ui-shell';

const stageOrder: CropStage[] = ['seedling', 'vegetative', 'flowering', 'ripening', 'harvest'];
type MilestoneStage = Extract<CropStage, 'seedling' | 'vegetative' | 'flowering' | 'harvest'>;

export type SeasonMilestoneLabels = Record<MilestoneStage, string>;
const defaultMilestoneLabels: SeasonMilestoneLabels = {
  seedling: 'Seed prep',
  vegetative: 'Canopy build',
  flowering: 'Critical care',
  harvest: 'Harvest prep',
};

const stageAliases: Array<{ stage: CropStage; matches: string[] }> = [
  { stage: 'dormant', matches: ['dormant', 'rest'] },
  { stage: 'seedling', matches: ['seedling', 'germination', 'nursery', 'sprout', 'tillering'] },
  { stage: 'vegetative', matches: ['vegetative', 'leaf', 'growth'] },
  { stage: 'flowering', matches: ['flower', 'heading', 'booting'] },
  { stage: 'ripening', matches: ['ripen', 'fruit', 'maturity'] },
  { stage: 'harvest', matches: ['harvest', 'post-harvest'] },
];

export function normalizeCropStage(stage?: string): CropStage {
  if (!stage) return 'seedling';

  const lower = stage.toLowerCase();
  const matched = stageAliases.find((entry) => entry.matches.some((keyword) => lower.includes(keyword)));
  return matched?.stage || 'seedling';
}

function milestoneState(targetStage: CropStage, currentStage: CropStage): SeasonRailMilestone['state'] {
  const currentIndex = stageOrder.indexOf(currentStage);
  const targetIndex = stageOrder.indexOf(targetStage);

  if (targetIndex < 0) return 'upcoming';
  if (targetIndex < currentIndex) return 'done';
  if (targetIndex === currentIndex) return 'current';
  return 'upcoming';
}

export function defaultMilestones(
  currentStage: CropStage,
  labels?: Partial<SeasonMilestoneLabels>
): SeasonRailMilestone[] {
  const milestoneLabels = { ...defaultMilestoneLabels, ...labels };

  return [
    { id: 'seedling', label: milestoneLabels.seedling, stage: 'seedling', state: milestoneState('seedling', currentStage) },
    { id: 'vegetative', label: milestoneLabels.vegetative, stage: 'vegetative', state: milestoneState('vegetative', currentStage) },
    { id: 'flowering', label: milestoneLabels.flowering, stage: 'flowering', state: milestoneState('flowering', currentStage) },
    { id: 'harvest', label: milestoneLabels.harvest, stage: 'harvest', state: milestoneState('harvest', currentStage) },
  ];
}

export function riskFromProgress(progress: number): RiskTone {
  if (progress < 20) return 'watch';
  if (progress < 60) return 'safe';
  if (progress < 85) return 'warning';
  return 'critical';
}

export function buildSeasonRailState(params: {
  stage?: string;
  progress: number;
  dayCount: number;
  totalDays?: number;
  dayLabel?: string;
  windowLabel?: string;
  risk?: RiskTone;
  note?: string;
  milestoneLabels?: Partial<SeasonMilestoneLabels>;
}): SeasonRailState {
  const normalizedStage = normalizeCropStage(params.stage);
  const totalDaysLabel = params.totalDays ? ` / ${Math.max(params.totalDays, 0)}d` : '';
  const fallbackDayLabel = `Day ${Math.max(params.dayCount, 0)}${totalDaysLabel}`;

  return {
    stage: normalizedStage,
    completion: Math.max(0, Math.min(100, Number.isFinite(params.progress) ? params.progress : 0)),
    dayLabel: params.dayLabel || fallbackDayLabel,
    windowLabel: params.windowLabel,
    risk: params.risk || riskFromProgress(params.progress),
    note: params.note,
    milestones: defaultMilestones(normalizedStage, params.milestoneLabels),
  };
}
