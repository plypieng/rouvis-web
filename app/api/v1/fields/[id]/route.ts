import { NextRequest, NextResponse } from 'next/server';
import { getDemoFieldById } from '@/lib/demo-scenario';

export async function GET(request: NextRequest) {
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return NextResponse.json({ error: 'Invalid field id' }, { status: 400 });
  }

  const field = getDemoFieldById(fieldId);
  if (!field) {
    return NextResponse.json({ error: 'Field not found' }, { status: 404 });
  }

  return NextResponse.json(field);
}
