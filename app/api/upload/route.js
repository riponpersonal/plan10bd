import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function POST(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can upload files.' }, { status: 403 });
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded.' }, { status: 400 });
    }

    // Check if the uploaded object is indeed a file
    if (typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'Invalid file data.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save destination path: public/uploads/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Replace special characters to avoid file path naming issues
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeFileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.promises.writeFile(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, message: 'Failed to process file upload.' }, { status: 500 });
  }
}
