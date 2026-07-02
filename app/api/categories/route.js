import { NextResponse } from 'next/server';
import { getCategories, addCategory } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  try {
    const categories = getCategories();
    return NextResponse.json({ success: true, categories });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to fetch categories.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage categories.' }, { status: 403 });
    }
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: 'Category name is required.' }, { status: 400 });
    }
    
    const result = addCategory(body.name);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, categories: result.categories });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to add category.' }, { status: 500 });
  }
}
