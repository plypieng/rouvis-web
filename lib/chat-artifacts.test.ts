import { describe, expect, it } from 'vitest';
import {
  createArtifactFromStreamEvent,
  extractCommandHandshakeFromContent,
  extractTraceSummary,
  stripHiddenBlocks,
  traceSummaryToArtifacts,
} from './chat-artifacts';

describe('chat-artifacts reasoning trace helpers', () => {
  it('maps reasoning_trace event to reasoning artifact', () => {
    const artifact = createArtifactFromStreamEvent({
      type: 'reasoning_trace',
      stepId: 'step-1',
      phase: 'tooling',
      status: 'completed',
      title: 'Tool completed: weather.lookup',
      detail: 'Prepared weather context.',
      tool: 'weather.lookup',
      sourceEvent: 'tool_call_result',
      timestamp: '2026-02-18T06:00:00.000Z',
      confidence: 0.91,
    });

    expect(artifact).toMatchObject({
      kind: 'reasoning',
      title: 'Tool completed: weather.lookup',
      description: 'tooling',
      detail: 'Prepared weather context.',
      tone: 'safe',
      metadata: {
        stepId: 'step-1',
        status: 'completed',
        tool: 'weather.lookup',
        sourceEvent: 'tool_call_result',
        confidence: 0.91,
      },
    });
  });

  it('extracts TRACE_SUMMARY and applies dedupe + max-step cap', () => {
    const steps = Array.from({ length: 14 }, (_, i) => ({
      stepId: `s${i}`,
      phase: 'intent' as const,
      status: 'update' as const,
      title: `Step ${i}`,
      sourceEvent: 'intent_policy' as const,
      timestamp: `2026-02-18T06:${String(i).padStart(2, '0')}:00.000Z`,
    }));

    const summaryPayload = {
      v: 1,
      steps: [...steps, steps[2]],
    };
    const content = `assistant reply\n[[TRACE_SUMMARY: ${JSON.stringify(summaryPayload)}]]`;
    const summary = extractTraceSummary(content);

    expect(summary).not.toBeNull();
    expect(summary?.steps).toHaveLength(5);
    expect(summary?.steps[0]?.stepId).toBe('s9');
    expect(summary?.steps[4]?.stepId).toBe('s13');
  });

  it('removes TRACE_SUMMARY blocks from visible content', () => {
    const content = 'Visible line\n[[TRACE_SUMMARY: {"v":1,"steps":[]}]]';
    expect(stripHiddenBlocks(content)).toBe('Visible line');
  });

  it('converts trace summary to reasoning artifacts', () => {
    const artifacts = traceSummaryToArtifacts({
      v: 1,
      steps: [{
        stepId: 'trace-1',
        phase: 'synthesis',
        status: 'error',
        title: 'Execution error',
        detail: 'provider timeout',
        sourceEvent: 'error',
        timestamp: '2026-02-18T06:10:00.000Z',
      }],
    });

    expect(artifacts).toEqual([
      expect.objectContaining({
        id: 'artifact-trace-trace-1',
        kind: 'reasoning',
        tone: 'critical',
      }),
    ]);
  });

  it('extracts phenology metadata from RESCHEDULE_PLAN handshake', () => {
    const content = `確認してください\n[[RESCHEDULE_PLAN: ${JSON.stringify({
      generatedAt: '2026-02-23T00:00:00.000Z',
      proposalId: 'pp-123',
      source: 'phenology',
      triggerType: 'photo_upload',
      evidenceSummary: 'Stage drift +4d',
      items: [
        {
          id: 'task-1',
          title: 'Irrigation',
          from: '2026-02-25T00:00:00.000Z',
          to: '2026-02-27T00:00:00.000Z',
        },
      ],
    })}]]`;

    const handshake = extractCommandHandshakeFromContent({
      content,
      promptFallback: 'Apply this update.',
      source: 'chat',
    });

    expect(handshake).toMatchObject({
      proposalId: 'pp-123',
      proposalSource: 'phenology',
      triggerType: 'photo_upload',
      evidenceSummary: 'Stage drift +4d',
      summary: 'Stage drift +4d',
      affectedTasks: [
        expect.objectContaining({
          id: 'task-1',
          title: 'Irrigation',
        }),
      ],
    });
  });
});
