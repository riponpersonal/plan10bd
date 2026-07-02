import { NextResponse } from 'next/server';
import { updateMemberProfile } from '@/app/lib/dataStore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, name, phone, nid, fatherName, address, nomineeName, relation } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'User identifier is required.' },
        { status: 400 }
      );
    }

    const updated = updateMemberProfile(identifier, {
      name,
      phone,
      nid,
      fatherName,
      address,
      nomineeName,
      relation
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to update member profile. Member record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member profile updated successfully.'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error updating profile.' },
      { status: 500 }
    );
  }
}
