import type {
  CommandArtifact,
  CommandHandshake,
  CommandHandshakeTask,
  CommandRiskTone,
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
};

export type ChatkitEvent = {
  type?: string;
  delta?: { tool?: string; status?: string; content?: string; message?: string };
  citation?: { source?: string; text?: string; confidence?: number };
  action?: { type?: string; undoData?: unknown };
  toolName?: string;
  error?: { message?: string; code?: string };
  result?: unknown;
  data?: {
    type?: string;
    options?: Array<{ label?: string; value?: string }>;
    token?: string;
    summary?: string;
    expiresAt?: string;
    action?: string;
    guidance?: string[];
    severity?: 'low' | 'medium' | 'high';
    responsePolicy?: 'casual' | 'assistive' | 'workflow' | 'deep';
    primaryIntent?: string;
    confidence?: number;
    clarificationRequired?: boolean;
    reason?: string;
  };
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

export function stripHiddenBlocks(content: string): string {
  if (!content) return content;
  return content.replace(/\[\[(RESCHEDULE_PLAN|UPDATE_TASK|CHOICE):[\s\S]*?\]\]/g, '').trim();
}

export function extractReschedulePlanBlock(content: string): string | null {
  if (!content) return null;
  const matched = content.match(/\[\[RESCHEDULE_PLAN:\s*([\s\S]*?)\]\]/);
  return matched?.[0] || null;
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

  return {
    id: buildId('handshake'),
    source: params.source || 'chat',
    summary: params.summaryFallback || (tasks.length === 1 ? tasks[0].title : String(tasks.length)),
    prompt: params.promptFallback,
    affectedTasks: tasks,
    createdAt: toIsoDate(payload.generatedAt) || new Date().toISOString(),
    planRaw: matched[0],
    riskTone: riskToneFromPlan(tasks),
  };
}

export function createArtifactFromStreamEvent(event: ChatkitEvent): CommandArtifact | null {
  const eventType = event.type || '';

  if (eventType === 'tool_call_delta' && event.delta?.tool) {
    const isQueue = event.delta.tool === 'scheduler.queue';
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
