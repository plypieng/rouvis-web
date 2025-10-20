'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { ChatSidebar } from '../../../components/ChatSidebar';
import { RouvisChatKit } from '../../../components/RouvisChatKit';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

export default function ChatPage() {
  const t = useTranslations();
  const [darkMode, setDarkMode] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [conversations] = useState([
    { id: '1', title: '稲作の灌漑計画', date: '2024-10-18', preview: '今週の灌漑スケジュールについて...' },
    { id: '2', title: 'JMA気象警報確認', date: '2024-10-17', preview: '新潟地域の大雨注意報について...' },
    { id: '3', title: '病害虫対策相談', date: '2024-10-15', preview: 'いもち病の予防方法について...' },
  ]);

  const handleExport = () => {
    // TODO: Implement conversation export
    console.log('Exporting conversation...');
  };

  const handleShare = () => {
    // TODO: Implement conversation sharing
    console.log('Sharing conversation...');
  };

  const handleClearChat = () => {
    if (confirm('会話履歴を削除しますか？')) {
      // TODO: Clear chat history
      console.log('Clearing chat...');
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto py-6 px-4 space-y-6">
          {/* Header with Actions */}
          <div className="flex items-center justify-between">
            <DashboardHeader title={t('chat.title') || 'AIチャット'} />
            
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-sm`}
                title={darkMode ? 'ライトモード' : 'ダークモード'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-sm`}
                title="会話をエクスポート"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-sm`}
                title="会話を共有"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>

              {/* Toggle History */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-sm lg:hidden`}
                title="履歴を表示/非表示"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Area - Takes 3 columns on large screens */}
            <div className="lg:col-span-3 space-y-4">
              {/* Info Banner */}
              <div className={`rounded-lg p-4 ${
                darkMode 
                  ? 'bg-blue-900 bg-opacity-50 border border-blue-700' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className={`font-medium mb-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                      マルチエージェントシステム
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      複数の専門エージェント（プランナー、気象・リスク、作物コーチ、スケジューラー）が連携して、あなたの農業をサポートします。
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Chat Interface */}
              <DashboardCard title={t('chat.ai_assistant') || 'AIアシスタント'}>
                <div className="h-[700px]">
                  <RouvisChatKit />
                </div>
              </DashboardCard>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className={`p-4 rounded-lg transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:shadow-md text-gray-900'
                } shadow-sm`}>
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium">作業計画</div>
                </button>
                <button className={`p-4 rounded-lg transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:shadow-md text-gray-900'
                } shadow-sm`}>
                  <div className="text-2xl mb-2">🌤️</div>
                  <div className="text-sm font-medium">気象確認</div>
                </button>
                <button className={`p-4 rounded-lg transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:shadow-md text-gray-900'
                } shadow-sm`}>
                  <div className="text-2xl mb-2">📚</div>
                  <div className="text-sm font-medium">栽培ガイド</div>
                </button>
                <button className={`p-4 rounded-lg transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:shadow-md text-gray-900'
                } shadow-sm`}>
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium">記録分析</div>
                </button>
              </div>
            </div>

            {/* Sidebar - History and Topics */}
            <div className={`space-y-4 ${showHistory ? '' : 'hidden lg:block'}`}>
              {/* Conversation History */}
              <DashboardCard title={t('chat.history') || '会話履歴'}>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-gray-700 text-gray-200'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">{conv.title}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {conv.date}
                      </div>
                      <div className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {conv.preview}
                      </div>
                    </button>
                  ))}
                </div>
              </DashboardCard>

              {/* Suggested Topics */}
              <DashboardCard title={t('chat.suggested_topics') || '提案トピック'}>
                <ChatSidebar />
              </DashboardCard>

              {/* Usage Stats */}
              <div className={`p-4 rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
              }`}>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  今月の使用状況
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>会話数</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>47</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>エージェント呼び出し</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>132</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>RAG検索</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>89</span>
                  </div>
                </div>
              </div>

              {/* Clear Chat Button */}
              <button
                onClick={handleClearChat}
                className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('chat.clear') || '会話をクリア'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}