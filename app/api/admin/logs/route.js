import { NextResponse } from 'next/server';
import { getSystemLogs } from '@/app/lib/dataStore';

export async function GET() {
  try {
    const logs = getSystemLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Failed to fetch system logs:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch logs' }, { status: 500 });
  }
}
