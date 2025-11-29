'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, RefreshCw, Undo2 } from 'lucide-react';

export interface RouvisChatKitRef {
  sendMessage: (message: string) => void;
}

interface ActionConfirmation {
  id: string;
  type: 'activity_logged' | 'task_created' | 'task_updated';
  summary: string;
  undoData?: any;
  expiresAt: number;
}

interface ThinkingStep {
  id: string;
  tool: string;
  status: 'running' | 'completed' | 'error';
  message: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinkingSteps?: ThinkingStep[];
  source?: string;
  hasError?: boolean;
  createdAt?: string;
}

interface RouvisChatKitProps {
  className?: string;
  projectId?: string;
  initialThreadId?: string;
  onTaskUpdate?: () => void;
  density?: 'compact' | 'comfortable';
  growthStage?: string;
}

// Friendly status messages (no technical jargon)
const FRIENDLY_STATUS: Record<string, string> = {
  'planner': '考え中...',
  'jma.getForecast': '天気を確認中...',
  'plant_doctor.diagnose': '見てみますね...',
  'scheduler.createTask': '予定に追加中...',
  'activities.log': '記録中...',
};

// Time-aware greetings
function getGreeting(weather?: { condition?: string }): { main: string; sub: string } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 10) {
    return { main: 'おはようございます 🌱', sub: '今日も良い一日になりますように' };
  } else if (hour >= 10 && hour < 17) {
    if (weather?.condition?.includes('雨')) {
      return { main: '雨の日ですね ☔', sub: '計画を立てるのにいい日かも' };
    }
    return { main: '今日も畑日和ですね 🌱', sub: '何か気になることありますか？' };
  } else if (hour >= 17 && hour < 21) {
    return { main: 'お疲れさまです 🌾', sub: '今日の振り返りはいかがですか？' };
  } else {
    return { main: 'こんばんは 🌙', sub: '明日の準備はどうですか？' };
  }
}

// Quick action suggestions (text links, not buttons)
function getQuickSuggestions(growthStage?: string): { label: string; message: string }[] {
  const hour = new Date().getHours();
  const suggestions: { label: string; message: string }[] = [];

  if (hour >= 5 && hour < 12) {
    suggestions.push({ label: '今日の予定は？', message: '今日の作業予定を教えて' });
  }
  
  if (growthStage?.toLowerCase().includes('seedling') || growthStage?.includes('育苗')) {
    suggestions.push({ label: '水やり記録', message: '水やりを記録したい' });
  } else if (growthStage?.toLowerCase().includes('harvest') || growthStage?.includes('収穫')) {
    suggestions.push({ label: '収穫記録', message: '収穫を記録したい' });
  } else {
    suggestions.push({ label: '作業を記録', message: '作業を記録したい' });
  }
  
  suggestions.push({ label: '天気', message: '今日の天気は？' });
  
  return suggestions.slice(0, 3);
}

