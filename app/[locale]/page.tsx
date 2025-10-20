'use client';

import { useTranslations } from 'next-intl';
import { RouvisChatKit } from '../../components/RouvisChatKit';
import { WeatherAlertBanner } from '../../components/WeatherAlertBanner';
import { TodayTasksCard } from '../../components/TodayTasksCard';
import { QuickActionButtons } from '../../components/QuickActionButtons';

/**
 * Today View - Unified chat-first homepage
 *
 * Design Philosophy (FARMER_UX_VISION.md):
 * - Chat-first: The entire page is centered around conversation
 * - Invisible AI: Technical machinery (agents, RAG) hidden
 * - Context-aware: Weather alerts, today's tasks always visible
 * - Scannable: Critical Niigata farming info at a glance
 * - Mobile-first: Works with gloves in rice paddies
 *
 * Layout:
 * - Top: Weather alert banner (frost, typhoon, etc.)
 * - Main: Integrated chat interface with context
 * - Sidebar: Today's tasks, quick actions
 */
export default function TodayPage() {
  const t = useTranslations();

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* Left Column: Chat Interface (Primary) */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Weather Alert Banner - Always Visible */}
        <WeatherAlertBanner />

        {/* Main Chat Interface */}
        <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <RouvisChatKit className="h-full" />
        </div>
      </div>

      {/* Right Column: Context & Quick Actions (Secondary) */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Today's Tasks - Auto-generated daily */}
        <TodayTasksCard />

        {/* Quick Action Buttons - Large touch targets */}
        <QuickActionButtons />
      </div>
    </div>
  );
}
