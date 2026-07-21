import { NextResponse } from 'next/server';
import { getOrders, addOrder, updateOrderStatus, getDataStore } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { requireAdmin, getSessionFromRequest } from '@/app/lib/session';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUsername = searchParams.get('username');

    if (queryUsername) {
      // Require authentication to view orders
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized: Please log in to view orders.' },
          { status: 401 }
        );
      }

      // Users can only see their own orders; admins can see any
      const cleanQuery = queryUsername.trim().toLowerCase();
      const sessionUsername = (session.username || '').toLowerCase();
      const sessionPhone = (session.phone || '').toLowerCase();

      if (session.role !== 'ADMIN' && cleanQuery !== sessionUsername && cleanQuery !== sessionPhone) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You can only view your own orders.' },
          { status: 403 }
        );
      }

      const store = await getDataStore();
      const cleanUser = queryUsername.trim().toLowerCase();
      const userObj = store.users.find(u => u.username && u.username.toLowerCase() === cleanUser);
      const memberObj = store.members.find(m => m.memberId && m.memberId.toLowerCase() === cleanUser);
      const phone = userObj ? userObj.phone : (memberObj ? memberObj.phone : null);

      const allOrders = await getOrders();
      const userOrders = allOrders.filter((o) => {
        const orderUser = o.username.toLowerCase();
        if (orderUser === cleanUser) return true;
        if (phone && orderUser === phone.trim().toLowerCase()) return true;
        return false;
      });
      return NextResponse.json({ success: true, orders: userOrders });
    }

    // Otherwise, check admin permissions and return all orders
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Access denied.' },
        { status: 403 }
      );
    }

    const orders = await getOrders();
    return NextResponse.json({ success: true, orders });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve orders.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();

    const body = await request.json();
    const { username, productId } = body;

    if (!username || !productId) {
      return NextResponse.json(
        { success: false, message: 'Missing username or productId.' },
        { status: 400 }
      );
    }

    // Validate productId is a positive integer
    const numericProductId = Number(productId);
    if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid productId.' },
        { status: 400 }
      );
    }

    const store = await getDataStore();
    const product = store.products.find((p) => p.id === numericProductId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found.' },
        { status: 404 }
      );
    }

    const newOrder = await addOrder({
      username,
      productId,
      productName: product.name,
      price: product.price
    });

    return NextResponse.json({ success: true, order: newOrder, message: 'Order placed successfully!' });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to place order.' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Only admins can update order status.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId or status.' },
        { status: 400 }
      );
    }

    const VALID_STATUSES = ['PENDING', 'PROCESSING', 'DELIVERED', 'REJECTED'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status value.' }, { status: 400 });
    }

    const updatedOrder = await updateOrderStatus(orderId, status);
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to ${status}.`
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Failed to update order status.' },
      { status: 500 }
    );
  }
}