export const RouvisChatKit = forwardRef<RouvisChatKitRef, RouvisChatKitProps>(({
  className,
  projectId,
  initialThreadId,
  onTaskUpdate,
  density = 'comfortable',
  growthStage,
}, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [actionConfirmations, setActionConfirmations] = useState<ActionConfirmation[]>([]);
  const [weather, setWeather] = useState<{ condition?: string } | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!threadId) {
        if (projectId) {
          try {
            const res = await fetch('/api/chatkit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'chatkit.create_thread', payload: { projectId, userId: 'demo-user' } }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.thread?.id) setThreadId(data.thread.id);
            }
          } catch (e) {
            console.warn('Failed to create thread:', e);
          }
        }
        return;
      }

      try {
        const res = await fetch(`/api/chatkit?thread_id=${threadId}`);
        if (res.ok) {
          const data = await res.json();
          const history: Message[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }));
          setMessages(history);
        }
      } catch (e) {
        console.warn('Failed to load history:', e);
      }
    };

    loadHistory();
  }, [threadId, projectId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStatus('');

    const assistantId = `assistant-${Date.now()}`;
    const newAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, newAssistantMessage]);

    try {
      const response = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          projectId,
          threadId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // AI SDK format: 0:"text"
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + text } : m
              ));
            } catch (e) {
              // Skip parse errors
            }
            continue;
          }

          // Custom event format: e:{"type":"..."}
          if (line.startsWith('e:')) {
            let data: any = null;
            try {
              data = JSON.parse(line.slice(2));
            } catch (e) {
              continue;
            }

            // Simple status update (no complex thinking UI)
            if (data.type === 'tool_call_delta') {
              const friendlyStatus = FRIENDLY_STATUS[data.delta.tool] || '処理中...';
              setCurrentStatus(friendlyStatus);
            }

            // Content
            if (data.type === 'content' && data.delta?.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + data.delta.content } : m
              ));
            }

            // Source (simplified - no confidence %)
            if (data.type === 'citation' && data.citation?.source) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, source: data.citation.source } : m
              ));
            }

            // Action confirmations (simplified)
            if (data.type === 'action_confirmation') {
              const confirmation: ActionConfirmation = {
                id: `confirm-${Date.now()}`,
                type: data.action.type,
                summary: data.action.type === 'task_created' ? '予定に追加しました' :
                         data.action.type === 'activity_logged' ? '記録しました' :
                         '更新しました',
                undoData: data.action.undoData,
                expiresAt: Date.now() + 30000,
              };
              setActionConfirmations(prev => [...prev, confirmation]);
              setTimeout(() => {
                setActionConfirmations(prev => prev.filter(c => c.id !== confirmation.id));
              }, 5000);
            }

            // Weather for context
            if (data.type === 'tool_call_result' && data.toolName === 'jma.getForecast') {
              setWeather({ condition: data.result?.condition });
            }

            // Mark error
            if (data.type === 'tool_call_delta' && data.delta.status === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, hasError: true } : m
              ));
            }
          }
        }
      }

      onTaskUpdate?.();
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: m.content || 'うまくいかなかったみたい。', hasError: true }
          : m
      ));
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  }, [messages, projectId, threadId, isLoading, onTaskUpdate]);

  const handleRetry = useCallback(() => {
    setMessages(prev => {
      const lastAssistantIdx = prev.findLastIndex(m => m.role === 'assistant');
      if (lastAssistantIdx >= 0) return prev.slice(0, lastAssistantIdx);
      return prev;
    });
    setTimeout(() => {
      const lastUser = messages.findLast(m => m.role === 'user');
      if (lastUser) sendMessage(lastUser.content);
    }, 100);
  }, [messages, sendMessage]);

  useImperativeHandle(ref, () => ({ sendMessage }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleUndo = useCallback(async (confirmation: ActionConfirmation) => {
    if (!confirmation.undoData || Date.now() > confirmation.expiresAt) return;
    try {
      const res = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chatkit.undo', payload: confirmation.undoData }),
      });
      if (res.ok) {
        setActionConfirmations(prev => prev.filter(c => c.id !== confirmation.id));
        onTaskUpdate?.();
      }
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }, [onTaskUpdate]);

  const greeting = getGreeting(weather);
  const suggestions = getQuickSuggestions(growthStage);
  const isCompact = density === 'compact';

  return (
    <div className={`flex flex-col h-full bg-card ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state with personality */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12 px-6">
            <p className="text-lg text-foreground">{greeting.main}</p>
            <p className="text-sm text-muted-foreground mt-1">{greeting.sub}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            {/* Message Bubble */}
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                    : message.hasError
                      ? 'bg-destructive/10 text-destructive rounded-2xl rounded-tl-md'
                      : 'bg-secondary text-secondary-foreground rounded-2xl rounded-tl-md'
                } ${isCompact ? 'text-sm' : 'text-base'}`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {/* Retry for errors */}
                {message.hasError && !isLoading && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 flex items-center gap-1 text-xs text-destructive/80 hover:text-destructive"
                  >
                    <RefreshCw className="w-3 h-3" />
                    もう一度試す
                  </button>
                )}
              </div>
            </div>

            {/* Simple source attribution (no confidence %) */}
            {message.source && (
              <p className="text-xs text-muted-foreground ml-1">
                出典: {message.source}
              </p>
            )}
          </div>
        ))}

        {/* Simple status line while loading */}
        {isLoading && currentStatus && (
          <p className="text-sm text-muted-foreground animate-pulse pl-1">
            {currentStatus}
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border">
        {/* Action Confirmations (simplified) */}
        {actionConfirmations.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            {actionConfirmations.map((confirmation) => (
              <div
                key={confirmation.id}
                className="flex items-center justify-between py-2 px-4 bg-primary/10 text-primary text-sm rounded-lg"
              >
                <span>{confirmation.summary} ✓</span>
                {confirmation.undoData && Date.now() < confirmation.expiresAt && (
                  <button
                    onClick={() => handleUndo(confirmation)}
                    className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
                  >
                    <Undo2 className="w-3 h-3" />
                    取り消す
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Suggestions (text links, not pill buttons) */}
        {messages.length === 0 && !isLoading && (
          <div className="flex gap-4 px-4 pt-3 text-sm">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.message)}
                className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors min-h-[44px]"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 pt-3">
          <div className="flex items-center gap-2 bg-background rounded-full border border-border p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージ..."
              className={`flex-1 bg-transparent border-none px-4 py-2 min-h-[44px] focus:outline-none placeholder:text-muted-foreground ${isCompact ? 'text-sm' : 'text-base'}`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground rounded-full p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

RouvisChatKit.displayName = 'RouvisChatKit';
