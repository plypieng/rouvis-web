import type { ReactNode } from 'react';

export type SurfaceLevel = 'base' | 'raised' | 'overlay';
export type StatusTone = 'neutral' | 'safe' | 'watch' | 'warning' | 'critical';

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
