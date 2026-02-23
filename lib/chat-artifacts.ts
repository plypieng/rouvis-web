import type {
  CommandArtifact,
  CommandHandshake,
  CommandHandshakeTask,
  CommandRiskTone,
  PhenologyTriggerType,
  ReasoningTracePhase,
  ReasoningTraceSourceEvent,
  ReasoningTraceStatus,
  ReasoningTraceStep,
  ReasoningTraceSummary,
} from '@/types/project-cockpit';

type ReschedulePlanItem = {
  id?: unknown;
  title?: unknown;
  from?: unknown;
  to?: unknown;
  dueDate?: unknown;
  reason?: unknown;
};

type ReschedulePlanPayload = {
  generatedAt?: unknown;
  items?: unknown;
  proposalId?: unknown;
  source?: unknown;
  triggerType?: unknown;
  evidenceSummary?: unknown;
};

const TRACE_SUMMARY_PATTERN = /\[\[TRACE_SUMMARY:\s*([\s\S]*?)\]\]/;
const TRACE_MAX_STEPS = 5;

export type ChatkitEvent = {
  type?: string;
  delta?: { tool?: string; status?: string; content?: string; message?: string };
  citation?: { source?: string; text?: string; confidence?: number };
  action?: { type?: string; undoData?: unknown };
  toolName?: string;
  error?: { message?: string; code?: string };
  reasoning?: {
    input?: string;
    steps?: string[];
    conclusion?: string;
  };
  result?: unknown;
  data?: {
    type?: string;
    options?: Array<{ label?: string; value?: string }>;
    token?: string;
    summary?: string;
    expiresAt?: string;
    action?: string;
    question?: string;
    requiresConfirmation?: boolean;
    guidance?: string[];
    severity?: 'low' | 'medium' | 'high';
    responsePolicy?: 'casual' | 'assistive' | 'workflow' | 'deep';
    primaryIntent?: string;
    confidence?: number;
    clarificationRequired?: boolean;
    reason?: string;
  };
  stepId?: string;
  phase?: ReasoningTracePhase;
  status?: ReasoningTraceStatus;
  title?: string;
  detail?: string;
  tool?: string;
  toolCallId?: string;
  confidence?: number;
  sourceEvent?: ReasoningTraceSourceEvent;
  timestamp?: string;
};

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function toDateLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toPhenologyTriggerType(value: unknown): PhenologyTriggerType | undefined {
  if (
    value === 'photo_upload'
    || value === 'gdd_threshold'
    || value === 'harvest_drift_threshold'
    || value === 'manual'
  ) {
    return value;
  }
  return undefined;
}

function toTask(item: ReschedulePlanItem): CommandHandshakeTask | null {
  const id = typeof item.id === 'string' && item.id.trim() ? item.id : '';
  const title = typeof item.title === 'string' && item.title.trim() ? item.title : id;
  const toDate = toDateLabel(item.to) || toDateLabel(item.dueDate);
  if (!toDate || !title) return null;

  return {
    id: id || buildId('task'),
    title,
    dueDate: toDate,
    fromDate: toDateLabel(item.from),
    toDate,
    reason: typeof item.reason === 'string' ? item.reason : undefined,
  };
}

function riskToneFromPlan(tasks: CommandHandshakeTask[]): CommandRiskTone {
  if (tasks.length >= 6) return 'critical';
  if (tasks.length >= 4) return 'warning';
  if (tasks.length >= 2) return 'watch';
  return 'safe';
}

