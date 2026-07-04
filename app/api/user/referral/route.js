import { NextResponse } from 'next/server';
import { bindReferralCode } from '@/app/lib/dataStore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, referralCode, type } = body;

    if (!identifier || !referralCode) {
      return NextResponse.json(
        { success: false, message: 'Member identifier and referral code are required.' },
        { status: 400 }
      );
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
