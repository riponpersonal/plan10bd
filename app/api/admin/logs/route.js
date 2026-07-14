import { NextResponse } from 'next/server';
import { getSystemLogs } from '@/app/lib/dataStore';
import { requireAdmin } from '@/app/lib/session';

export async function GET(request) {
  try {
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }
    const logs = await getSystemLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Failed to fetch system logs:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch logs' }, { status: 500 });
  }
}
