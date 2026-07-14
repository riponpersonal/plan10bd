import { NextResponse } from 'next/server';
import { getWithdrawals, updateWithdrawalStatus } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { requireAdmin } from '@/app/lib/session';
import { sanitizeObject } from '@/app/lib/validate';

export async function GET(request) {
  try {
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }
    const list = await getWithdrawals();
    return NextResponse.json({ success: true, withdrawals: list });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const { action, requestId } = body;
    if (!action || !requestId) {
      return NextResponse.json({ success: false, message: 'Action and requestId are required.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, message: 'Invalid action. Must be approve or reject.' }, { status: 400 });
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const result = await updateWithdrawalStatus(requestId, status);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Withdrawal request successfully ${action}d.`, request: result.request });
  } catch (err) {
    console.error('Error handling withdrawal request:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
