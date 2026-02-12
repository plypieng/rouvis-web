import type { ReactNode } from 'react';

export type SurfaceLevel = 'base' | 'raised' | 'overlay';
export type RiskTone = 'safe' | 'watch' | 'warning' | 'critical';
export type CropStage = 'dormant' | 'seedling' | 'vegetative' | 'flowering' | 'ripening' | 'harvest';
export type StatusTone = 'neutral' | RiskTone;

export interface SeasonRailMilestone {
  id: string;
  label: string;
  stage: CropStage;
  state: 'upcoming' | 'current' | 'done';
  note?: string;
}

export interface SeasonRailState {
  stage: CropStage;
  completion: number;
  dayLabel: string;
  windowLabel?: string;
  risk: RiskTone;
  note?: string;
  milestones: SeasonRailMilestone[];
}

export interface SeasonRailProps {
  state: SeasonRailState;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export interface AppShellProps {
  locale: string;
  isAuthenticated: boolean;
  isOnboardingIncomplete?: boolean;
}

export interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export interface ShellNavItem {
  id: string;
  href: string;
  label: string;
  ariaLabel?: string;
}

export interface ModuleBlueprintProps {
  title: string;
  description: string;
  tone?: RiskTone;
  icon?: ReactNode;
  action?: ReactNode;
}
