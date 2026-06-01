import connectDB from '@/lib/mongodb';
import GuestUser from '@/models/GuestUser';
import Order from '@/models/Order';
import { NextResponse } from "next/server";
import { getAuth } from '@/lib/firebase-admin';

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
}

// Link guest orders to newly created user account
export async function POST(request) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        
        if (!userId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

    
        const body = await request.json();
        const email = normalizeEmail(body?.email || decodedToken?.email || '');
        const phone = normalizePhone(body?.phone || decodedToken?.phone_number || '');

        if (!email && !phone) {
            return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
        }

        const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const orderFilter = [];
        const guestUserFilter = [];

        if (email) {
            orderFilter.push({ guestEmail: { $regex: `^${escapedEmail}$`, $options: 'i' } });
            orderFilter.push({ 'shippingAddress.email': { $regex: `^${escapedEmail}$`, $options: 'i' } });
            guestUserFilter.push({ email: { $regex: `^${escapedEmail}$`, $options: 'i' } });
        }

        if (phone) {
            const last10 = phone.slice(-10);
            orderFilter.push({ guestPhone: phone });
            orderFilter.push({ guestPhone: `+${phone}` });
            orderFilter.push({ 'shippingAddress.phone': phone });
            orderFilter.push({ 'shippingAddress.phone': `+${phone}` });
            if (last10 && last10.length >= 10) {
                orderFilter.push({ guestPhone: { $regex: `${last10}$` } });
                orderFilter.push({ 'shippingAddress.phone': { $regex: `${last10}$` } });
            }

            guestUserFilter.push({ phone });
            if (last10 && last10.length >= 10) {
                guestUserFilter.push({ phone: { $regex: `${last10}$` } });
            }
        }

        const guestOrders = await Order.find({
            isGuest: true,
            $and: [
                { $or: orderFilter },
                {
                    $or: [
                        { userId: { $exists: false } },
                        { userId: null },
                        { userId: '' }
                    ]
                }
            ]
        }).lean();

        if (guestOrders.length === 0) {
            return NextResponse.json({ 
                message: "No guest orders found",
                linked: false 
            });
        }

        // Link guest orders to this user account.
        const linkResult = await Order.updateMany(
            {
                _id: { $in: guestOrders.map((order) => order._id) }
            },
            {
                $set: {
                    userId,
                    isGuest: false
                }
            }
        );

        // Best-effort: mark matching guest identities as converted.
        if (guestUserFilter.length > 0) {
            await GuestUser.updateMany(
                {
                    accountCreated: false,
                    $or: guestUserFilter
                },
                {
                    $set: {
                        accountCreated: true,
                        convertedUserId: userId,
                        convertedAt: new Date()
                    }
                }
            );
        }

        return NextResponse.json({ 
            message: `Successfully linked ${linkResult.modifiedCount || 0} guest order(s) to your account`,
            linked: (linkResult.modifiedCount || 0) > 0,
            count: linkResult.modifiedCount || 0
        });

    } catch (error) {
        console.error("Error linking guest orders:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to link guest orders" 
        }, { status: 500 });
    }
}
