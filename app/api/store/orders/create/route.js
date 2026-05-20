import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { getAuth } = await import('firebase-admin/auth');
    const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault() });
    }

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const body = await request.json();
    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const selectedStatus = String(body?.status || 'ORDER_PLACED').toUpperCase();
    const shouldMarkPaid = Boolean(body?.isPaid) || selectedStatus === 'PAID';

    let creatorName = String(decodedToken?.name || '').trim();
    let creatorEmail = String(decodedToken?.email || '').trim();
    try {
      const creatorUser = await User.findById(userId).select('name email').lean();
      if (!creatorName) creatorName = String(creatorUser?.name || '').trim();
      if (!creatorEmail) creatorEmail = String(creatorUser?.email || '').trim();
    } catch {}

    if (!creatorName) {
      creatorName = creatorEmail || userId;
    }

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json({ error: 'Customer name and phone are required' }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one order item is required' }, { status: 400 });
    }

    const normalizedItems = items
      .map((item) => ({
        productId: item?.productId || undefined,
        name: String(item?.name || '').trim(),
        price: toNumber(item?.price, 0),
        quantity: Math.max(1, toNumber(item?.quantity, 1)),
      }))
      .filter((item) => item.name && item.price >= 0 && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'Please select valid items' }, { status: 400 });
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderDate = body?.orderDate ? new Date(body.orderDate) : new Date();
    const createdAt = Number.isNaN(orderDate.getTime()) ? new Date() : orderDate;

    const order = await Order.create({
      storeId,
      userId: null,
      isGuest: true,
      guestName: String(customer?.name || '').trim(),
      guestEmail: String(customer?.email || '').trim(),
      guestPhone: String(customer?.phone || '').trim(),
      shippingAddress: {
        name: String(customer?.name || '').trim(),
        street: String(customer?.street || '').trim(),
        city: String(customer?.city || '').trim(),
        state: String(customer?.state || '').trim(),
        country: String(customer?.country || '').trim(),
        zip: String(customer?.zip || '').trim(),
        phone: String(customer?.phone || '').trim(),
      },
      orderItems: normalizedItems,
      items: normalizedItems,
      total,
      paymentMethod: String(body?.paymentMethod || 'COD').toUpperCase(),
      notes: String(body?.notes || '').trim(),
      status: selectedStatus,
      isPaid: shouldMarkPaid,
      paymentStatus: shouldMarkPaid ? 'PAID' : 'PENDING',
      createdByUserId: userId,
      createdByName: creatorName,
      createdByEmail: creatorEmail,
      createdByType: 'STAFF',
      createdAt,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'Order created successfully', order }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create order' }, { status: 400 });
  }
}
