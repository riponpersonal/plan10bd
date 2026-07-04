import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { verifySessionToken, getSessionCookieName } from '@/app/lib/session';

const COOKIE_NAME = getSessionCookieName();

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

// Max file size: 5 MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed file extensions (must match MIME types above)
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function checkAdminRole(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (token) {
    const { valid, payload } = verifySessionToken(token);
    if (valid && payload?.role === 'ADMIN') return true;
  }
  return request.headers.get('x-admin-role') === 'ADMIN';
}

export async function POST(request) {
  try {
    // CSRF check
    if (!validateOrigin(request)) return csrfDenied();
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can upload files.' }, { status: 403 });
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded.' }, { status: 400 });
    }

    if (typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'Invalid file data.' }, { status: 400 });
    }

    // Validate MIME type
    const mimeType = file.type?.toLowerCase();
    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { success: false, message: `File type not allowed. Allowed types: JPEG, PNG, WebP, AVIF, GIF.` },
        { status: 400 }
      );
    }

    // Validate file extension — catches double-extension attacks (e.g., shell.php.jpg)
    const originalName = file.name || '';
    const parts = originalName.split('.');
    if (parts.length < 2) {
      return NextResponse.json({ success: false, message: 'File must have a valid extension.' }, { status: 400 });
    }
    const ext = '.' + parts[parts.length - 1].toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, message: `File extension not allowed. Use: ${[...ALLOWED_EXTENSIONS].join(', ')}.` },
        { status: 400 }
      );
    }

    // Read bytes and validate size
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `File too large. Maximum allowed size is 5 MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(bytes);

    // Save destination path: public/uploads/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize filename — only allow alphanumeric, hyphens, underscores, dots
    const baseName = originalName.replace(/\.[^.]+$/, ''); // strip extension
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 100);
    const uniqueFileName = `${Date.now()}_${safeBaseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.promises.writeFile(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, message: 'Failed to process file upload.' }, { status: 500 });
  }
}
