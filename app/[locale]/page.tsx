'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RouvisChatKit } from '../../components/RouvisChatKit';
import { TodayTasksCard } from '../../components/TodayTasksCard';
import { QuickActionButtons } from '../../components/QuickActionButtons';
import { AdvisorStrip } from '../../components/AdvisorStrip';
import { InsightsStack } from '../../components/InsightsStack';
import { TrustEvidenceRail } from '../../components/TrustEvidenceRail';

/**
 * Today View - Unified chat-first homepage
 *
 * Design Philosophy (FARMER_UX_VISION.md):
 * - Chat-first: The entire page is centered around conversation
 * - Invisible AI: Technical machinery (agents, RAG) hidden
 * - Context-aware: Weather alerts, today's tasks always visible
 * - Scannable: Critical Niigata farming info at a glance
 * - Desktop-first: Optimized for 1440px+ (evening planning)
 *
 * Layout:
 * - Top: Weather alert banner (frost, typhoon, etc.)
 * - Main: Integrated chat interface with context
 * - Sidebar: Today's tasks, quick actions
 */
export default function TodayPage() {
  const t = useTranslations();

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-6 space-y-6">
      {/* Advisor Strip hero: frost alert, KPI chip, next task summary */}
      {/* TODO: Wire /v1/weather/alerts, /v1/analytics/overview, /v1/tasks?date=today inside AdvisorStrip */}
      <AdvisorStrip />

      {/* Main dashboard grid: Desktop-first 12-col (4/4/4) at xl>=1280 (~1440 target). 
         - 1024窶・439: stacked with ordering (TODO: refine tablet layout as per spec)
         - <=767: single column stacking
      */}
      <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column - Flow Pillars: Today tasks, Quick actions, Yield/KPI mini-card */}
        <div className="order-1 xl:order-1 md:col-span-6 xl:col-span-4 space-y-4 min-w-0">
          {/* TODO: /v1/tasks?date=today integration lives inside TodayTasksCard */}
          <TodayTasksCard />
          {/* TODO: Chat linking for actions; voice record integration to route into Chat */}
          <QuickActionButtons />

          {/* Yield/KPI mini-card (placeholder) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">{t('dashboard.yield_forecast')}</div>
                <div className="text-2xl font-bold text-green-700">+12%</div>
                <div className="text-xs text-gray-500 mt-1">{t('dashboard.location')}</div>
              </div>
              <Link
                href="analytics"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {t('dashboard.view_details')}
              </Link>
            </div>
          </div>
        </div>

        {/* Middle Column - Conversation Workspace (Chat remains central) */}
        <div className="order-2 md:col-span-6 xl:col-span-5 min-w-0">
          {/* RouvisChatKit start screen already provides localized suggested prompts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[70vh] w-full min-w-0">
            <RouvisChatKit className="h-full w-full ck-full-bleed" />
          </div>
        </div>

        {/* Right Column - Insight Stack + Trust/Evidence rail */}
        <div className="order-3 md:col-span-6 xl:col-span-3 space-y-4 min-w-0">
          {/* Weather & Logistics + Cooperative callouts */}
          {/* TODO: /v1/weather/forecast and /v1/logistics/stream integration is inside InsightsStack */}
          {/* TODO: /v1/cooperative/announcements SSE hook inside InsightsStack */}
          <InsightsStack />

          {/* Trust/Evidence Rail - wired for future SSE citations */}
          {/* TODO: SSE subscription integration to feed EvidenceCard + RAGContextBadge */}
          <TrustEvidenceRail />
        </div>
      </div>

      {/* TODO: Future tablet/mobile refinements to keep Chat central prominence */}
    </div>
  );
}

