import { NextResponse } from 'next/server';
import { addWithdrawalRequest } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { sanitizeObject } from '@/app/lib/validate';

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const { username, amount, method, paymentNumber } = body;
    if (!username || !amount || !method || !paymentNumber) {
      return NextResponse.json({ success: false, message: 'Username, amount, method, and payment number are required.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1000 || numAmount > 25000) {
      return NextResponse.json({ success: false, message: 'Withdrawal amount must be between ৳1,000 and ৳25,000 BDT.' }, { status: 400 });
    }

    const result = addWithdrawalRequest(username, numAmount, method, paymentNumber);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted successfully.', request: result.request });
  } catch (err) {
    console.error('Error requesting withdrawal:', err);
    return NextResponse.json({ success: false, message: 'Internal server error processing withdrawal.' }, { status: 500 });
  }
}
