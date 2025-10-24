'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ActivityDashboard } from '../../../components/ActivityDashboard';
import { ActivityLogModal } from '../../../components/ActivityLogModal';
import { ActivityTimeline } from '../../../components/ActivityTimeline';
import { CalendarIntegration } from '../../../components/CalendarIntegration';
import { ChatSidebar } from '../../../components/ChatSidebar';
import { DashboardCard } from '../../../components/DashboardCard';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { RouvisChatKit } from '../../../components/RouvisChatKit';
import { TaskListView } from '../../../components/TaskListView';
import { TaskSchedulerModal } from '../../../components/TaskSchedulerModal';

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-green-600 text-green-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function ChatPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'calendar' | 'timeline'>('chat');
  const [darkMode, setDarkMode] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showTaskSchedulerModal, setShowTaskSchedulerModal] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();

  const [会話数] = useState([
    {
      id: '1',
      title: 'Irrigation schedule review',
      date: '2024-10-18',
      preview: 'Weekly irrigation planning and water targets.',
    },
    {
      id: '2',
      title: 'Weather alert confirmation',
      date: '2024-10-17',
      preview: 'Discussed incoming rain and recommended actions.',
    },
    {
      id: '3',
      title: 'Pest management strategy',
      date: '2024-10-15',
      preview: 'Prevention plan for rice leaf spot disease.',
    },
  ]);

  const handleExport = () => {
    console.log('会話をエクスポート');
  };

  const handleShare = () => {
    console.log('会話を共有');
  };

  const handleClearChat = () => {
    if (confirm('会話履歴を削除しますか？')) {
      console.log('Clear chat');
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto space-y-6 px-4 py-6">
          <div className="flex items-center justify-between">
            <DashboardHeader title={t('chat.title') || 'AIチャット'} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`rounded-lg p-2 shadow-sm transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                title={darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              >
                {darkMode ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={handleExport}
                className={`rounded-lg p-2 shadow-sm transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                title="会話をエクスポート"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>

              <button
                onClick={handleShare}
                className={`rounded-lg p-2 shadow-sm transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                title="会話を共有"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 12v7a1 1 0 001 1h6m9-8V5a1 1 0 00-1-1h-6m-3 9l6-6m0 0L9 4m6 6H9"
                  />
                </svg>
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {showHistory ? 'Hide history' : 'Show history'}
              </button>
            </div>
          </div>

          <div
            className={`rounded-lg border ${
              darkMode ? 'border-blue-700 bg-blue-900 bg-opacity-50' : 'border-blue-200 bg-blue-50'
            } p-4`}
          >
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className={`mb-1 font-medium ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                  マルチエージェントシステム
                </h4>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  プランナー、気象・リスク、作物コーチ、スケジューラーが連携して、あなたの農作業をリアルタイムに支援します。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="flex border-b border-gray-200">
                <TabButton
                  label="💬 チャット"
                  active={activeTab === 'chat'}
                  onClick={() => setActiveTab('chat')}
                />
                <TabButton
                  label="📊 ダッシュボード"
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                />
                <TabButton
                  label="📅 カレンダー"
                  active={activeTab === 'calendar'}
                  onClick={() => setActiveTab('calendar')}
                />
                <TabButton
                  label="⏱ タイムライン"
                  active={activeTab === 'timeline'}
                  onClick={() => setActiveTab('timeline')}
                />
              </div>

              {activeTab === 'chat' && (
                <>
                  <DashboardCard title={t('chat.ai_assistant') || 'ファームAIアシスタント'}>
                    <div className="min-h-[75vh]">
                      {/* RouvisChatKit now handles its own evidence rail layout internally */}
                      <RouvisChatKit />
                    </div>
                  </DashboardCard>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <button
                      onClick={() => setShowActivityLogModal(true)}
                      className={`rounded-lg p-4 shadow-sm transition-all hover:scale-105 ${
                        darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="mb-2 text-2xl">統</div>
                      <div className="text-sm font-medium">Log activity</div>
                    </button>

                    <button
                      onClick={() => setShowTaskSchedulerModal(true)}
                      className={`rounded-lg p-4 shadow-sm transition-all hover:scale-105 ${
                        darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="mb-2 text-2xl">套</div>
                      <div className="text-sm font-medium">Schedule task</div>
                    </button>

                    <button
                      className={`rounded-lg p-4 shadow-sm transition-all hover:scale-105 ${
                        darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="mb-2 text-2xl">研</div>
                      <div className="text-sm font-medium">Weather check</div>
                    </button>

                    <button
                      className={`rounded-lg p-4 shadow-sm transition-all hover:scale-105 ${
                        darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="mb-2 text-2xl">投</div>
                      <div className="text-sm font-medium">Review records</div>
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'dashboard' && (
                <ActivityDashboard
                  onLogActivity={() => setShowActivityLogModal(true)}
                  onScheduleTask={() => setShowTaskSchedulerModal(true)}
                  onViewCalendar={() => setActiveTab('calendar')}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarIntegration
                  onLogActivity={() => setShowActivityLogModal(true)}
                  onScheduleTask={() => setShowTaskSchedulerModal(true)}
                />
              )}

              {activeTab === 'timeline' && (
                <ActivityTimeline />
              )}
            </div>

            <div className="space-y-4 lg:col-span-4">
              <DashboardCard title={t('chat.conversation_history') || '会話履歴'}>
                <div className="space-y-2">
                  {会話数.map((conv) => (
                    <button
                      key={conv.id}
                      className={`w-full rounded-lg border p-4 text-left transition-colors hover:border-green-500 hover:bg-green-50 ${
                        darkMode ? 'border-gray-700 bg-gray-800 text-gray-200' : 'border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-semibold">{conv.title}</div>
                      <div className="text-xs text-gray-500">{conv.date}</div>
                      <div className="mt-1 text-sm text-gray-600">{conv.preview}</div>
                    </button>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard title={t('chat.suggested_topics') || '提案トピック'}>
                <ChatSidebar />
              </DashboardCard>

              <div
                className={`rounded-lg p-4 ${
                  darkMode
                    ? 'border border-gray-700 bg-gray-800'
                    : 'border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  今月の使用状況
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>会話数</span>
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>47</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>エージェント呼び出し</span>
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>132</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>RAG検索</span>
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>89</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClearChat}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white shadow-sm transition-colors hover:bg-red-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('chat.clear') || '会話をクリア'}
              </button>
            </div>
          </div>

          <ActivityLogModal
            isOpen={showActivityLogModal}
            onClose={() => setShowActivityLogModal(false)}
            onSave={async (activity) => {
              try {
                const response = await fetch('/api/v1/activities', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo-user',
                  },
                  body: JSON.stringify(activity),
                });

                if (!response.ok) {
                  throw new Error('Failed to save activity');
                }
              } catch (error) {
                console.error('Failed to save activity', error);
                alert('Unable to save activity. Please try again.');
              }
            }}
            initialFieldId={selectedFieldId}
          />

          <TaskSchedulerModal
            isOpen={showTaskSchedulerModal}
            onClose={() => setShowTaskSchedulerModal(false)}
            onSave={async (task) => {
              try {
                const response = await fetch('/api/v1/tasks', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo-user',
                  },
                  body: JSON.stringify(task),
                });

                if (!response.ok) {
                  throw new Error('Failed to save task');
                }
              } catch (error) {
                console.error('Failed to save task', error);
                alert('Unable to save task. Please try again.');
              }
            }}
            initialFieldId={selectedFieldId}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}






