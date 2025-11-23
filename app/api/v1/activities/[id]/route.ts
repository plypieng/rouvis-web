import { NextRequest, NextResponse } from 'next/server';
import { getDemoActivities } from '@/lib/demo-scenario';

export async function DELETE(request: NextRequest) {
  const activityId = request.nextUrl.pathname.split('/').filter(Boolean).pop();

  if (!activityId) {
    return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 });
  }

  // Demo mode keeps activities immutable for simplicity.
  const exists = getDemoActivities().some((activity) => activity.id === activityId);
  if (!exists) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  return NextResponse.json({
    error: 'Demo activities cannot be deleted',
  }, { status: 405 });
}