function parsePlanPayload(raw: string): ReschedulePlanPayload | null {
  try {
    const parsed = JSON.parse(raw) as ReschedulePlanPayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function isTracePhase(value: unknown): value is ReasoningTracePhase {
  return value === 'intent' || value === 'tooling' || value === 'synthesis';
}

function isTraceStatus(value: unknown): value is ReasoningTraceStatus {
  return value === 'started' || value === 'update' || value === 'completed' || value === 'error';
}

function isTraceSourceEvent(value: unknown): value is ReasoningTraceSourceEvent {
  return value === 'intent_policy'
    || value === 'tool_call_delta'
    || value === 'tool_call_result'
    || value === 'error'
    || value === 'response_reasoning_summary';
}

function coerceTraceTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toReasoningTraceStep(event: ChatkitEvent): ReasoningTraceStep | null {
  if (event.type !== 'reasoning_trace') return null;
  if (!isTracePhase(event.phase) || !isTraceStatus(event.status) || !isTraceSourceEvent(event.sourceEvent)) {
    return null;
  }
  if (typeof event.title !== 'string' || !event.title.trim()) return null;

  return {
    stepId: typeof event.stepId === 'string' && event.stepId.trim()
      ? event.stepId
      : buildId('trace'),
    phase: event.phase,
    status: event.status,
    title: event.title,
    detail: typeof event.detail === 'string' ? event.detail : undefined,
    tool: typeof event.tool === 'string' ? event.tool : undefined,
    toolCallId: typeof event.toolCallId === 'string' ? event.toolCallId : undefined,
    confidence: typeof event.confidence === 'number' ? event.confidence : undefined,
    sourceEvent: event.sourceEvent,
    timestamp: coerceTraceTimestamp(event.timestamp),
  };
}

function toTraceTone(step: ReasoningTraceStep): CommandRiskTone {
  if (step.status === 'error') return 'critical';
  if (step.status === 'completed') return 'safe';
  return 'watch';
}

function dedupeAndCapTraceSteps(steps: ReasoningTraceStep[], maxSteps = TRACE_MAX_STEPS): ReasoningTraceStep[] {
  const order: string[] = [];
  const latestById = new Map<string, ReasoningTraceStep>();

  for (const step of steps) {
    if (!step || typeof step.stepId !== 'string') continue;
    if (!latestById.has(step.stepId)) {
      order.push(step.stepId);
    }
    latestById.set(step.stepId, step);
  }

  const deduped = order
    .map(stepId => latestById.get(stepId))
    .filter((step): step is ReasoningTraceStep => Boolean(step));
  if (deduped.length <= maxSteps) return deduped;
  return deduped.slice(deduped.length - maxSteps);
}

export function stripHiddenBlocks(content: string): string {
  if (!content) return content;
  return content.replace(/\[\[(RESCHEDULE_PLAN|UPDATE_TASK|CREATE_TASK|CHOICE|TRACE_SUMMARY):[\s\S]*?\]\]/g, '').trim();
}

export function extractReschedulePlanBlock(content: string): string | null {
  if (!content) return null;
  const matched = content.match(/\[\[RESCHEDULE_PLAN:\s*([\s\S]*?)\]\]/);
  return matched?.[0] || null;
}

export function extractTraceSummary(content: string): ReasoningTraceSummary | null {
  if (!content) return null;
  const matched = content.match(TRACE_SUMMARY_PATTERN);
  if (!matched?.[1]) return null;

  try {
    const parsed = JSON.parse(matched[1]) as ReasoningTraceSummary;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.steps)) return null;

    const steps = dedupeAndCapTraceSteps(parsed.steps.filter((step): step is ReasoningTraceStep => (
      Boolean(step)
      && typeof step.stepId === 'string'
      && isTracePhase(step.phase)
      && isTraceStatus(step.status)
      && typeof step.title === 'string'
      && isTraceSourceEvent(step.sourceEvent)
      && typeof step.timestamp === 'string'
    )));

    return {
      v: 1,
      steps,
    };
  } catch {
    return null;
  }
}

export function traceSummaryToArtifacts(summary: ReasoningTraceSummary | null): CommandArtifact[] {
  if (!summary || !Array.isArray(summary.steps) || summary.steps.length === 0) return [];
  return summary.steps.map((step) => ({
    id: `artifact-trace-${step.stepId}`,
    kind: 'reasoning',
    title: step.title,
    description: step.phase,
    detail: step.detail,
    tone: toTraceTone(step),
    createdAt: step.timestamp,
    metadata: {
      stepId: step.stepId,
      status: step.status,
      tool: step.tool,
      toolCallId: step.toolCallId,
      sourceEvent: step.sourceEvent,
      confidence: step.confidence,
    },
  }));
}

