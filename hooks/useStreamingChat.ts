'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StreamEvent,
  AgentStatus,
  ChatMessage,
  Citation,
  LoadingState,
  AgentType,
  MessageRole,
} from '@/types/chat';

interface UseStreamingChatOptions {
  apiEndpoint?: string;
  onMessage?: (message: ChatMessage) => void;
  onAgentChange?: (agent: AgentStatus) => void;
  onCitation?: (citation: Citation) => void;
  onError?: (error: Error) => void;
}

interface UseStreamingChatReturn {
  messages: ChatMessage[];
  agentStatus: AgentStatus | null;
  citations: Citation[];
  isStreaming: boolean;
  loadingState: LoadingState;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

/**
 * Custom hook for handling SSE streaming chat with ROuvis agents
 */
export function useStreamingChat(
  options: UseStreamingChatOptions = {}
): UseStreamingChatReturn {
  const {
    apiEndpoint = '/api/chat',
    onMessage,
    onAgentChange,
    onCitation,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentMessageRef = useRef<string>('');
  const lastUserMessageRef = useRef<string>('');

  // Parse SSE event
  const parseStreamEvent = useCallback((data: string): StreamEvent | null => {
    try {
      return JSON.parse(data) as StreamEvent;
    } catch (e) {
      console.error('Failed to parse stream event:', e);
      return null;
    }
  }, []);

  // Handle agent handoff event
  const handleAgentHandoff = useCallback((data: any) => {
    const newStatus: AgentStatus = {
      current: data.to as AgentType,
      thinking: data.reason || `Switching to ${data.to}...`,
      timestamp: new Date(),
    };
    setAgentStatus(newStatus);
    onAgentChange?.(newStatus);
  }, [onAgentChange]);

  // Handle thinking/status update
  const handleThinking = useCallback((data: any) => {
    const status: AgentStatus = {
      current: data.agent as AgentType,
      thinking: data.message,
      progress: data.progress,
      timestamp: new Date(),
    };
    setAgentStatus(status);
    setLoadingState({
      isLoading: true,
      message: data.message,
      agent: data.agent,
      progress: data.progress,
    });
  }, []);

  // Handle citation event
  const handleCitation = useCallback((data: any) => {
    const citation: Citation = {
      id: data.id || `citation-${Date.now()}`,
      source: data.source,
      page: data.page,
      confidence: data.confidence || 0.8,
      text: data.text,
      type: data.type || 'general',
      url: data.url,
      metadata: data.metadata,
    };
    setCitations(prev => [...prev, citation]);
    onCitation?.(citation);
  }, [onCitation]);

  // Handle message delta (streaming)
  const handleMessageDelta = useCallback((data: any) => {
    if (data.delta) {
      currentMessageRef.current += data.delta;
    }
  }, []);

  // Handle complete message
  const handleMessageComplete = useCallback((data: any) => {
    const message: ChatMessage = {
      id: data.id || `msg-${Date.now()}`,
      role: 'assistant' as MessageRole,
      content: data.content || currentMessageRef.current,
      timestamp: new Date(),
      citations: [...citations],
      agentType: agentStatus?.current,
      confidence: data.confidence,
      metadata: data.metadata,
    };
    
    setMessages(prev => [...prev, message]);
    onMessage?.(message);
    
    // Reset current message
    currentMessageRef.current = '';
    setCitations([]);
  }, [citations, agentStatus, onMessage]);

  // Handle error event
  const handleError = useCallback((data: any) => {
    const err = new Error(data.message || 'An error occurred');
    setError(err);
    setLoadingState({ isLoading: false });
    onError?.(err);
  }, [onError]);

  // Process stream event
  const processStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'agent_handoff':
        handleAgentHandoff(event.data);
        break;
      case 'thinking':
        handleThinking(event.data);
        break;
      case 'citation':
        handleCitation(event.data);
        break;
      case 'message':
        if (event.data.isComplete) {
          handleMessageComplete(event.data);
        } else {
          handleMessageDelta(event.data);
        }
        break;
      case 'error':
        handleError(event.data);
        break;
      case 'done':
        setIsStreaming(false);
        setLoadingState({ isLoading: false });
        break;
    }
  }, [
    handleAgentHandoff,
    handleThinking,
    handleCitation,
    handleMessageComplete,
    handleMessageDelta,
    handleError,
  ]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    try {
      setError(null);
      setIsStreaming(true);
      setLoadingState({
        isLoading: true,
        message: 'Analyzing your request...',
        agent: 'triage',
      });

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user' as MessageRole,
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      lastUserMessageRef.current = content;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create EventSource for SSE
      const url = new URL(apiEndpoint, window.location.origin);
      url.searchParams.set('message', content);
      
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const streamEvent = parseStreamEvent(event.data);
        if (streamEvent) {
          processStreamEvent(streamEvent);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        eventSource.close();
        setIsStreaming(false);
        setLoadingState({ isLoading: false });
        const error = new Error('Connection to server lost');
        setError(error);
        onError?.(error);
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      setIsStreaming(false);
      setLoadingState({ isLoading: false });
      onError?.(error);
    }
  }, [apiEndpoint, parseStreamEvent, processStreamEvent, onError]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCitations([]);
    setAgentStatus(null);
    setError(null);
    currentMessageRef.current = '';
  }, []);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    agentStatus,
    citations,
    isStreaming,
    loadingState,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
  };
}