'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RouvisChatKit } from '../../components/RouvisChatKit';
import { TodayTasksCard } from '../../components/TodayTasksCard';
import { QuickActionButtons } from '../../components/QuickActionButtons';
import { AdvisorStrip } from '../../components/AdvisorStrip';
import { InsightsStack } from '../../components/InsightsStack';
import { TrustEvidenceRail } from '../../components/TrustEvidenceRail';
import { CalendarView } from '../../components/CalendarView';

// New Vibe Farming Layout components
import { VibeFarmingLayout, TodaysOverviewCard, WeatherWorkPlanCard } from '@/components/vibe';

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

/**
 * MVP A "Vibe Farming" Layout
 *
 * Set NEXT_PUBLIC_VIBE_FARMING_LAYOUT=true in .env.local to enable new layout
 * Set NEXT_PUBLIC_VISION_LITE_ENABLED=true to enable vision features
 *
 * Layout features:
 * - Left rail: IDE-style chat (360-400px fixed)
 * - Main: 2-column (Today's Overview + Weather Work Plan)
 * - Right rail: Tool toggles (desktop only)
 * - Responsive: Mobile chat drawer, stacked layout
 *
 * Legacy Layout (fallback when feature flag is false):
 * - Top: Weather alert banner (frost, typhoon, etc.)
 * - Main: Integrated chat interface with context
 * - Sidebar: Today's tasks, quick actions
 *
 * Design Philosophy (FARMER_UX_VISION.md):
 * - Chat-first: The entire page is centered around conversation
 * - Invisible AI: Technical machinery (agents, RAG) hidden
 * - Context-aware: Weather alerts, today's tasks always visible
 * - Scannable: Critical Niigata farming info at a glance
 * - Desktop-first: Optimized for 1440px+ (evening planning)
 */
export default function TodayPage() {
  const t = useTranslations();
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [confirmedTasks, setConfirmedTasks] = useState<Task[]>([]);
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  // Feature flag: Enable new "Vibe Farming" layout
  const VIBE_FARMING_LAYOUT = process.env.NEXT_PUBLIC_VIBE_FARMING_LAYOUT === 'true';

  const handleConfirmTask = async (taskId: string) => {
    console.log('handleConfirmTask called with taskId:', taskId);
    const task = pendingTasks.find(t => t.id === taskId);
    if (!task) {
      console.log('Task not found');
      return;
    }

    // Add to confirmed tasks
    setConfirmedTasks(prev => [...prev, { ...task, status: 'scheduled' }]);
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Start schedule generation animation
    setIsGeneratingSchedule(true);
    setShowWeeklySchedule(true);
    
    // Simulate AI generating schedule (3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGeneratingSchedule(false);

    // Try to persist to backend in background (best effort)
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({
          title: task.title,
          dueAt: task.dueAt.toISOString(),
          fieldId: task.fieldId,
          notes: task.description,
        }),
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status);
      }
    } catch (error) {
      console.error('Failed to persist task (non-critical):', error);
    }
  };

  const handleCancelTask = (taskId: string) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <>
      {VIBE_FARMING_LAYOUT ? (
        /* New "Vibe Farming" Layout - IDE-style with chat rail */
        <VibeFarmingLayout
          chatRail={
            <RouvisChatKit
              className="h-full w-full"
              onTasksScheduled={(tasks) => {
                setPendingTasks(prev => [...prev, ...tasks]);
              }}
              hideLeftRail={true}
            />
          }
          leftColumn={
            pendingTasks.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">おすすめタスク</h2>
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold">📅 タスクの確認</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mb-2">{task.title}</div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <span>🕐</span>
                              <span>{task.dueAt.toLocaleString('ja-JP')}</span>
                            </div>
                            {task.fieldName && (
                              <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>{task.fieldName}</span>
                              </div>
                            )}
                            {task.priority && (
                              <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  優先度: {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                </span>
                              </div>
                            )}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-600 mt-2 p-2 bg-white bg-opacity-50 rounded">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleConfirmTask(task.id || '')}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          ✓ 予定する
                        </button>
                        <button
                          onClick={() => handleCancelTask(task.id || '')}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          ✕ キャンセル
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <TodaysOverviewCard />
            )
          }
          rightColumn={
            showWeeklySchedule ? (
              isGeneratingSchedule ? (
                <div className="bg-white rounded-lg shadow-sm border-2 border-blue-300 p-6 min-h-[600px] flex flex-col items-center justify-center">
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-8 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                      <div className="absolute inset-0 w-20 h-20 border-8 border-cyan-200 border-b-cyan-600 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      <div className="absolute inset-2 w-16 h-16 border-6 border-emerald-200 border-l-emerald-600 rounded-full animate-spin mx-auto" style={{ animationDuration: '0.8s' }} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900">📅 1か月の予定表を生成中</h3>
                      <p className="text-sm text-gray-600 leading-relaxed max-w-md">
                        AIが天気予報・作物の生育ステージ・過去の作業履歴を分析し、<br />
                        最適な1か月間のスケジュールを自動生成しています...
                      </p>
                    </div>
                    <div className="space-y-2 text-xs text-left bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg max-w-md mx-auto">
                      <div className="flex items-center gap-2 text-blue-700">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span>気象データと作業要件を照合中...</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-700">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                        <span>リソース配分を最適化中...</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                        <span>カレンダーにスケジュールを配置中...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-fadeIn overflow-hidden flex flex-col">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 p-4 pb-0 pr-2">1か月の予定表</h2>
                  <div className="flex-1 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
                    <div className="p-4 pr-1">
                      <CalendarView tasks={confirmedTasks} />
                    </div>
                  </div>
                </div>
              )
            ) : (
              <WeatherWorkPlanCard />
            )
          }
        />
      ) : (
        /* Legacy Layout (preserved for safe rollback) */
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
      )}
    </>
  );
}

