import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AbandonedCart from '@/models/AbandonedCart';
import Order from '@/models/Order';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

const resolveItemImage = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized || normalized.toLowerCase() === '[object object]') return '';
    return normalized;
  }
  if (typeof value === 'object') {
    const nested = value.url || value.src || value.secure_url || value.image || value.thumbnail || '';
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return '';
};

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(idToken);
  const userId = decodedToken.uid;
  const storeId = await authSeller(userId);

  if (!storeId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { storeId };
}

export async function GET(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;
    const { storeId } = authResult;

    await dbConnect();
    const carts = await AbandonedCart.find({ storeId })
      .sort({ lastSeenAt: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({ carts: carts.map(c => ({ ...c, _id: String(c._id) })) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;
    const { storeId } = authResult;

    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cartId');
    const source = searchParams.get('source');

    await dbConnect();

    if (cartId) {
      const deleted = await AbandonedCart.findOneAndDelete({ _id: cartId, storeId });
      if (!deleted) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedCount: 1 });
    }

    const filter = { storeId };
    if (source && source !== 'all') {
      filter.source = source;
    }

    const result = await AbandonedCart.deleteMany(filter);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete records' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;
    const { storeId } = authResult;

    const authHeader = request.headers.get('authorization');
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const action = String(body?.action || '').trim();
    const cartId = String(body?.cartId || '').trim();
    const employeeName = String(body?.employeeName || '').trim();

    if (action !== 'convertToOrder') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!cartId) {
      return NextResponse.json({ error: 'cartId is required' }, { status: 400 });
    }

    if (!employeeName) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    await dbConnect();

    const cart = await AbandonedCart.findOne({ _id: cartId, storeId });
    if (!cart) {
      return NextResponse.json({ error: 'Abandoned checkout record not found' }, { status: 404 });
    }

    if (cart.purchased && cart.purchasedOrderId) {
      return NextResponse.json({ error: 'This record is already converted to order' }, { status: 400 });
    }

    const cartItems = Array.isArray(cart.items) ? cart.items : [];
    const normalizedItems = cartItems
      .map((item) => {
        const rawProductId = String(item?.productId || item?._id || '').trim();
        const productId = /^[a-fA-F0-9]{24}$/.test(rawProductId) ? rawProductId : undefined;
        const image =
          resolveItemImage(item?.image) ||
          resolveItemImage(item?.productImage) ||
          resolveItemImage(item?.product?.image) ||
          resolveItemImage(item?.product?.images?.[0]) ||
          resolveItemImage(item?.images?.[0]);

        return {
          productId,
          name: String(item?.name || item?.product?.name || '').trim(),
          image: image || undefined,
          productImage: image || undefined,
          price: Number(item?.price || 0),
          quantity: Math.max(1, Number(item?.quantity || 1)),
        };
      })
      .filter((item) => item.name && Number.isFinite(item.price) && item.quantity > 0);

    if (!normalizedItems.length) {
      return NextResponse.json({ error: 'No valid items found in abandoned checkout' }, { status: 400 });
    }

    const computedTotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartTotal = Number(cart.cartTotal);
    const total = Number.isFinite(cartTotal) && cartTotal > 0 ? cartTotal : computedTotal;

    const customerName = String(cart.name || '').trim();
    const customerPhone = String(cart.phone || '').trim();
    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: 'Customer name and phone are required to convert this cart' }, { status: 400 });
    }

    const shippingAddress = {
      ...(cart.address && typeof cart.address === 'object' ? cart.address : {}),
      name: customerName,
      phone: customerPhone,
    };

    const order = await Order.create({
      storeId,
      userId: cart.userId || null,
      isGuest: !cart.userId,
      guestName: customerName,
      guestEmail: String(cart.email || '').trim(),
      guestPhone: customerPhone,
      shippingAddress,
      orderItems: normalizedItems,
      items: normalizedItems,
      total,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      isPaid: false,
      status: 'ORDER_PLACED',
      notes: `Converted from abandoned checkout by ${employeeName}`,
      createdByUserId: userId,
      createdByName: employeeName,
      createdByEmail: String(decodedToken?.email || '').trim(),
      createdByType: 'STAFF',
      convertedFromAbandonedCheckout: true,
      convertedByEmployeeName: employeeName,
      convertedAt: new Date(),
      orderSource: 'WEB',
    });

    cart.purchased = true;
    cart.purchasedAt = new Date();
    cart.purchasedOrderId = order._id;
    cart.convertedByUserId = userId;
    cart.convertedByEmployeeName = employeeName;
    cart.convertedAt = new Date();
    await cart.save();

    return NextResponse.json({
      success: true,
      orderId: String(order._id),
      cart: {
        ...cart.toObject(),
        _id: String(cart._id),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to convert abandoned checkout' }, { status: 500 });
  }
}