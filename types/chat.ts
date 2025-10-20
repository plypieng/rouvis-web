// Chat-specific TypeScript types for ROuvis farming assistant

/**
 * Agent types in the ROuvis system
 */
export type AgentType = 'triage' | 'planner' | 'weather' | 'crop_coach' | 'scheduler';

/**
 * Agent status with current state and thinking process
 */
export interface AgentStatus {
  current: AgentType;
  thinking: string;
  progress?: number; // 0-100
  timestamp?: Date;
}

/**
 * Citation source types
 */
export type CitationType = 'jma' | 'guidebook' | 'field_data' | 'weather' | 'general';

/**
 * Citation with source information and confidence
 */
export interface Citation {
  id?: string;
  source: string;
  page?: number;
  confidence: number; // 0-1
  text?: string;
  type: CitationType;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * JMA (Japan Meteorological Agency) specific data
 */
export interface JMAData {
  location: string;
  forecast: string;
  warnings?: string[];
  temperature?: {
    high: number;
    low: number;
  };
  precipitation?: number;
  timestamp: Date;
  source: string;
}

/**
 * RAG (Retrieval Augmented Generation) context
 */
export interface RAGContext {
  guidebooks: string[];
  chunks: number;
  relevanceScore: number;
}

/**
 * Stream event types from SSE
 */
export type StreamEventType = 
  | 'message' 
  | 'tool_call' 
  | 'tool_result' 
  | 'citation' 
  | 'agent_handoff' 
  | 'thinking'
  | 'error'
  | 'done';

/**
 * Base stream event interface
 */
export interface StreamEvent {
  type: StreamEventType;
  data: any;
  timestamp?: Date;
}

/**
 * Message stream event
 */
export interface MessageStreamEvent extends StreamEvent {
  type: 'message';
  data: {
    content: string;
    delta?: string;
    isComplete: boolean;
  };
}

/**
 * Agent handoff event
 */
export interface AgentHandoffEvent extends StreamEvent {
  type: 'agent_handoff';
  data: {
    from: AgentType;
    to: AgentType;
    reason: string;
  };
}

/**
 * Citation stream event
 */
export interface CitationStreamEvent extends StreamEvent {
  type: 'citation';
  data: Citation;
}

/**
 * Thinking/status update event
 */
export interface ThinkingStreamEvent extends StreamEvent {
  type: 'thinking';
  data: {
    agent: AgentType;
    message: string;
    progress?: number;
  };
}

/**
 * Error event
 */
export interface ErrorStreamEvent extends StreamEvent {
  type: 'error';
  data: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
}

/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message with metadata
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  citations?: Citation[];
  agentType?: AgentType;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Chat conversation/thread
 */
export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Loading state with context
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  agent?: AgentType;
  progress?: number;
}

/**
 * Component theme configuration
 */
export interface ThemeConfig {
  colorScheme: 'light' | 'dark';
  accentColor?: string;
  agentColors?: Record<AgentType, string>;
}

/**
 * Cost/usage tracking
 */
export interface UsageMetrics {
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  duration?: number;
}