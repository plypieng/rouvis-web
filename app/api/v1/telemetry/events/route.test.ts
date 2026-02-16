import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auditEventCreateMock = vi.hoisted(() => vi.fn());
const getServerSessionFromTokenMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  authPrisma: {
    auditEvent: {
      create: auditEventCreateMock,
    },
  },
}));

vi.mock('@/lib/server-auth', () => ({
  getServerSessionFromToken: getServerSessionFromTokenMock,
}));

vi.mock('@/lib/sentry', () => ({
  captureException: captureExceptionMock,
}));

import { POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/telemetry/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/v1/telemetry/events POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionFromTokenMock.mockResolvedValue({ user: { id: 'user-1' } });
    auditEventCreateMock.mockResolvedValue({ id: 'audit-1' });
    captureExceptionMock.mockResolvedValue(undefined);
  });

  it('rejects malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/telemetry/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{"event"',
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: 'Invalid JSON body',
    });
    expect(auditEventCreateMock).not.toHaveBeenCalled();
  });

  it('rejects suggestion lifecycle events missing required properties', async () => {
    const response = await POST(makeRequest({
      event: 'suggestion_lifecycle_accepted',
      properties: {
        surface: 'project_detail',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: expect.stringContaining('Missing required telemetry properties'),
    });
    expect(auditEventCreateMock).not.toHaveBeenCalled();
  });

  it('accepts valid suggestion lifecycle events and persists audit records', async () => {
    const response = await POST(makeRequest({
      event: 'suggestion_lifecycle_suggested',
      properties: {
        suggestionId: 'handshake-123',
        suggestionType: 'reschedule_plan',
        surface: 'project_detail',
        affectedTasks: 3,
      },
    }));

    expect(response.status).toBe(204);
    expect(auditEventCreateMock).toHaveBeenCalledTimes(1);
    expect(auditEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'ux.suggestion_lifecycle_suggested',
        status: 'SUCCESS',
        resourceType: 'ux_event',
      }),
    });
    expect(auditEventCreateMock.mock.calls[0]?.[0]?.data?.metadata).toMatchObject({
      event: 'suggestion_lifecycle_suggested',
      properties: {
        suggestionId: 'handshake-123',
        suggestionType: 'reschedule_plan',
        surface: 'project_detail',
        affectedTasks: 3,
      },
      source: 'web',
      path: '/api/v1/telemetry/events',
    });
  });

  it('continues to accept non-lifecycle events for backward compatibility', async () => {
    const response = await POST(makeRequest({
      event: 'dashboard_next_best_action_viewed',
      properties: {
        mode: 'new_farmer',
        overdueCount: 2,
      },
    }));

    expect(response.status).toBe(204);
    expect(auditEventCreateMock).toHaveBeenCalledTimes(1);
    expect(auditEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ux.dashboard_next_best_action_viewed',
      }),
    });
  });

  it('rejects KPI events when required retention fields are missing', async () => {
    const response = await POST(makeRequest({
      event: 'schedule_generated',
      properties: {
        flow: 'wizard',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: expect.stringContaining('Missing required telemetry properties'),
    });
    expect(auditEventCreateMock).not.toHaveBeenCalled();
  });

  it('accepts KPI events when retention fields are present', async () => {
    const response = await POST(makeRequest({
      event: 'schedule_generated',
      properties: {
        projectId: 'project_1',
        flow: 'wizard',
        taskCount: 12,
        usedFallback: false,
      },
    }));

    expect(response.status).toBe(204);
    expect(auditEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ux.schedule_generated',
      }),
    });
  });
});
