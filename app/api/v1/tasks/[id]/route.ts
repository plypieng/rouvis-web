import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDemoTask,
  getDemoTasks,
  isDemoModeEnabled,
  updateDemoTask,
} from '@/lib/demo-scenario';

export async function GET(request: NextRequest) {
  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }
  const task = getDemoTasks().find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function PATCH(request: NextRequest) {
  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }
  return updateTask(request, taskId);
}

export async function PUT(request: NextRequest) {
  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }
  return updateTask(request, taskId);
}

export async function DELETE(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Deletion requires demo mode' },
      { status: 501 },
    );
  }

  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  deleteDemoTask(taskId);
  return NextResponse.json({ success: true });
}

async function updateTask(request: NextRequest, taskId: string) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Updates require demo mode' },
      { status: 501 },
    );
  }

  try {
    const payload = await request.json();
    const updated = updateDemoTask(taskId, payload);

    if (!updated) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Failed to update demo task', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 },
    );
  }
}

function extractId(request: NextRequest): string | null {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || null;
}
