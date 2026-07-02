import { NextResponse } from 'next/server';
import { getDataStore, importDataStore, resetDataStore, addSystemLog } from '@/app/lib/dataStore';

export async function GET(request) {
  try {
    const store = getDataStore();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Local Client';
    
    // Log the database export
    addSystemLog('Database JSON Exported', ip, 'Success');
    
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error('Failed to export data store:', error);
    return NextResponse.json({ success: false, message: 'Failed to export data store' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Local Client';

    if (action === 'reset') {
      resetDataStore();
      // resetDataStore already logs reset locally, but we can stamp the IP if needed (resetDataStore sets IP as Internal by default, which is fine, or we can log it here)
      addSystemLog('Factory Reset Executed', ip, 'Success');
      return NextResponse.json({ success: true, message: 'System data reset completed successfully.' });
    } else if (action === 'import') {
      if (!data) {
        addSystemLog('Database Restore Failed (Empty Payload)', ip, 'Failure');
        return NextResponse.json({ success: false, message: 'Import data payload is missing.' }, { status: 400 });
      }
      try {
        importDataStore(data);
        addSystemLog('Database Restored from JSON Backup', ip, 'Success');
        return NextResponse.json({ success: true, message: 'System database restored successfully.' });
      } catch (validationError) {
        addSystemLog(`Database Restore Failed (${validationError.message})`, ip, 'Failure');
        return NextResponse.json({ success: false, message: validationError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid action requested.' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error in admin backup route:', error);
    return NextResponse.json({ success: false, message: error.message || 'An error occurred during operation.' }, { status: 500 });
  }
}

