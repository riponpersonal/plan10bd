import { NextResponse } from 'next/server';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json({ success: true, products });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to fetch products.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, message: 'Product name is required.' }, { status: 400 });
    }
    const newProduct = addProduct(body);
    return NextResponse.json({ success: true, product: newProduct });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to add product.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
    }
    const body = await request.json();
    const updated = updateProduct(id, body);
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
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admins can manage products.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
    }
    const deleted = deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Product #${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete product.' }, { status: 500 });
  }
}
