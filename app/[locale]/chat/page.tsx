'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { RouvisChatKit, type ChatMode, type ChatSuggestion } from '../../../components/RouvisChatKit';
import { DiagnosisReport, DiagnosisResult } from '../../../components/DiagnosisReport';
import { trackUXEvent } from '@/lib/analytics';

type Thread = {
  id: string;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function getContextThreadTitle(intent: string | null): string {
  if (intent === 'today') return 'Today Focus';
  if (intent === 'calendar') return 'Calendar Planning';
  if (intent === 'project') return 'Project Assistant';
  return 'Context Chat';
}

function parseMode(raw: string | null): ChatMode | undefined {
  if (raw === 'default' || raw === 'reschedule' || raw === 'diagnosis' || raw === 'logging') {
    return raw;
  }
  return undefined;
}

function buildContextSuggestions(
  intent: string | null,
  prompt: string | null,
  date: string | null
): ChatSuggestion[] {
  const suggestions: ChatSuggestion[] = [];

  if (prompt) {
    suggestions.push({ label: 'この内容で相談', message: prompt });
  }

  if (intent === 'today') {
    suggestions.push({ label: '今日の優先3つ', message: '今日の優先作業を3つに絞って理由も教えて' });
    suggestions.push({ label: '完了後の次作業', message: '今終わった作業の次にやるべきことは？' });
    suggestions.push({ label: '作業記録を手伝って', message: '今日の作業を記録したい', mode: 'logging' });
  }

  if (intent === 'calendar') {
    const dayText = date || '今日';
    suggestions.push({ label: `${dayText}の段取り`, message: `${dayText}の予定を時間順に並べて最適化して` });
    suggestions.push({ label: '天気リスクを確認', message: `${dayText}の天気リスクを踏まえて作業順を見直して` });
    suggestions.push({ label: '延期候補を知る', message: `${dayText}で延期してよい作業を教えて` });
  }

  if (intent === 'project') {
    suggestions.push({ label: '今週の重点作業', message: 'このプロジェクトの今週の重点作業を3つ教えて' });
    suggestions.push({ label: '病害虫リスク', message: 'この時期に注意すべき病害虫リスクは？' });
    suggestions.push({ label: '記録テンプレート', message: 'このプロジェクト向けの簡単な記録テンプレートを作って' });
  }

  return suggestions.slice(0, 3);
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const contextThreadSeedRef = useRef<string>('');
  const contextOpenEventRef = useRef<string>('');

  const contextProjectId = searchParams.get('projectId') || undefined;
  const contextPrompt = searchParams.get('prompt');
  const contextIntent = searchParams.get('intent');
  const contextDate = searchParams.get('date');
  const contextMode = parseMode(searchParams.get('mode'));
  const forceFreshThread = searchParams.get('fresh') === '1';
  const hasContextEntry = Boolean(contextIntent || contextPrompt || contextDate || contextMode || contextProjectId);
  const contextEntryKey = useMemo(() => JSON.stringify({
    intent: contextIntent || '',
    prompt: contextPrompt || '',
    date: contextDate || '',
    mode: contextMode || '',
    projectId: contextProjectId || '',
    fresh: forceFreshThread ? '1' : '',
  }), [contextDate, contextIntent, contextMode, contextProjectId, contextPrompt, forceFreshThread]);
  const contextSuggestions = useMemo(
    () => buildContextSuggestions(contextIntent, contextPrompt, contextDate),
    [contextIntent, contextPrompt, contextDate]
  );

  useEffect(() => {
    if (hasContextEntry) {
      setSelectedThreadId(undefined);
    }
  }, [contextEntryKey, hasContextEntry]);

  useEffect(() => {
    if (!hasContextEntry) {
      contextOpenEventRef.current = '';
      return;
    }

    if (contextOpenEventRef.current === contextEntryKey) {
      return;
    }

    contextOpenEventRef.current = contextEntryKey;
    void trackUXEvent('context_chat_opened', {
      intent: contextIntent || 'unknown',
      hasPrompt: Boolean(contextPrompt),
      hasDate: Boolean(contextDate),
      hasProject: Boolean(contextProjectId),
      fresh: forceFreshThread,
    });
  }, [contextDate, contextEntryKey, contextIntent, contextProjectId, contextPrompt, forceFreshThread, hasContextEntry]);

  // Load threads on mount
  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      try {
        const res = await fetch('/api/chatkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chatkit.list_threads' })
        });
        const data = await res.json();

        if (!cancelled && data.threads) {
          const listedThreads = data.threads as Thread[];
          setThreads(listedThreads);

          if (hasContextEntry) {
            const contextSeedKey = `${contextEntryKey}:fresh`;

            if (contextThreadSeedRef.current === contextSeedKey) {
              return;
            }
            // Guard against duplicate thread creation in strict-mode effect replays.
            contextThreadSeedRef.current = contextSeedKey;

            const createRes = await fetch('/api/chatkit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'chatkit.create_thread',
                payload: {
                  title: getContextThreadTitle(contextIntent),
                  ...(contextProjectId ? { projectId: contextProjectId } : {}),
                },
              })
            });
            const createData = await createRes.json().catch(() => ({}));

            if (cancelled) return;

            if (createRes.ok && createData.thread?.id) {
              setThreads(prev => [createData.thread as Thread, ...prev.filter((thread) => thread.id !== createData.thread.id)]);
              setSelectedThreadId(createData.thread.id);
              void trackUXEvent('context_thread_created', {
                intent: contextIntent || 'unknown',
                hasProject: Boolean(contextProjectId),
                fresh: forceFreshThread,
              });
            }
            return;
          }

          contextThreadSeedRef.current = '';
          setSelectedThreadId(prev => prev ?? listedThreads[0]?.id);
        }
      } catch (e) {
        console.error('Failed to load threads', e);
      }
    };

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, [contextEntryKey, contextIntent, contextProjectId, forceFreshThread, hasContextEntry]);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chatkit.create_thread',
          payload: {
            title: 'New Conversation',
            ...(contextProjectId ? { projectId: contextProjectId } : {}),
          }
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
                  <span>{new Date(thread.updatedAt || thread.createdAt || Date.now()).toLocaleDateString()}</span>
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
              key={`${selectedThreadId || 'new'}:${contextProjectId || 'none'}:${contextEntryKey}`}
              initialThreadId={selectedThreadId}
              projectId={contextProjectId}
              initialInput={contextPrompt || undefined}
              initialMode={contextMode}
              initialSuggestions={contextSuggestions.length > 0 ? contextSuggestions : undefined}
              className="h-full w-full"
              density="comfortable"
              onDiagnosisComplete={(result) => setDiagnosisResult(result as DiagnosisResult)}
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
