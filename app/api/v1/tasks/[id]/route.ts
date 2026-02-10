import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Tasks proxy GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
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
  const taskId = extractId(request);
  if (!taskId) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify({ type: 'delete_task', taskId }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Tasks proxy DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

async function updateTask(request: NextRequest, taskId: string) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Tasks proxy update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

function extractId(request: NextRequest): string | null {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || null;
}
