import { NextResponse } from 'next/server';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/app/lib/dataStore';
import { requireAdmin } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { validateProduct, sanitizeObject } from '@/app/lib/validate';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ success: true, products });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to fetch products.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // ✅ SECURITY FIX: Use session-based auth instead of spoofable x-admin-role header
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = validateProduct(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.errors.join(' ') }, { status: 400 });
    }

    const newProduct = await addProduct(body);
    return NextResponse.json({ success: true, product: newProduct });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to add product.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
    }
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);
    const updated = await updateProduct(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to update product.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
    }
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Product #${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete product.' }, { status: 500 });
  }
}
