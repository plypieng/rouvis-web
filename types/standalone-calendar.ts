import type { RiskTone } from '@/types/ui-shell';

export type CalendarFilterKey = 'all' | 'overdue' | 'today' | 'next48h';
export type CalendarRiskTone = RiskTone;

export interface StandaloneCalendarTask {
  id: string;
  title: string;
  description?: string;
  dueAt: string;
  projectId?: string;
  projectName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled' | 'completed';
  dependsOnTaskId?: string;
}

export interface CalendarOpsSnapshot {
  overdueCount: number;
  dueTodayCount: number;
  dueNext48hCount: number;
  risk: CalendarRiskTone;
}

export interface CalendarReschedulePayload {
  taskId: string;
  toDate: string;
  idempotencyKey: string;
}
