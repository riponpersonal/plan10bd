import { NextResponse } from 'next/server';
import { bindReferralCode } from '@/app/lib/dataStore';
import { getSessionFromRequest } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';

export async function POST(request) {
  try {
    // ✅ SECURITY FIX: Require CSRF + authenticated session
    if (!validateOrigin(request)) return csrfDenied();

    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Please log in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { identifier, referralCode, type } = body;

    if (!identifier || !referralCode) {
      return NextResponse.json(
        { success: false, message: 'Member identifier and referral code are required.' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Users can only bind referral codes for their own account
    if (session.role !== 'ADMIN') {
      const reqClean = identifier.trim().toLowerCase();
      const isOwn = (
        reqClean === (session.username || '').toLowerCase() ||
        reqClean === (session.phone || '').toLowerCase() ||
        reqClean === (session.id || '').toLowerCase()
      );
      if (!isOwn) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You can only bind referral codes for your own account.' },
          { status: 403 }
        );
      }
    }

    const result = bindReferralCode(identifier, referralCode, type || 'investor');

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error binding referral code:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error processing referral code.' },
      { status: 500 }
    );
  }
}
