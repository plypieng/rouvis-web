'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { RouvisChatKit } from '../../../components/RouvisChatKit';
import { DiagnosisReport, DiagnosisResult } from '../../../components/DiagnosisReport';

type Thread = {
  id: string;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // Load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const res = await fetch('/api/chatkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chatkit.list_threads' })
        });
        const data = await res.json();
        if (data.threads) {
          setThreads(data.threads);
          setSelectedThreadId(prev => prev ?? data.threads[0]?.id);
        }
      } catch (e) {
        console.error('Failed to load threads', e);
      }
    };
    loadThreads();
  }, []);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chatkit.create_thread',
          payload: { title: 'New Conversation' }
        })
      });
      const data = await res.json();
      if (data.thread) {
        setThreads(prev => [data.thread, ...prev]);
        setSelectedThreadId(data.thread.id);
      }
    } catch (e) {
      console.error('Failed to create thread', e);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${isSidebarOpen ? 'w-80' : 'w-0'
            } bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden flex flex-col`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">会話履歴</h2>
            <button
              onClick={handleNewChat}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="New Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 group ${selectedThreadId === thread.id
                  ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                  : 'hover:bg-gray-50 border-transparent hover:shadow-sm'
                  } border`}
              >
                <div className={`text-sm font-medium mb-1 ${selectedThreadId === thread.id ? 'text-emerald-900' : 'text-gray-700'
                  }`}>
                  {thread.title || 'New Conversation'}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}</span>
                  <svg className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${selectedThreadId === thread.id ? 'text-emerald-400' : 'text-gray-300'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex min-w-0 bg-white relative">
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Sidebar Toggle (Mobile/Desktop) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute top-4 left-4 z-20 p-2 bg-white/80 backdrop-blur border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <RouvisChatKit
              key={selectedThreadId}
              initialThreadId={selectedThreadId}
              className="h-full w-full"
              density="comfortable"
              onDiagnosisComplete={(result) => setDiagnosisResult(result)}
            />
          </div>

          {/* Diagnosis Side Panel */}
          {diagnosisResult && (
            <div className="flex-shrink-0 z-20 absolute inset-0 md:static md:inset-auto transition-all duration-300 ease-in-out">
              <DiagnosisReport
                result={diagnosisResult}
                onClose={() => setDiagnosisResult(null)}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}




