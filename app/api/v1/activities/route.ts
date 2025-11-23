import { NextRequest, NextResponse } from 'next/server';
import {
  getDemoActivities,
  isDemoModeEnabled,
  logDemoActivity,
} from '@/lib/demo-scenario';

export async function GET(request: NextRequest) {
  const fieldId = request.nextUrl.searchParams.get('field_id') ?? undefined;
  return NextResponse.json({ activities: getDemoActivities(fieldId || undefined) });
}

export async function POST(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Activity logging requires demo mode' },
      { status: 501 },
    );
  }

  try {
    const payload = await request.json();
    const activity = logDemoActivity({
      type: payload.type || 'watering',
      field_id: payload.field_id || payload.fieldId,
      description: payload.description || payload.note || '作業記録',
      performed_at: payload.performed_at || payload.performedAt,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Failed to log activity', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 },
    );
  }
}
