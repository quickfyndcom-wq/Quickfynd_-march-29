import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import CustomerReferral from '@/models/CustomerReferral';
import ReferralProgramSettings from '@/models/ReferralProgramSettings';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { restockOrderItems } from '@/lib/orderInventory';

export async function POST(request) {
    try {
        // Authenticate user
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

        // Check if user is a seller
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized - not a seller' }, { status: 403 });
        }

        // Get request body
        const { orderId, status, cancelledBy, cancelReason } = await request.json();

        if (!orderId || !status) {
            return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
        }

        // Validate status
        const validStatuses = [
            'ORDER_PLACED', 'PROCESSING', 'MANIFESTED', 'PICKUP_SCHEDULED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 
            'PAYMENT_FAILED', 'RTO', 'RETURNED', 'RETURN_INITIATED', 'RETURN_APPROVED', 'RETURN_REJECTED',
            'REPLACEMENT_REQUESTED', 'REPLACEMENT_APPROVED', 'REPLACEMENT_SHIPPED', 'REPLACEMENT_OUT_FOR_DELIVERY', 'REPLACEMENT_DELIVERED', 'REPLACED', 'RETURNED_REFUNDED',
            'RETURN_REQUESTED', 'PICKUP_REQUESTED', 'WAITING_FOR_PICKUP', 
            'PICKED_UP', 'WAREHOUSE_RECEIVED', 'OUT_FOR_DELIVERY',
            // Lowercase variants for compatibility
            'pending', 'processing', 'manifested', 'pickup_scheduled', 'shipped', 'delivered', 'cancelled', 'rto'
        ];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Allowed statuses: ${validStatuses.join(', ')}` }, { status: 400 });
        }

        // Connect to database
        await dbConnect();

        // Find and update order (ensure we get a Mongoose document, not a plain object)
        const order = await Order.findById(orderId)
            .populate({ path: 'userId', select: 'email name' })
            .exec();
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Ensure email/name fallback exists even when userId is a plain Firebase UID string.
        if (!order.email && order?.shippingAddress?.email) {
            order.email = String(order.shippingAddress.email).trim();
        }
        if (!order.name && order?.shippingAddress?.name) {
            order.name = String(order.shippingAddress.name).trim();
        }
        if (!order.email && typeof order.userId === 'string') {
            const userDoc = await User.findById(order.userId).select('email name').lean();
            if (userDoc?.email) {
                order.email = String(userDoc.email).trim();
            }
            if (!order.name && userDoc?.name) {
                order.name = String(userDoc.name).trim();
            }
        }

        // Verify that this order belongs to the seller's store
        // Check storeId at order level or in items
        const orderStoreId = order.storeId ? order.storeId.toString() : null;
        const orderItems = order.items || [];
        const itemStoreIds = orderItems.map(item => item.storeId?.toString()).filter(Boolean);
        
        const belongsToStore = orderStoreId === storeId.toString() || 
                              itemStoreIds.includes(storeId.toString());

        if (!belongsToStore) {
            console.log('[update-status] Order storeId:', orderStoreId);
            console.log('[update-status] Item storeIds:', itemStoreIds);
            console.log('[update-status] Seller storeId:', storeId);
            return NextResponse.json({ error: 'Unauthorized - order does not belong to your store' }, { status: 403 });
        }

        // Update order status
        const previousStatus = String(order.status || '').toUpperCase();
        order.status = status;
        const normalizedStatus = String(status || '').toUpperCase();
        const paymentMethod = (order.paymentMethod || '').toLowerCase();
        const hasReturnRequest = Array.isArray(order.returns) && order.returns.some((request) => String(request?.type || '').toUpperCase() === 'RETURN');
        const hasReplacementRequest = Array.isArray(order.returns) && order.returns.some((request) => String(request?.type || '').toUpperCase() === 'REPLACEMENT');
        const isReplacementOnlyFlow = hasReplacementRequest && !hasReturnRequest;
        if (!order.inventoryRestock) {
            order.inventoryRestock = { cancelled: false, returned: false };
        }

        // Cancel/revert payment if order is cancelled or payment failed
        if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'PAYMENT_FAILED') {
            order.isPaid = false;
            order.paymentStatus = (normalizedStatus === 'CANCELLED') ? 'CANCELLED' : 'FAILED';
            if (normalizedStatus === 'CANCELLED') {
                if (cancelledBy) order.cancelledBy = cancelledBy;
                if (cancelReason) order.cancelReason = cancelReason;
                if (previousStatus !== 'CANCELLED' && !order.inventoryRestock.cancelled) {
                    await restockOrderItems(order.orderItems || []);
                    order.inventoryRestock.cancelled = true;
                }
            }
        }

        if (normalizedStatus === 'RETURNED' && previousStatus !== 'RETURNED' && !order.inventoryRestock.returned) {
            await restockOrderItems(order.orderItems || []);
            order.inventoryRestock.returned = true;
        }

        if ((normalizedStatus === 'RETURNED' || normalizedStatus === 'RETURNED_REFUNDED') && !isReplacementOnlyFlow) {
            order.isPaid = false;
            order.paymentStatus = 'UNPAID';
        }

        // Auto-mark COD orders as PAID when delivered
        if (normalizedStatus === 'DELIVERED' && paymentMethod === 'cod') {
            order.isPaid = true;
        }

        // Also check if Delhivery has reported payment collected
        if (order.delhivery?.payment?.is_cod_recovered && paymentMethod === 'cod') {
            order.isPaid = true;
        }

        if (normalizedStatus === 'DELIVERED' && order.userId && !order.rewardsCredited) {
            // Fixed reward per delivered order
            const coinsEarned = 10;

            if (coinsEarned > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: order.userId },
                    {
                        $inc: { coins: coinsEarned },
                        $push: { transactions: { type: 'EARN', coins: coinsEarned, rupees: Number((coinsEarned * 1).toFixed(2)), orderId: order._id.toString() } }
                    },
                    { upsert: true, new: true }
                );
            }

            order.coinsEarned = coinsEarned;
            order.rewardsCredited = true;

            // Referral reward: invited customer's first delivered order credits inviter wallet.
            // Check if an unrewarded referral exists first — avoids fetching settings on every order.
            const pendingReferral = order.userId
                ? await CustomerReferral.findOne({
                      storeId: String(order.storeId || ''),
                      invitedUserId: String(order.userId || ''),
                      rewardedAt: null,
                  }).lean()
                : null;

            if (pendingReferral?.inviterUserId) {
                const referralSettings = await ReferralProgramSettings.findOne({ storeId: String(order.storeId || '') }).lean();
                const referralEnabled = referralSettings?.enabled !== false;
                const inviterRewardCoins = Math.max(0, Number(referralSettings?.inviterRewardCoins ?? 25));

                if (referralEnabled && inviterRewardCoins > 0) {
                    // Atomic mark-as-rewarded — guards against double-credit
                    const marked = await CustomerReferral.findOneAndUpdate(
                        {
                            _id: pendingReferral._id,
                            rewardedAt: null,
                        },
                        {
                            $set: {
                                rewardedAt: new Date(),
                                rewardCoins: inviterRewardCoins,
                                rewardedOrderId: order._id.toString(),
                            },
                        },
                        { new: true }
                    ).lean();

                    if (marked) {
                        await Wallet.findOneAndUpdate(
                            { userId: String(pendingReferral.inviterUserId) },
                            {
                                $inc: { coins: inviterRewardCoins },
                                $push: {
                                    transactions: {
                                        type: 'BONUS',
                                        coins: inviterRewardCoins,
                                        rupees: Number((inviterRewardCoins * 1).toFixed(2)),
                                        orderId: order._id.toString(),
                                        description: `Referral bonus for invited customer order ${order.shortOrderNumber || order._id.toString()}`,
                                    },
                                },
                            },
                            { upsert: true, new: true }
                        );
                    }
                }
            }
        }

        await order.save();

        // Send status update email
        try {
            const { sendOrderStatusEmail } = await import('@/lib/email');
            const emailResult = await sendOrderStatusEmail(order, status);
            console.log('[store/update-status] Email send result:', emailResult);
        } catch (emailError) {
            console.error('[store/update-status] Email sending failed:', emailError);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Order status updated and email sent',
            order: {
                _id: order._id,
                status: order.status,
                cancelledBy: order.cancelledBy || null,
                cancelReason: order.cancelReason || ''
            }
        });

    } catch (error) {
        console.error('[update-status API] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to update order status',
            message: error.message 
        }, { status: 500 });
    }
}
