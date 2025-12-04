'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FieldSelectorCompact } from './FieldSelectorCompact';
import { SevenDayWeatherGrid } from './SevenDayWeatherGrid';
import { WorkBlocksEditor } from './WorkBlocksEditor';
import { FieldMetadataSummary } from './FieldMetadataSummary';
import { useFieldMetadata } from '@/hooks/useFieldMetadata';
import { useWorkBlocks, WorkBlock } from '@/hooks/useWorkBlocks';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';

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

interface DayForecast {
  date: string;
  dayOfWeek: string;
  icon: string;
  highTemp: number;
  lowTemp: number;
  condition?: string;
  precipitation?: number;
}

interface WeatherWorkPlanCardProps {
  selectedField?: string;
  onFieldChange?: (fieldId: string) => void;
}

export function WeatherWorkPlanCard({
  selectedField: externalSelectedField,
  onFieldChange: externalOnFieldChange
}: WeatherWorkPlanCardProps) {
  const t = useTranslations('vibe');
  const [internalSelectedField, setInternalSelectedField] = useState<string | undefined>(undefined);
  const [, setEditingWorkBlock] = useState<WorkBlock | null>(null);

  // Use external state if provided, otherwise use internal state
  const selectedField = externalSelectedField !== undefined ? externalSelectedField : internalSelectedField;
  const onFieldChange = externalOnFieldChange || setInternalSelectedField;

  // Use enhanced weather forecast hook
  const {
    weekly,
    loading: loadingForecast,
  } = useWeatherForecast({
    fieldId: selectedField,
  });

  // Fetch field metadata
  const { field, loading: loadingField } = useFieldMetadata(selectedField);

  // Calculate date range (today + 7 days)
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch work blocks for selected field
  const {
    workBlocks,
    loading: loadingWorkBlocks,
  } = useWorkBlocks({
    fieldId: selectedField,
    startDate,
    endDate,
  });

  // Get Japanese day abbreviation
  const getDayAbbreviation = (dateString: string): string => {
    const date = new Date(dateString);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayIndex];
  };

  // Transform weekly forecast for display
  const transformedForecast: ForecastDay[] = weekly.slice(0, 7).map((day) => {
    const dayOfWeek = getDayAbbreviation(day.date);
    return {
      date: day.date,
      day: dayOfWeek,
      temperature: day.temperature,
      condition: day.condition,
      icon: day.icon,
      precipitation: day.precipitation || 0,
    };
  });

  const handleEditWorkBlock = (workBlock: WorkBlock) => {
    setEditingWorkBlock(workBlock);
    // TODO: Open modal/dialog for editing
    console.log('Edit work block:', workBlock);
  };

  const handleAddWorkBlock = (date: string) => {
    // TODO: Open modal/dialog for creating new work block
    console.log('Add work block for date:', date);
  };

  return (
    <div className="bg-white dark:bg-background/50 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-crop-900 dark:text-white">
          {t('weather_work_plan')}
        </h3>
      </div>

      {/* Field Selector */}
      <FieldSelectorCompact
        value={selectedField}
        onChange={onFieldChange}
      />

      {/* 7-Day Weather Grid */}
      {loadingForecast ? (
        <div className="animate-pulse">
          <div className="h-24 bg-secondary-100 dark:bg-secondary-800 rounded-lg"></div>
        </div>
      ) : (
        <SevenDayWeatherGrid
          forecast={weekly.slice(0, 7).map(day => ({
            date: day.date,
            dayOfWeek: getDayAbbreviation(day.date),
            icon: day.icon,
            highTemp: day.temperature.max,
            lowTemp: day.temperature.min,
            condition: day.condition,
            precipitation: day.precipitation,
            reliability: day.reliability,
          }))}
        />
      )}

      {/* Work Blocks Editor */}
      {loadingWorkBlocks ? (
        <div className="animate-pulse">
          <div className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-lg"></div>
        </div>
      ) : (
        <WorkBlocksEditor
          workBlocks={workBlocks}
          forecast={transformedForecast}
          onEdit={handleEditWorkBlock}
          onAdd={handleAddWorkBlock}
        />
      )}

      {/* Field Metadata Summary */}
      {selectedField && field && !loadingField && (
        <FieldMetadataSummary field={field} />
      )}

      {selectedField && loadingField && (
        <div className="animate-pulse">
          <div className="h-32 bg-secondary-100 dark:bg-secondary-800 rounded-lg"></div>
        </div>
      )}
    </div>
  );
}
