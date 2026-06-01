import dbConnect from "@/lib/mongodb";
import Store from "@/models/Store";
import User from "@/models/User";
import authAdmin from "@/middlewares/authAdmin";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/firebase-admin";

async function verifyAdminRequest(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }) };
    }

    const idToken = authHeader.split(' ')[1];
    let decodedToken;
    try {
        decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (e) {
        return { error: NextResponse.json({ error: 'Invalid token', details: e.message, code: e.code }, { status: 401 }) };
    }

    const userId = decodedToken.uid;
    const email = decodedToken.email;
    const isAdmin = await authAdmin(userId, email);
    if (!isAdmin) {
        return { error: NextResponse.json({ error: 'not authorized', email }, { status: 401 }) };
    }

    return { userId, email };
}

// Get all approved stores
export async function GET(request){
    console.log('[ADMIN STORES API] Request received');
    try {
        const auth = await verifyAdminRequest(request);
        if (auth.error) return auth.error;

        await dbConnect();
        const stores = await Store.find({ status: 'approved' }).sort({ isPrimary: -1, createdAt: -1 }).lean();

        // Self-heal: ensure there is always one primary approved store.
        if (stores.length > 0 && !stores.some((s) => s.isPrimary === true)) {
            const fallbackStoreId = stores[0]._id;
            await Store.updateMany({ status: 'approved' }, { $set: { isPrimary: false } });
            await Store.updateOne({ _id: fallbackStoreId, status: 'approved' }, { $set: { isPrimary: true } });
            stores[0].isPrimary = true;
        }

        // Populate user data for each store
        for (let store of stores) {
            if (store.userId) {
                const user = await User.findById(store.userId).lean();
                store.user = user;
            }
        }

        return NextResponse.json({ stores });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// Set one approved store as primary
export async function PATCH(request) {
    try {
        const auth = await verifyAdminRequest(request);
        if (auth.error) return auth.error;

        await dbConnect();

        const body = await request.json();
        const storeId = String(body?.storeId || '').trim();
        if (!storeId) {
            return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
        }

        const targetStore = await Store.findOne({ _id: storeId, status: 'approved' }).lean();
        if (!targetStore) {
            return NextResponse.json({ error: 'Store not found or not approved' }, { status: 404 });
        }

        await Store.updateMany({ status: 'approved' }, { $set: { isPrimary: false } });
        const updateResult = await Store.updateOne(
            { _id: storeId, status: 'approved' },
            { $set: { isPrimary: true } }
        );

        if (!updateResult.modifiedCount) {
            return NextResponse.json({ error: 'Failed to set primary store' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `${targetStore.name} is now set as primary store.`,
            store: { _id: String(targetStore._id), isPrimary: true },
        });
    } catch (error) {
        console.error('[ADMIN STORES API PATCH] Error:', error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}