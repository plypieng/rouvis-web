'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { RouvisChatKit, type ChatMode, type ChatSuggestion } from '../../../components/RouvisChatKit';
import { DiagnosisReport, type DiagnosisResult } from '../../../components/DiagnosisReport';
import { trackUXEvent } from '@/lib/analytics';
import type { CommandHandshake } from '@/types/project-cockpit';

type Thread = {
  id: string;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ThreadMode = 'default' | 'reschedule' | 'diagnosis' | 'logging';
type ThreadTone = 'safe' | 'watch' | 'warning' | 'critical';

const THREAD_MODE_TONE: Record<ThreadMode, ThreadTone> = {
  default: 'safe',
  reschedule: 'warning',
  diagnosis: 'watch',
  logging: 'safe',
};

const THREAD_TONE_CLASS: Record<ThreadTone, string> = {
  safe: 'status-safe',
  watch: 'status-watch',
  warning: 'status-warning',
  critical: 'status-critical',
};

function getContextThreadTitle(intent: string | null, t: (key: string) => string): string {
  if (intent === 'today') return t('cockpit.thread_titles.today');
  if (intent === 'calendar') return t('cockpit.thread_titles.calendar');
  if (intent === 'project') return t('cockpit.thread_titles.project');
  return t('cockpit.thread_titles.context');
}

function parseMode(raw: string | null): ChatMode | undefined {
  if (raw === 'default' || raw === 'reschedule' || raw === 'diagnosis' || raw === 'logging') {
    return raw;
  }
  return undefined;
}

function inferThreadMode(title?: string | null): ThreadMode {
  const normalized = (title || '').toLowerCase();
  if (/resched|schedule|calendar|調整|カレンダー/.test(normalized)) return 'reschedule';
  if (/diagnos|disease|診断|病害/.test(normalized)) return 'diagnosis';
  if (/log|記録|activity|実績/.test(normalized)) return 'logging';
  return 'default';
}

function formatThreadTimestamp(value: string | undefined, locale: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;

  const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateFormatter.format(parsed)} ${timeFormatter.format(parsed)}`;
}

function buildContextSuggestions(
  intent: string | null,
  prompt: string | null,
  date: string | null,
  t: (key: string, values?: Record<string, string | number>) => string
): ChatSuggestion[] {
  const suggestions: ChatSuggestion[] = [];

  if (prompt) {
    suggestions.push({
      label: t('cockpit.context_suggestions.use_prompt_label'),
      message: prompt,
    });
  }

  if (intent === 'today') {
    suggestions.push({
      label: t('cockpit.context_suggestions.today_priority_label'),
      message: t('cockpit.context_suggestions.today_priority_message'),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.today_next_label'),
      message: t('cockpit.context_suggestions.today_next_message'),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.today_log_label'),
      message: t('cockpit.context_suggestions.today_log_message'),
      mode: 'logging',
    });
  }

  if (intent === 'calendar') {
    const dayText = date || t('cockpit.context_day_today');
    suggestions.push({
      label: t('cockpit.context_suggestions.calendar_day_plan_label', { day: dayText }),
      message: t('cockpit.context_suggestions.calendar_day_plan_message', { day: dayText }),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.calendar_risk_label'),
      message: t('cockpit.context_suggestions.calendar_risk_message', { day: dayText }),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.calendar_delay_label'),
      message: t('cockpit.context_suggestions.calendar_delay_message', { day: dayText }),
    });
  }

  if (intent === 'project') {
    suggestions.push({
      label: t('cockpit.context_suggestions.project_focus_label'),
      message: t('cockpit.context_suggestions.project_focus_message'),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.project_risk_label'),
      message: t('cockpit.context_suggestions.project_risk_message'),
    });
    suggestions.push({
      label: t('cockpit.context_suggestions.project_template_label'),
      message: t('cockpit.context_suggestions.project_template_message'),
    });
  }

  return suggestions.slice(0, 3);
}

export default function ChatPage() {
  const t = useTranslations('chat');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [threadQuery, setThreadQuery] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [activeHandshake, setActiveHandshake] = useState<CommandHandshake | null>(null);
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
    () => buildContextSuggestions(contextIntent, contextPrompt, contextDate, t),
    [contextIntent, contextPrompt, contextDate, t]
  );

  const contextIntentLabel = contextIntent === 'today'
    ? t('cockpit.standalone.intents.today')
    : contextIntent === 'calendar'
      ? t('cockpit.standalone.intents.calendar')
      : contextIntent === 'project'
        ? t('cockpit.standalone.intents.project')
        : t('cockpit.standalone.intents.general');

  const filteredThreads = useMemo(() => {
    const query = threadQuery.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => (thread.title || '').toLowerCase().includes(query));
  }, [threadQuery, threads]);

  const handleThreadSelect = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setIsSidebarOpen(false);
  }, []);

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
            contextThreadSeedRef.current = contextSeedKey;

            const createRes = await fetch('/api/chatkit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'chatkit.create_thread',
                payload: {
                  title: getContextThreadTitle(contextIntent, t),
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
  }, [contextEntryKey, contextIntent, contextProjectId, forceFreshThread, hasContextEntry, t]);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chatkit.create_thread',
          payload: {
            title: t('cockpit.new_conversation'),
            ...(contextProjectId ? { projectId: contextProjectId } : {}),
          }
        })
      });
      const data = await res.json();
      if (data.thread) {
        setThreads(prev => [data.thread, ...prev]);
        setSelectedThreadId(data.thread.id);
        setIsSidebarOpen(false);
      }
    } catch (e) {
      console.error('Failed to create thread', e);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-[calc(100vh-64px)] shell-canvas">
        <div className="shell-main flex h-[calc(100vh-64px)] flex-col py-3">
          <section className="surface-raised mb-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t('cockpit.standalone.deck_label')}
                </p>
                <h1 className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
                  {t('cockpit.standalone.title')}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('cockpit.standalone.subtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="status-safe rounded-full px-2 py-1 text-[11px] font-semibold">
                  {t('cockpit.standalone.thread_count', { count: threads.length })}
                </span>

                {hasContextEntry ? (
                  <span className="status-watch rounded-full px-2 py-1 text-[11px] font-semibold">
                    {t('cockpit.standalone.context_active', { intent: contextIntentLabel })}
                  </span>
                ) : null}

                {activeHandshake ? (
                  <span className="status-warning rounded-full px-2 py-1 text-[11px] font-semibold">
                    {t('cockpit.handshake.affected', { count: activeHandshake.affectedTasks.length })}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className="touch-target inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary lg:hidden"
                  aria-label={isSidebarOpen ? t('cockpit.standalone.close_log') : t('cockpit.standalone.open_log')}
                  aria-expanded={isSidebarOpen}
                  aria-controls="chat-command-log"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {isSidebarOpen ? 'left_panel_close' : 'left_panel_open'}
                  </span>
                  <span>{isSidebarOpen ? t('cockpit.standalone.close_log') : t('cockpit.standalone.open_log')}</span>
                </button>
              </div>
            </div>
          </section>

          <div className="relative min-h-0 flex-1">
            {isSidebarOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-label={t('cockpit.standalone.close_log')}
              />
            ) : null}

            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside
                id="chat-command-log"
                className={`surface-raised fixed inset-x-4 bottom-4 top-[124px] z-30 flex min-h-0 flex-col overflow-hidden transition-all duration-200 lg:static lg:inset-auto lg:z-auto ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[108%] opacity-0 pointer-events-none'} lg:pointer-events-auto lg:translate-x-0 lg:opacity-100`}
                data-testid="command-log-rail"
              >
                <div className="border-b border-border/80 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('cockpit.standalone.command_log_title')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('cockpit.standalone.command_log_subtitle')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="touch-target rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label={t('cockpit.new_conversation')}
                      data-testid="chat-new-thread"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
                    </button>
                  </div>

                  <label htmlFor="chat-thread-search" className="sr-only">
                    {t('cockpit.standalone.search_label')}
                  </label>
                  <div className="control-inset flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-[16px] text-muted-foreground" aria-hidden="true">search</span>
                    <input
                      id="chat-thread-search"
                      value={threadQuery}
                      onChange={(event) => setThreadQuery(event.target.value)}
                      placeholder={t('cockpit.standalone.search_placeholder')}
                      className="w-full bg-transparent py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mobile-scroll flex-1 space-y-2 overflow-y-auto p-3">
                  {filteredThreads.length === 0 ? (
                    <div className="control-inset p-3 text-xs text-muted-foreground">
                      {t('cockpit.standalone.empty_log')}
                    </div>
                  ) : (
                    filteredThreads.map((thread) => {
                      const mode = inferThreadMode(thread.title);
                      const toneClass = THREAD_TONE_CLASS[THREAD_MODE_TONE[mode]];
                      const timestamp = formatThreadTimestamp(thread.updatedAt || thread.createdAt, locale);
                      const isSelected = selectedThreadId === thread.id;

                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => handleThreadSelect(thread.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-brand-seedling/40 bg-secondary/70 shadow-lift1' : 'border-border/80 bg-card hover:bg-secondary/45'}`}
                          data-testid="chat-thread-item"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p data-testid="chat-thread-title" className="line-clamp-2 text-sm font-semibold text-foreground">
                              {thread.title || t('cockpit.new_conversation')}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}>
                              {mode === 'default' ? t('cockpit.modes.default.label') : t(`cockpit.modes.${mode}.label`)}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {timestamp
                                ? t('cockpit.standalone.updated_at', { time: timestamp })
                                : t('cockpit.standalone.updated_unknown')}
                            </span>
                            {isSelected ? (
                              <span className="material-symbols-outlined text-[14px] text-brand-seedling" aria-hidden="true">done</span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <section className="surface-raised min-h-0 overflow-hidden">
                <RouvisChatKit
                  key={`${selectedThreadId || 'new'}:${contextProjectId || 'none'}:${contextEntryKey}`}
                  initialThreadId={selectedThreadId}
                  projectId={contextProjectId}
                  initialInput={contextPrompt || undefined}
                  initialMode={contextMode}
                  initialSuggestions={contextSuggestions.length > 0 ? contextSuggestions : undefined}
                  className="h-full w-full"
                  density="comfortable"
                  standoutMode={true}
                  onCommandHandshakeChange={setActiveHandshake}
                  onDiagnosisComplete={(result) => setDiagnosisResult(result as DiagnosisResult)}
                />
              </section>
            </div>

            {diagnosisResult ? (
              <div className="fixed inset-0 z-40 p-4 md:absolute md:inset-auto md:right-3 md:top-3 md:h-[calc(100%-24px)] md:w-[420px]">
                <DiagnosisReport
                  result={diagnosisResult}
                  onClose={() => setDiagnosisResult(null)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
