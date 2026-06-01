import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import {
    sendOrderShipped,
    sendOrderDelivered,
    sendPaymentNotification
} from '@/lib/whatsapp-webhook';

// Update order status and tracking details
export async function PUT(request, { params }) {
    try {
        await connectDB();
        
        // Firebase Auth
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split(" ")[1];
        const { getAuth } = await import('firebase-admin/auth');
        const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
        if (getApps().length === 0) {
            initializeApp({ credential: applicationDefault() });
        }
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = decodedToken.uid;
        const storeId = await authSeller(userId);
        const { orderId } = await params;

        // Read update payload
        const {
            status,
            trackingId,
            trackingUrl,
            courier,
            returnTrackingId,
            returnTrackingUrl,
            returnCourier,
            returnRequestIndex,
            replacementTrackingId,
            replacementTrackingUrl,
            replacementCourier,
            replacementRequestIndex,
            paymentMethod,
            paymentStatus,
            shippingAddress,
            guestName,
            guestEmail,
            guestPhone,
            alternatePhone,
            alternatePhoneCode
        } = await request.json();

        // Verify the order belongs to this store
        const existingOrder = await Order.findOne({
            _id: orderId,
            storeId: storeId
        })
        .populate({
            path: 'userId',
            select: 'email name'
        })
        .populate({
            path: 'orderItems.productId',
            model: 'Product'
        })
        .lean();

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
        }

        const hasReturnRequest = Array.isArray(existingOrder.returns) && existingOrder.returns.some((request) => String(request?.type || '').toUpperCase() === 'RETURN');
        const hasReplacementRequest = Array.isArray(existingOrder.returns) && existingOrder.returns.some((request) => String(request?.type || '').toUpperCase() === 'REPLACEMENT');
        const isReplacementOnlyFlow = hasReplacementRequest && !hasReturnRequest;

        // Prepare update data
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (status !== undefined) {
            const normalizedStatus = String(status || '').toUpperCase();
            if ((normalizedStatus === 'RETURNED' || normalizedStatus === 'RETURNED_REFUNDED') && !isReplacementOnlyFlow) {
                updateData.isPaid = false;
                updateData.paymentStatus = 'UNPAID';
            }
        }
        if (trackingId !== undefined) updateData.trackingId = trackingId;
        if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;
        if (courier !== undefined) updateData.courier = courier;
        if (returnTrackingId !== undefined) updateData.returnTrackingId = returnTrackingId;
        if (returnTrackingUrl !== undefined) updateData.returnTrackingUrl = returnTrackingUrl;
        if (returnCourier !== undefined) updateData.returnCourier = returnCourier;
        if (replacementTrackingId !== undefined) updateData.replacementTrackingId = replacementTrackingId;
        if (replacementTrackingUrl !== undefined) updateData.replacementTrackingUrl = replacementTrackingUrl;
        if (replacementCourier !== undefined) updateData.replacementCourier = replacementCourier;

        // Keep nested returns[] tracking fields in sync with top-level tracking fields.
        // Persist return/replacement tracking to their own request rows so saves never overwrite the wrong entry.
        const hasReturnPatch = [returnTrackingId, returnTrackingUrl, returnCourier].some((v) => typeof v !== 'undefined');
        const hasReplacementPatch = [replacementTrackingId, replacementTrackingUrl, replacementCourier].some((v) => typeof v !== 'undefined');

        if ((hasReturnPatch || hasReplacementPatch) && Array.isArray(existingOrder.returns) && existingOrder.returns.length > 0) {
            const pickIndexByType = (type) => {
                const normalizedType = String(type || '').toUpperCase();
                const byApproved = [...existingOrder.returns]
                    .map((ret, idx) => ({ ret, idx }))
                    .reverse()
                    .find(({ ret }) => {
                        const retType = String(ret?.type || '').toUpperCase();
                        const retStatus = String(ret?.status || '').toUpperCase();
                        return retType === normalizedType && retStatus.includes('APPROVED');
                    })?.idx;

                if (typeof byApproved === 'number') return byApproved;

                const byType = [...existingOrder.returns]
                    .map((ret, idx) => ({ ret, idx }))
                    .reverse()
                    .find(({ ret }) => String(ret?.type || '').toUpperCase() === normalizedType)?.idx;

                if (typeof byType === 'number') return byType;

                return existingOrder.returns.length - 1;
            };

            const requestedReturnIdx = Number.isInteger(returnRequestIndex) ? returnRequestIndex : Number(returnRequestIndex);
            const requestedReplacementIdx = Number.isInteger(replacementRequestIndex) ? replacementRequestIndex : Number(replacementRequestIndex);

            const returnIdx = (Number.isInteger(requestedReturnIdx) && requestedReturnIdx >= 0 && requestedReturnIdx < existingOrder.returns.length)
                ? requestedReturnIdx
                : pickIndexByType('RETURN');

            const replacementIdx = (Number.isInteger(requestedReplacementIdx) && requestedReplacementIdx >= 0 && requestedReplacementIdx < existingOrder.returns.length)
                ? requestedReplacementIdx
                : pickIndexByType('REPLACEMENT');

            if (hasReturnPatch && typeof returnIdx === 'number') {
                if (returnTrackingId !== undefined) updateData[`returns.${returnIdx}.returnTrackingId`] = returnTrackingId;
                if (returnTrackingUrl !== undefined) updateData[`returns.${returnIdx}.returnTrackingUrl`] = returnTrackingUrl;
                if (returnCourier !== undefined) updateData[`returns.${returnIdx}.returnCourier`] = returnCourier;
            }

            if (hasReplacementPatch && typeof replacementIdx === 'number') {
                if (replacementTrackingId !== undefined) updateData[`returns.${replacementIdx}.replacementTrackingId`] = replacementTrackingId;
                if (replacementTrackingUrl !== undefined) updateData[`returns.${replacementIdx}.replacementTrackingUrl`] = replacementTrackingUrl;
                if (replacementCourier !== undefined) updateData[`returns.${replacementIdx}.replacementCourier`] = replacementCourier;
            }
        }

        if (paymentMethod !== undefined) {
            const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase().trim();
            const allowedPaymentMethods = new Set(['COD', 'CARD', 'RAZORPAY', 'WALLET', 'STRIPE']);
            if (!allowedPaymentMethods.has(normalizedPaymentMethod)) {
                return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
            }
            updateData.paymentMethod = normalizedPaymentMethod;
            if (normalizedPaymentMethod === 'COD') {
                updateData.paymentStatus = 'PENDING';
                updateData.isPaid = false;
            } else if (!existingOrder.isPaid) {
                updateData.paymentStatus = 'PENDING';
            }
        }

        if (paymentStatus !== undefined) {
            const normalizedPaymentStatus = String(paymentStatus || '').toUpperCase().trim();
            const allowedPaymentStatuses = new Set(['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
            if (!allowedPaymentStatuses.has(normalizedPaymentStatus)) {
                return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
            }
            updateData.paymentStatus = normalizedPaymentStatus;
            updateData.isPaid = normalizedPaymentStatus === 'PAID';
        }

        if (shippingAddress !== undefined) {
            const incomingAddress = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : {};
            const mergedAddress = {
                ...(existingOrder.shippingAddress || {}),
                ...incomingAddress,
            };

            const normalizedZip = String(mergedAddress.zip || mergedAddress.pincode || '').trim();
            if (normalizedZip) {
                mergedAddress.zip = normalizedZip;
                mergedAddress.pincode = normalizedZip;
            }

            updateData.shippingAddress = mergedAddress;
        }

        if (guestName !== undefined) updateData.guestName = guestName;
        if (guestEmail !== undefined) updateData.guestEmail = guestEmail;
        if (guestPhone !== undefined) updateData.guestPhone = guestPhone;
        if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
        if (alternatePhoneCode !== undefined) updateData.alternatePhoneCode = alternatePhoneCode;

        // Update the order and return populated document so UI keeps product/user details.
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true }
        )
        .populate({
            path: 'userId',
            select: 'email name'
        })
        .populate({
            path: 'orderItems.productId',
            model: 'Product'
        })
        .lean();

        // Decide what status value to send to the email service:
        // - If the request explicitly changed status, use the updated status.
        // - If only tracking was added (no status field in body), send
        //   "no status" so the notification route can treat this as a
        //   pure tracking/AWB update email.
        const statusForEmail = (typeof status === 'undefined') ? null : updatedOrder.status;

        // Send email notification if status was included or tracking was added
        if (typeof status !== 'undefined' || typeof trackingId !== 'undefined') {
            try {
                // Call email notification API
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/order-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId: updatedOrder._id.toString(),
                        email: existingOrder.userId.email,
                        customerName: existingOrder.userId.name,
                        status: statusForEmail,
                        trackingId: updatedOrder.trackingId,
                        trackingUrl: updatedOrder.trackingUrl,
                        courier: updatedOrder.courier,
                        orderItems: existingOrder.orderItems
                    })
                });

                // Send SMS notification if phone number exists
                if (existingOrder.shippingAddress?.phone) {
                    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/order-sms`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phoneNumber: existingOrder.shippingAddress.phone,
                            orderId: updatedOrder._id.toString(),
                            customerName: existingOrder.userId.name || existingOrder.shippingAddress.name,
                            status: updatedOrder.status,
                            totalAmount: existingOrder.total,
                            trackingId: updatedOrder.trackingId,
                            trackingUrl: updatedOrder.trackingUrl,
                            courier: updatedOrder.courier
                        })
                    }).catch(smsError => {
                        console.error('SMS notification failed:', smsError);
                    });
                }

                // Send WhatsApp notification if status changed\n                if (statusForEmail) {\n                    const phoneNumber = existingOrder.guestPhone || \n                        existingOrder.alternatePhone || \n                        existingOrder.shippingAddress?.phone || \n                        existingOrder.shippingAddress?.phoneNumber;\n                    \n                    console.log('[Order API] WhatsApp check - Status:', updatedOrder.status, 'Phone:', phoneNumber);\n                    \n                    if (phoneNumber) {\n                        try {\n                            const orderForWhatsApp = {\n                                _id: updatedOrder._id,\n                                orderNumber: updatedOrder.orderNumber || updatedOrder._id.toString().slice(-6),\n                                total: updatedOrder.total,\n                                status: updatedOrder.status,\n                                trackingId: updatedOrder.trackingId,\n                                courier: updatedOrder.courier,\n                                phoneNumber: phoneNumber,\n                                customerName: existingOrder.userId.name || existingOrder.guestName || 'Customer'\n                            };\n\n                            console.log('[Order API] WhatsApp action - Status:', updatedOrder.status);\n                            if (updatedOrder.status === 'SHIPPED') {\n                                const result = await sendOrderShipped(orderForWhatsApp);\n                                console.log('[Order API] WhatsApp SHIPPED result:', result);\n                            } else if (updatedOrder.status === 'DELIVERED') {\n                                const result = await sendOrderDelivered(orderForWhatsApp);\n                                console.log('[Order API] WhatsApp DELIVERED result:', result);\n                            } else if (updatedOrder.paymentStatus === 'PAID' && !existingOrder.paymentStatus?.includes('PAID')) {\n                                const result = await sendPaymentNotification(orderForWhatsApp);\n                                console.log('[Order API] WhatsApp PAYMENT result:', result);\n                            }\n                        } catch (whatsappError) {\n                            console.error('[WhatsApp] Notification send failed:', whatsappError.message, whatsappError.stack);\n                            // Don't fail the order update if WhatsApp notification fails\n                        }\n                    } else {\n                        console.warn('[WhatsApp] No phone number found for order:', updatedOrder._id);\n                    }\n                }"
            } catch (emailError) {
                console.error('Email notification failed:', emailError);
                // Continue even if email fails
            }
        }

        return NextResponse.json({ 
            success: true, 
            order: updatedOrder,
            message: 'Order updated successfully'
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 400 });
    }
}

// Delete order
export async function DELETE(request, { params }) {
    try {
        await connectDB();
        
        // Firebase Auth
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split(" ")[1];
        const { getAuth } = await import('firebase-admin/auth');
        const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
        if (getApps().length === 0) {
            initializeApp({ credential: applicationDefault() });
        }
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = decodedToken.uid;
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        const { orderId } = await params;

        // Verify the order belongs to this store (check top-level storeId OR item-level storeId)
        const existingOrder = await Order.findById(orderId).lean();

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const topLevelMatch = String(existingOrder.storeId || '') === String(storeId);
        const itemLevelMatch = Array.isArray(existingOrder.items) &&
            existingOrder.items.some(item => String(item.storeId || '') === String(storeId));
        const orderItemsMatch = Array.isArray(existingOrder.orderItems) &&
            existingOrder.orderItems.some(item => String(item.storeId || '') === String(storeId));

        if (!topLevelMatch && !itemLevelMatch && !orderItemsMatch) {
            return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
        }

        // Delete the order
        await Order.findByIdAndDelete(orderId);

        return NextResponse.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 400 });
    }
}
