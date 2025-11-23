import { ReactNode } from 'react';

export interface DashboardCardProps {
  title: string;
  children?: ReactNode;
  value?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface AnalyticsChartsProps {
  chartType: 'yield' | 'profit' | 'cost';
}

export interface MapPlannerProps {
  initialCenter?: { lat: number; lng: number };
  zoom?: number;
}

export interface CropSelectionPanelProps {
  onCropSelect?: (crop: string) => void;
}

export interface OptimizationSettingsProps {
  onSettingsChange?: (settings: any) => void;
}

export interface CalendarViewProps {
  onDaySelect?: (date: Date) => void;
}

export interface ScheduleSidebarProps {
  selectedDate?: Date;
}

export interface ChatSidebarProps {
  onTopicSelect?: (topic: string) => void;
}

export interface WebChatInterfaceProps {
  initialMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
