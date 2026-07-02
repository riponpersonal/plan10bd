import { NextResponse } from 'next/server';
import { getOrders, addOrder, updateOrderStatus, getDataStore } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (username) {
      const store = getDataStore();
      const cleanUser = username.trim().toLowerCase();
      const userObj = store.users.find(u => u.username && u.username.toLowerCase() === cleanUser);
      const memberObj = store.members.find(m => m.memberId && m.memberId.toLowerCase() === cleanUser);
      const phone = userObj ? userObj.phone : (memberObj ? memberObj.phone : null);

      const allOrders = getOrders();
      const userOrders = allOrders.filter((o) => {
        const orderUser = o.username.toLowerCase();
        if (orderUser === cleanUser) return true;
        if (phone && orderUser === phone.trim().toLowerCase()) return true;
        return false;
      });
      return NextResponse.json({ success: true, orders: userOrders });
    }

    // Otherwise, check admin permissions and return all orders
    if (!checkAdminRole(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Access denied.' },
        { status: 403 }
      );
    }

    const orders = getOrders();
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
    const body = await request.json();
    const { username, productId } = body;

    if (!username || !productId) {
      return NextResponse.json(
        { success: false, message: 'Missing username or productId.' },
        { status: 400 }
      );
    }

    const store = getDataStore();
    const product = store.products.find((p) => p.id === Number(productId));
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found.' },
        { status: 404 }
      );
    }

    const newOrder = addOrder({
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
    if (!checkAdminRole(request)) {
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

    const updatedOrder = updateOrderStatus(orderId, status);
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
