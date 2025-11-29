'use client';

import { useMemo } from 'react';

interface QuickAction {
  label: string;
  message: string;
}

interface QuickActionsProps {
  onAction: (message: string) => void;
  disabled?: boolean;
  weather?: { condition?: string };
  growthStage?: string;
}

export function QuickActions({ onAction, disabled, weather, growthStage }: QuickActionsProps) {
  const actions = useMemo(() => {
    const hour = new Date().getHours();
    const result: QuickAction[] = [];

    // Morning: Field work focus
    if (hour >= 5 && hour < 12) {
      result.push({ label: '今日の予定は？', message: '今日の作業予定を教えて' });
      
      if (weather?.condition?.includes('晴') || weather?.condition?.includes('曇')) {
        result.push({ label: '水やり記録', message: '水やりを記録したい' });
      }
    }

    // Rainy weather
    if (weather?.condition?.includes('雨')) {
      result.push({ label: '延期できる？', message: '雨なので今日の作業を延期できる？' });
    }

    // Growth stage specific
    if (growthStage) {
      const stage = growthStage.toLowerCase();
      
      if (stage.includes('seedling') || stage.includes('育苗')) {
        result.push({ label: '水やり', message: '育苗の水やりを記録' });
      }
      if (stage.includes('flowering') || stage.includes('開花')) {
        result.push({ label: '追肥', message: '追肥を記録したい' });
      }
      if (stage.includes('harvest') || stage.includes('収穫')) {
        result.push({ label: '収穫記録', message: '収穫を記録したい' });
      }
    }

    // Evening: Planning focus
    if (hour >= 18 && hour < 23) {
      result.push({ label: '明日の計画', message: '明日の作業計画を立てて' });
    }

    // Fallbacks
    if (result.length < 2) {
      result.push({ label: '天気', message: '今日の天気は？' });
    }
    if (result.length < 3) {
      result.push({ label: '診断', message: '植物の状態を診断したい' });
    }

    // Dedupe and limit
    const seen = new Set<string>();
    return result.filter(a => {
      if (seen.has(a.label)) return false;
      seen.add(a.label);
      return true;
    }).slice(0, 3);
  }, [weather, growthStage]);

  if (actions.length === 0) return null;

  return (
    <div className="flex gap-4 px-4 pb-2 text-sm">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.message)}
          disabled={disabled}
          className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
