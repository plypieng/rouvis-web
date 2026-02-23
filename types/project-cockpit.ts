export type CockpitPanelMode = 'chat' | 'calendar';

export type ProjectTaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  description?: string;
  priority?: string;
};

export type TaskMovePayload = {
  taskId: string;
  toDate: string;
};

export type QuickApplyState = {
  status: 'idle' | 'running' | 'success' | 'error';
  reason?: string;
};

export type QuickApplyResult = {
  applied: boolean;
  reason?: string;
};

export type CommandRiskTone = 'safe' | 'watch' | 'warning' | 'critical';

export type ReasoningTracePhase = 'intent' | 'tooling' | 'synthesis';
export type ReasoningTraceStatus = 'started' | 'update' | 'completed' | 'error';
export type ReasoningTraceSourceEvent =
  | 'intent_policy'
  | 'tool_call_delta'
  | 'tool_call_result'
  | 'error'
  | 'response_reasoning_summary';

export type ReasoningTraceStep = {
  stepId: string;
  phase: ReasoningTracePhase;
  status: ReasoningTraceStatus;
  title: string;
  detail?: string;
  tool?: string;
  toolCallId?: string;
  confidence?: number;
  sourceEvent: ReasoningTraceSourceEvent;
  timestamp: string;
};

export type ReasoningTraceSummary = {
  v: 1;
  steps: ReasoningTraceStep[];
};

export type CommandHandshakeTask = {
  id: string;
  title: string;
  dueDate: string;
  fromDate?: string;
  toDate?: string;
  reason?: string;
};

export type PhenologyProposalSource = 'phenology';
export type PhenologyTriggerType =
  | 'photo_upload'
  | 'gdd_threshold'
  | 'harvest_drift_threshold'
  | 'manual';
export type PhenologyFeedbackReason =
  | 'field_immature'
  | 'field_more_advanced'
  | 'local_weather_differs'
  | 'labor_constraint'
  | 'input_error'
  | 'other';

export type CommandHandshake = {
  id: string;
  source: 'chat' | 'calendar';
  summary: string;
  prompt: string;
  affectedTasks: CommandHandshakeTask[];
  createdAt: string;
  planRaw?: string;
  riskTone?: CommandRiskTone;
  proposalId?: string;
  proposalSource?: PhenologyProposalSource;
  triggerType?: PhenologyTriggerType;
  evidenceSummary?: string;
};

export type CommandArtifactKind =
  | 'status'
  | 'citation'
  | 'action_receipt'
  | 'choice'
  | 'plan'
  | 'queue'
  | 'memory'
  | 'reasoning'
  | 'error';

export type CommandArtifact = {
  id: string;
  kind: CommandArtifactKind;
  title: string;
  description?: string;
  detail?: string;
  tone?: CommandRiskTone;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
