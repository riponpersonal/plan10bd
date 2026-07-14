import { NextResponse } from 'next/server';
import { updateMemberProfile } from '@/app/lib/dataStore';
import { getSessionFromRequest } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { sanitizeObject } from '@/app/lib/validate';

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

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);
    const { identifier, name, phone, nid, fatherName, address, nomineeName, relation } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'User identifier is required.' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Users can only edit their own profile (admins can edit any)
    if (session.role !== 'ADMIN') {
      const reqClean = identifier.trim().toLowerCase();
      const isOwn = (
        reqClean === (session.username || '').toLowerCase() ||
        reqClean === (session.phone || '').toLowerCase() ||
        reqClean === (session.id || '').toLowerCase()
      );
      if (!isOwn) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You can only edit your own profile.' },
          { status: 403 }
        );
      }
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
