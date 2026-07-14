import { NextResponse } from 'next/server';
import { addWithdrawalRequest } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { getSessionFromRequest } from '@/app/lib/session';
import { sanitizeObject } from '@/app/lib/validate';

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();

    // ✅ SECURITY FIX: Require authenticated session
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const { username, amount, method, paymentNumber } = body;
    if (!username || !amount || !method || !paymentNumber) {
      return NextResponse.json({ success: false, message: 'Username, amount, method, and payment number are required.' }, { status: 400 });
    }

    // ✅ SECURITY: Users can only withdraw from their own account (admins can withdraw from any)
    if (session.role !== 'ADMIN') {
      const reqClean = username.trim().toLowerCase();
      const isOwn = (
        reqClean === (session.username || '').toLowerCase() ||
        reqClean === (session.phone || '').toLowerCase() ||
        reqClean === (session.id || '').toLowerCase()
      );
      if (!isOwn) {
        return NextResponse.json({ success: false, message: 'Forbidden: You can only request withdrawals from your own wallet.' }, { status: 403 });
      }
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1000 || numAmount > 25000) {
      return NextResponse.json({ success: false, message: 'Withdrawal amount must be between ৳1,000 and ৳25,000 BDT.' }, { status: 400 });
    }

    const result = await addWithdrawalRequest(username, numAmount, method, paymentNumber);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted successfully.', request: result.request });
  } catch (err) {
    console.error('Error requesting withdrawal:', err);
    return NextResponse.json({ success: false, message: 'Internal server error processing withdrawal.' }, { status: 500 });
  }
}
