import { NextRequest, NextResponse } from 'next/server';
import {
  createDemoTask,
  getDemoTasks,
  isDemoModeEnabled,
} from '@/lib/demo-scenario';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const fieldId = search.get('fieldId') ?? search.get('field_id');
  const date = search.get('date');
  const startDate = search.get('start_date');
  const endDate = search.get('end_date');

  const tasks = getDemoTasks({
    fieldId,
    date,
    startDate,
    endDate,
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Task creation requires demo mode' },
      { status: 501 },
    );
  }

  try {
    const payload = await request.json();
    const task = createDemoTask(payload);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create demo task', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 },
    );
  }
}
