import { NextResponse } from 'next/server';
import { getDataStore, addApplication, updateApplicationStatus, deleteApplication } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  const store = getDataStore();
  return NextResponse.json({ success: true, applications: store.applications });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newApp = addApplication(body);
    return NextResponse.json({ success: true, application: newApp, message: 'Application submitted successfully.' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to submit application.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const updated = updateApplicationStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, application: updated, message: `Application status updated to ${status}.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to update status.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Application ID is required.' }, { status: 400 });
    }
    const deleted = deleteApplication(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Application record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Application ${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete application.' }, { status: 500 });
  }
}
