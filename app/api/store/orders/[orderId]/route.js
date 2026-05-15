import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

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
            paymentMethod,
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

        // Prepare update data
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (trackingId !== undefined) updateData.trackingId = trackingId;
        if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;
        if (courier !== undefined) updateData.courier = courier;

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
