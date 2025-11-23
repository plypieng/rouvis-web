import { NextResponse } from 'next/server';
import { getDemoFields } from '@/lib/demo-scenario';

export async function GET() {
  return NextResponse.json({ fields: getDemoFields() });
}