export function extractCommandHandshakeFromContent(params: {
  content: string;
  promptFallback: string;
  summaryFallback?: string;
  source?: 'chat' | 'calendar';
}): CommandHandshake | null {
  const matched = params.content.match(/\[\[RESCHEDULE_PLAN:\s*([\s\S]*?)\]\]/);
  if (!matched?.[1]) return null;

  const payload = parsePlanPayload(matched[1]);
  if (!payload) return null;

  const items = Array.isArray(payload.items) ? (payload.items as ReschedulePlanItem[]) : [];
  const tasks = items.map(toTask).filter(Boolean) as CommandHandshakeTask[];
  if (tasks.length === 0) return null;
  const proposalId = toNonEmptyString(payload.proposalId);
  const proposalSource = payload.source === 'phenology' ? 'phenology' : undefined;
  const triggerType = toPhenologyTriggerType(payload.triggerType);
  const evidenceSummary = toNonEmptyString(payload.evidenceSummary);
  const fallbackSummary = tasks.length === 1 ? tasks[0].title : String(tasks.length);

  return {
    id: buildId('handshake'),
    source: params.source || 'chat',
    summary: params.summaryFallback || evidenceSummary || fallbackSummary,
    prompt: params.promptFallback,
    affectedTasks: tasks,
    createdAt: toIsoDate(payload.generatedAt) || new Date().toISOString(),
    planRaw: matched[0],
    riskTone: riskToneFromPlan(tasks),
    proposalId,
    proposalSource,
    triggerType,
    evidenceSummary,
  };
}

export function createArtifactFromStreamEvent(event: ChatkitEvent): CommandArtifact | null {
  const eventType = event.type || '';

  if (eventType === 'reasoning_trace') {
    const step = toReasoningTraceStep(event);
    if (!step) return null;
    return {
      id: `artifact-trace-${step.stepId}`,
      kind: 'reasoning',
      title: step.title,
      description: step.phase,
      detail: step.detail,
      tone: toTraceTone(step),
      createdAt: step.timestamp,
      metadata: {
        stepId: step.stepId,
        status: step.status,
        tool: step.tool,
        toolCallId: step.toolCallId,
        sourceEvent: step.sourceEvent,
        confidence: step.confidence,
      },
    };
  }

  if (eventType === 'tool_call_delta' && event.delta?.tool) {
    const isQueue = event.delta.tool === 'scheduler.queue'
      || event.delta.tool === 'spawn_background_worker';
    const status = event.delta.status || 'running';
    const tone: CommandRiskTone = status === 'error'
      ? 'critical'
      : status === 'completed'
        ? 'safe'
        : 'watch';

    return {
      id: buildId('artifact'),
      kind: isQueue ? 'queue' : 'status',
      title: isQueue ? 'Queue Update' : 'Tool Execution',
      description: event.delta.tool,
      detail: event.delta.message,
      tone,
      createdAt: new Date().toISOString(),
      metadata: {
        tool: event.delta.tool,
        status,
      },
    };
  }

  if (eventType === 'citation' && event.citation?.source) {
    return {
      id: buildId('artifact'),
      kind: 'citation',
      title: 'Citation',
      description: event.citation.source,
      detail: event.citation.text,
      tone: 'watch',
      createdAt: new Date().toISOString(),
      metadata: {
        source: event.citation.source,
        confidence: event.citation.confidence,
      },
    };
  }

  if (eventType === 'action_confirmation' && event.action?.type) {
    return {
      id: buildId('artifact'),
      kind: 'action_receipt',
      title: 'Action Receipt',
      description: event.action.type,
      tone: 'safe',
      createdAt: new Date().toISOString(),
      metadata: {
        actionType: event.action.type,
        undoable: Boolean(event.action.undoData),
      },
    };
  }

  if (eventType === 'custom_ui' && event.data?.type === 'choice') {
    return {
      id: buildId('artifact'),
      kind: 'choice',
      title: 'Operator Choice',
      description: `${event.data.options?.length || 0} options available`,
      tone: 'watch',
      createdAt: new Date().toISOString(),
      metadata: {
        options: event.data.options || [],
      },
    };
  }

  if (eventType === 'intent_policy' && event.data?.responsePolicy) {
    const tone: CommandRiskTone = event.data.responsePolicy === 'workflow' || event.data.responsePolicy === 'deep'
      ? 'watch'
      : 'safe';
    return {
      id: buildId('artifact'),
      kind: 'status',
      title: 'Intent Policy',
      description: event.data.responsePolicy,
      detail: event.data.primaryIntent || event.data.reason,
      tone,
      createdAt: new Date().toISOString(),
      metadata: {
        confidence: event.data.confidence,
        clarificationRequired: event.data.clarificationRequired,
      },
    };
  }

  if (eventType === 'error') {
    return {
      id: buildId('artifact'),
      kind: 'error',
      title: 'Execution Error',
      description: event.error?.message || 'Unknown error',
      detail: event.error?.code,
      tone: 'critical',
      createdAt: new Date().toISOString(),
      metadata: {
        code: event.error?.code,
      },
    };
  }

  return null;
}
