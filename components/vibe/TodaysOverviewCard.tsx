'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { WeatherSummaryBlock } from './WeatherSummaryBlock';
import { PrecipitationNowcast } from './PrecipitationNowcast';
import { WeatherWarningBanner } from './WeatherWarningBanner';
import { TyphoonAlert } from './TyphoonAlert';
import { AIRecommendationCard, Recommendation } from './AIRecommendationCard';
import { TodayTasksInlineList } from './TodayTasksInlineList';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection?: string;
  condition: string;
  icon: string;
  precipitation?: number;
  highTemp?: number;
  lowTemp?: number;
}

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueAt: Date;
  fieldId?: string;
  fieldName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled';
}

interface TodaysOverviewCardProps {
  selectedFieldId?: string;
  onViewRecommendationDetails?: () => void;
  pendingTasks?: Task[];
  onConfirmTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  className?: string;
}

/**
 * Today's Overview Card - Main overview container for MVP A UI
 *
 * Integrates:
 * - WeatherSummaryBlock: Current weather conditions
 * - AIRecommendationCard: AI-generated farming recommendations
 * - TodayTasksInlineList: Inline task checklist
 *
 * Features:
 * - Vertical stack layout with spacing
 * - Auto-fetch weather and tasks on mount
 * - Props for task update callbacks
 * - Optimized for dashboard overview
 */
export function TodaysOverviewCard({
  selectedFieldId,
  onViewRecommendationDetails,
  pendingTasks = [],
  onConfirmTask,
  onCancelTask,
  className = '',
}: TodaysOverviewCardProps) {
  const t = useTranslations();

  // Use enhanced weather forecast hook
  const {
    current,
    detailed,
    nowcast,
    warnings,
    typhoons,
    loading: weatherLoading,
    loadingNowcast,
    loadingWarnings,
    error: weatherError,
  } = useWeatherForecast({
    fieldId: selectedFieldId,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // AI recommendation state
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  // Tasks state (using custom hook)
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    toggleTask,
    refreshTasks,
  } = useTodayTasks({ selectedFieldId });

  // Fetch AI recommendation on mount
  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        setRecommendationLoading(true);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock recommendation
        const mockRecommendation: Recommendation = {
          id: 'rec-1',
          text: 'A field shows signs of water shortage. Recommend watering during cool morning hours.',
          confidence: 0.85,
          evidence: {
            sources: ['JMA Weather', 'Soil Sensor Data', 'Rice Cultivation Guide'],
            count: 3,
          },
          priority: 'high',
          category: 'crop',
          actionable: true,
        };

        setRecommendation(mockRecommendation);
      } catch (err) {
        console.error('Error fetching recommendation:', err);
        setRecommendation(null);
      } finally {
        setRecommendationLoading(false);
      }
    };

    fetchRecommendation();
  }, [selectedFieldId]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <h2 className="text-lg font-bold text-gray-900">
          {t('vibe.todays_overview')}
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

      {/* Content sections */}
      <div className="p-4 space-y-6">
        {/* Typhoon Alert (if active) */}
        {typhoons.length > 0 && (
          <section>
            <TyphoonAlert typhoons={typhoons} />
          </section>
        )}

        {/* Weather Warnings (if active) */}
        {warnings.length > 0 && !loadingWarnings && (
          <section>
            <WeatherWarningBanner warnings={warnings} />
          </section>
        )}

        {/* Weather Summary Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {t('vibe.weather_summary')}
          </h3>
          {weatherLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : weatherError || !current ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Weather information unavailable
            </div>
          ) : (
            <WeatherSummaryBlock
              temperature={current.temperature}
              humidity={current.humidity}
              windSpeed={current.windSpeed}
              windDirection={current.windDirection}
              condition={current.condition}
              icon={current.icon}
              precipitation={detailed[0]?.precipitation || 0}
              highTemp={detailed[0]?.temperature}
              lowTemp={detailed[detailed.length - 1]?.temperature}
              nextHours={detailed.slice(0, 3).map(d => ({
                time: d.time,
                temperature: d.temperature,
                precipitation: d.precipitation,
                condition: d.condition,
              }))}
              warnings={warnings.slice(0, 2)}
            />
          )}
        </section>

        {/* Precipitation Nowcast (if available) */}
        {nowcast.length > 0 && !loadingNowcast && (
          <section>
            <PrecipitationNowcast nowcast={nowcast} loading={loadingNowcast} />
          </section>
        )}

        {/* AI Recommendation Section */}
        {recommendation && !recommendationLoading && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t('vibe.ai_recommendations')}
            </h3>
            <AIRecommendationCard
              recommendation={recommendation}
              onViewDetails={onViewRecommendationDetails}
              compact
            />
          </section>
        )}

        {recommendationLoading && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t('vibe.ai_recommendations')}
            </h3>
            <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </section>
        )}

        {/* Today's Tasks Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {t('vibe.todays_tasks')}
          </h3>
          <TodayTasksInlineList
            tasks={tasks}
            loading={tasksLoading}
            onToggleTask={toggleTask}
            showProgress
            compact
          />
        </section>
      </div>

      {/* Footer actions */}
      {tasks.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={refreshTasks}
            className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            {t('today.tasks.regenerate')}
          </button>
        </div>
      )}
    </div>
  );
}
