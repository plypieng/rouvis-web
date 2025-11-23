'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { WorkBlock } from '@/hooks/useWorkBlocks';

interface ForecastDay {
  date: string;
  day: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  icon: string;
  precipitation: number;
}

interface WorkBlocksEditorProps {
  workBlocks: WorkBlock[];
  forecast: ForecastDay[];
  onEdit?: (workBlock: WorkBlock) => void;
  onAdd?: (date: string) => void;
}

export function WorkBlocksEditor({ workBlocks, forecast, onEdit, onAdd }: WorkBlocksEditorProps) {
  const t = useTranslations('vibe');
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'watering':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-200/20 dark:text-sky-300';
      case 'fertilizing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-200/20 dark:text-amber-300';
      case 'pest_control':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-200/20 dark:text-rose-300';
      case 'harvesting':
        return 'bg-crop-100 text-crop-700 dark:bg-crop-200/20 dark:text-crop-300';
      default:
        return 'bg-secondary-100 text-secondary-700 dark:bg-secondary-200/20 dark:text-secondary-300';
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    const labels: Record<string, string> = {
      watering: '灌水',
      fertilizing: '追肥',
      pest_control: '防除',
      harvesting: '収穫',
      other: '作業',
    };
    return labels[taskType] || taskType;
  };

  const getTimeLabel = (timeOfDay: string) => {
    return timeOfDay === 'morning' ? t('morning') : timeOfDay === 'afternoon' ? t('afternoon') : '終日';
  };

  const getWorkBlocksForDate = (date: string) => {
    return workBlocks.filter((block) => {
      const blockDate = new Date(block.date).toISOString().split('T')[0];
      const targetDate = new Date(date).toISOString().split('T')[0];
      return blockDate === targetDate;
    });
  };

  return (
    <div className="rounded-lg border border-secondary-300 dark:border-secondary-700 overflow-hidden">
      {/* Header */}
      <div className="bg-secondary-50 dark:bg-background/30 border-b border-secondary-300 dark:border-secondary-700 px-3 py-2">
        <h4 className="text-sm font-semibold text-crop-900 dark:text-white">
          {t('work_blocks')}
        </h4>
      </div>

      {/* 6-day grid */}
      <div className="grid grid-cols-6">
        {forecast.map((day, idx) => {
          const dayWorkBlocks = getWorkBlocksForDate(day.date);

          return (
            <div
              key={day.date}
              className={`border-r border-secondary-300 dark:border-secondary-700 p-2 min-h-[120px] ${
                idx === forecast.length - 1 ? 'border-r-0' : ''
              }`}
            >
              {/* Day header */}
              <div className="text-center mb-2 pb-2 border-b border-secondary-200 dark:border-secondary-600">
                <div className="text-xs font-bold text-crop-900 dark:text-white mb-1">
                  {day.day}
                </div>
                <div className="text-xs text-secondary-600 dark:text-secondary-400">
                  {day.temperature.max}°/{day.temperature.min}°
                </div>
              </div>

              {/* Work blocks */}
              <div className="space-y-1">
                {dayWorkBlocks.length === 0 && (
                  <div className="text-[10px] text-secondary-500 dark:text-secondary-500 text-center py-1">
                    {t('no_work_scheduled')}
                  </div>
                )}

                {dayWorkBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`group relative rounded p-1 text-xs hover:shadow-sm transition-all cursor-pointer ${getTaskTypeColor(
                      block.task_type
                    )}`}
                    onMouseEnter={() => setHoveredBlock(block.id)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    onClick={() => onEdit?.(block)}
                  >
                    <p className="font-semibold leading-tight truncate">
                      {getTaskTypeLabel(block.task_type)}
                    </p>
                    <p className="text-[10px] leading-tight text-secondary-600 dark:text-secondary-400">
                      {getTimeLabel(block.time_of_day)}
                    </p>

                    {hoveredBlock === block.id && (
                      <button
                        className="absolute -right-1 -top-1 rounded-full bg-white/90 dark:bg-background/90 p-0.5 shadow-sm hover:shadow-md transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(block);
                        }}
                      >
                        <span className="material-symbols-outlined !text-[14px] text-sky-600 dark:text-sky-400">
                          edit
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={() => onAdd?.(day.date)}
                className="w-full mt-2 py-1 text-[10px] text-crop-600 dark:text-crop-400 hover:text-crop-700 dark:hover:text-crop-300 hover:bg-crop-50 dark:hover:bg-crop-900/10 rounded transition-colors flex items-center justify-center gap-0.5"
              >
                <span className="material-symbols-outlined !text-xs">add</span>
                <span>{t('add_work')}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
