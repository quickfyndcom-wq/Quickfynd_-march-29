import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

const VALID_CANCELLED_BY = new Set(['CUSTOMER', 'SELLER', 'SYSTEM', 'UNDELIVERABLE_PINCODE', 'OTHER']);

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized - not a seller' }, { status: 403 });
        }

        const { orderId, cancelledBy, cancelReason } = await request.json();
        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }
        if (cancelledBy && !VALID_CANCELLED_BY.has(cancelledBy)) {
            return NextResponse.json({ error: 'Invalid cancelledBy value' }, { status: 400 });
        }

        await dbConnect();

        const order = await Order.findById(orderId).exec();
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderStoreId = order.storeId ? String(order.storeId) : '';
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const itemStoreIds = orderItems.map(item => item?.storeId ? String(item.storeId) : '').filter(Boolean);
        const belongsToStore = orderStoreId === String(storeId) || itemStoreIds.includes(String(storeId));

        if (!belongsToStore) {
            return NextResponse.json({ error: 'Unauthorized - order does not belong to your store' }, { status: 403 });
        }

        if (String(order.status || '').toUpperCase() !== 'CANCELLED') {
            return NextResponse.json({ error: 'Only cancelled orders can store cancellation details' }, { status: 400 });
        }

        order.cancelledBy = cancelledBy || order.cancelledBy || 'SELLER';
        order.cancelReason = typeof cancelReason === 'string' ? cancelReason.trim() : '';
        await order.save();

        return NextResponse.json({
            success: true,
            message: 'Cancellation details updated',
            order: {
                _id: order._id,
                status: order.status,
                cancelledBy: order.cancelledBy || null,
                cancelReason: order.cancelReason || ''
            }
        });
    } catch (error) {
        console.error('[update-cancellation API] Error:', error);
        return NextResponse.json({
            error: 'Failed to update cancellation details',
            message: error.message
        }, { status: 500 });
    }
}