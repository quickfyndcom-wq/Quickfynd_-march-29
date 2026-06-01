import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderCounter from '@/models/OrderCounter';
import Product from '@/models/Product';
import User from '@/models/User';
import Address from '@/models/Address';
import { fetchNormalizedDelhiveryTracking } from '@/lib/delhivery';
import { fetchSeventeenTrackInfo } from '@/lib/seventeentrack';
import Store from '@/models/Store';

const ORDER_NUMBER_SEQUENCE_KEY = 'short_order_number';
const ORDER_NUMBER_START = 52300;

function hasValidShortOrderNumber(value) {
    if (value === null || value === undefined) return false;
    const normalized = String(value).trim();
    return /^\d{5,6}$/.test(normalized) && Number(normalized) >= ORDER_NUMBER_START;
}

async function getNextShortOrderNumber() {
    const incremented = await OrderCounter.findOneAndUpdate(
        { key: ORDER_NUMBER_SEQUENCE_KEY },
        { $inc: { value: 1 } },
        { new: true }
    );

    if (incremented) {
        return Number(incremented.value);
    }

    try {
        const created = await OrderCounter.create({
            key: ORDER_NUMBER_SEQUENCE_KEY,
            value: ORDER_NUMBER_START,
        });
        return Number(created.value);
    } catch (error) {
        if (error?.code === 11000) {
            const retried = await OrderCounter.findOneAndUpdate(
                { key: ORDER_NUMBER_SEQUENCE_KEY },
                { $inc: { value: 1 } },
                { new: true }
            );
            if (retried) return Number(retried.value);
        }
        throw error;
    }
}

// Debug log helper
function debugLog(...args) {
    try { console.log('[ORDER API DEBUG]', ...args); } catch {}
}

function mapDelhiveryStatusToOrderStatus(delhivery, currentStatus = '') {
    if (!delhivery) return null;

    const texts = [];
    if (delhivery.current_status) {
        texts.push(String(delhivery.current_status).toLowerCase());
    }

    if (Array.isArray(delhivery.events) && delhivery.events.length > 0) {
        const latestEvent = delhivery.events.reduce((latest, event) => {
            if (!latest) return event;
            const latestTime = new Date(latest.time || latest.timestamp || 0).getTime();
            const eventTime = new Date(event.time || event.timestamp || 0).getTime();
            return eventTime > latestTime ? event : latest;
        }, null);
        if (latestEvent?.status) {
            texts.push(String(latestEvent.status).toLowerCase());
        }
    }

    if (texts.length === 0) return null;
    const combined = texts.join(' | ');
    const current = String(currentStatus || '').toUpperCase();

    if (combined.includes('delivered')) return 'DELIVERED';
    if (combined.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
    if (
        combined.includes('rto') ||
        combined.includes('return to origin') ||
        combined.includes('return accepted') ||
        combined.includes('dispatched for rto')
    ) return 'RTO';

    if (
        combined.includes('in transit') ||
        combined.includes('dispatched') ||
        combined.includes('shipped') ||
        combined.includes('forwarded')
    ) {
        if (['ORDER_PLACED', 'PROCESSING', 'WAITING_FOR_PICKUP', 'PICKUP_REQUESTED'].includes(current)) {
            return 'SHIPPED';
        }
    }

    return null;
}

function mapAddressToShippingAddress(address = {}) {
    if (!address || typeof address !== 'object') return null;

    const zip = String(address.zip || address.pincode || '').trim();

    return {
        name: address.name || '',
        email: address.email || '',
        phone: address.phone || '',
        phoneCode: address.phoneCode || '+91',
        alternatePhone: address.alternatePhone || '',
        alternatePhoneCode: address.alternatePhoneCode || address.phoneCode || '+91',
        houseNumber: address.houseNumber || '',
        street: address.street || address.address || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || '',
        district: address.district || '',
        zip,
        pincode: zip,
    };
}



// Update seller order status
export async function POST(request) {
    try {
        await connectDB();
        
        // Firebase Auth: Extract token from Authorization header
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
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        const storeId = await authSeller(userId)
        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {orderId, status } = await request.json()

        await Order.findOneAndUpdate(
            { _id: orderId, storeId },
            { status }
        );

        return NextResponse.json({message: "Order Status updated"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a seller
export async function GET(request){
    console.log('[ORDER API ROUTE] Route hit');
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const includeDelhivery = searchParams.get('withDelhivery') !== 'false';
        
        // Firebase Auth: Extract token from Authorization header
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
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        debugLog('userId from Firebase:', userId);
        const storeId = await authSeller(userId)
        debugLog('storeId from authSeller:', storeId);
        if(!storeId){
            debugLog('Not authorized: no storeId');
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const orderDocs = await Order.find({ storeId })
            .populate('addressId')
            .populate({
                path: 'orderItems.productId',
                model: 'Product'
            })
            .sort({ createdAt: -1 })
            ;

        const orders = orderDocs.map((orderDoc) => orderDoc.toObject());
        
        debugLog('orders found:', orders.length);
        
        // Manually populate userId since it's a String-type _id
        for (let order of orders) {
            if (!order.shippingAddress && order.addressId && typeof order.addressId === 'object') {
                const hydratedShippingAddress = mapAddressToShippingAddress(order.addressId);
                if (hydratedShippingAddress) {
                    order.shippingAddress = hydratedShippingAddress;
                    if (!order.alternatePhone && hydratedShippingAddress.alternatePhone) {
                        order.alternatePhone = hydratedShippingAddress.alternatePhone;
                    }
                    if (!order.alternatePhoneCode && hydratedShippingAddress.alternatePhoneCode) {
                        order.alternatePhoneCode = hydratedShippingAddress.alternatePhoneCode;
                    }
                }
            }

            if (order.userId && !order.isGuest) {
                const user = await User.findById(order.userId).lean();
                if (user && (user.name || user.email)) {
                    // User has data in database
                    order.userId = user;
                    debugLog('User populated from DB for order:', order._id, 'User:', { name: user.name, email: user.email });
                } else {
                    // User exists but has no data, or doesn't exist - try Firebase
                    debugLog('User missing data in DB, fetching from Firebase for:', order.userId);
                    try {
                        const firebaseUser = await getAuth().getUser(order.userId);
                        const userData = {
                            _id: order.userId,
                            name: firebaseUser.displayName || '',
                            email: firebaseUser.email || '',
                            image: firebaseUser.photoURL || ''
                        };
                        order.userId = userData;
                        // Update database with Firebase data
                        await User.findByIdAndUpdate(userData._id, userData, { upsert: true });
                        debugLog('User synced from Firebase:', userData);
                    } catch (fbError) {
                        debugLog('Firebase user fetch failed:', fbError.message);
                        order.userId = user || { _id: order.userId, name: 'Unknown', email: '' };
                    }
                }
            }
        }
        
        if (orders.length > 0) {
            debugLog('First order after population:', {
                _id: orders[0]._id,
                userId: orders[0].userId,
                userIdType: typeof orders[0].userId,
                shippingAddress: orders[0].shippingAddress,
                isGuest: orders[0].isGuest
            });
        }

        // Backfill missing item images for older converted/manual orders by matching product name.
        const normalizeName = (value) => String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();

        const storeProducts = await Product.find({ storeId })
            .select('name image images')
            .lean();
        const productImageByName = new Map();
        for (const product of storeProducts) {
            const key = normalizeName(product?.name);
            if (!key || productImageByName.has(key)) continue;
            const image = product?.image || product?.images?.[0] || '';
            if (typeof image === 'string' && image.trim()) {
                productImageByName.set(key, image.trim());
            }
        }

        for (const order of orders) {
            if (!Array.isArray(order?.orderItems)) continue;
            order.orderItems = order.orderItems.map((item) => {
                const existingImage =
                    item?.image ||
                    item?.productImage ||
                    item?.productId?.image ||
                    item?.productId?.images?.[0] ||
                    item?.product?.image ||
                    item?.product?.images?.[0] ||
                    '';

                if (typeof existingImage === 'string' && existingImage.trim() && existingImage !== '[object Object]') {
                    return item;
                }

                const itemName = item?.name || item?.productId?.name || item?.product?.name || '';
                const imageFromName = productImageByName.get(normalizeName(itemName));
                if (!imageFromName) return item;

                return {
                    ...item,
                    image: imageFromName,
                    productImage: imageFromName,
                };
            });
        }

        let enrichedOrders = orders;
        if (includeDelhivery) {
            const shouldFetchDelhivery = (order) => {
                const trackingId = order.trackingId || order.awb || order.airwayBillNo;
                const courier = (order.courier || '').toLowerCase();
                // Only stop fetching once an order is fully delivered or returned.
                const isTerminal = ['DELIVERED', 'RETURNED'].includes(order.status);
                return Boolean(trackingId) && (courier.includes('delhivery') || !order.trackingUrl) && !isTerminal;
            };

            enrichedOrders = await Promise.all(orders.map(async (order) => {
                if (!shouldFetchDelhivery(order)) return order;
                const trackingId = order.trackingId || order.awb || order.airwayBillNo;
                try {
                    const normalized = await fetchNormalizedDelhiveryTracking(trackingId);
                    if (normalized) {
                        let syncedStatus = order.status;
                        const mappedStatus = mapDelhiveryStatusToOrderStatus(normalized.delhivery, order.status);
                        if (mappedStatus && String(mappedStatus).toUpperCase() !== String(order.status || '').toUpperCase()) {
                            syncedStatus = mappedStatus;
                            try {
                                await Order.updateOne(
                                    { _id: order._id, storeId },
                                    { $set: { status: mappedStatus } }
                                );
                            } catch (statusErr) {
                                debugLog('Status auto-sync failed for order', order._id, statusErr?.message || statusErr);
                            }
                        }

                        return {
                            ...order,
                            status: syncedStatus,
                            courier: normalized.courier || order.courier,
                            trackingId: normalized.trackingId || order.trackingId,
                            trackingUrl: normalized.trackingUrl || order.trackingUrl,
                            delhivery: normalized.delhivery
                        };
                    }
                } catch (dlErr) {
                    debugLog('Delhivery enrichment failed for order', order._id, dlErr?.message || dlErr);
                }
                return order;
            }));
        }

        // Enrich India Post orders with live 17track data
        try {
            const ipOrders = enrichedOrders.filter(o =>
                (o.courier || '').toLowerCase().includes('india post') &&
                o.trackingId &&
                !['CANCELLED', 'ORDER_PLACED'].includes(o.status)
            );
            if (ipOrders.length > 0) {
                const storeDoc = await Store.findOne({ $or: [{ _id: storeId }, { userId }] })
                    .select('+integrations.seventeentrack.apiKey +integrations.seventeentrack.publicKey +integrations.seventeentrack.secretKey +integrations.seventeentrack.baseUrl')
                    .lean();
                const cfg = storeDoc?.integrations?.seventeentrack || {};
                const ipConfig = {
                    baseUrl: String(cfg.baseUrl || '').trim(),
                    apiKey: String(cfg.apiKey || '').trim() || process.env.SEVENTEENTRACK_API_KEY || '',
                    publicKey: String(cfg.publicKey || '').trim(),
                    secretKey: String(cfg.secretKey || '').trim(),
                };
                const hasKey = !!(ipConfig.apiKey || ipConfig.publicKey || ipConfig.secretKey);
                if (hasKey) {
                    // Unique AWBs only to avoid redundant calls
                    const uniqueAwbs = [...new Set(ipOrders.map(o => o.trackingId.trim()))];
                    const trackingMap = new Map();

                    // Fetch in small batches to avoid rate-limit spikes while covering all orders.
                    const BATCH_SIZE = 20;
                    for (let i = 0; i < uniqueAwbs.length; i += BATCH_SIZE) {
                        const batch = uniqueAwbs.slice(i, i + BATCH_SIZE);
                        await Promise.all(batch.map(async (awb) => {
                            try {
                                const t = await fetchSeventeenTrackInfo(awb, ipConfig);
                                if (t) trackingMap.set(awb, t);
                            } catch {}
                        }));
                    }
                    if (trackingMap.size > 0) {
                        enrichedOrders = enrichedOrders.map(order => {
                            if (!(order.courier || '').toLowerCase().includes('india post')) return order;
                            const t = trackingMap.get((order.trackingId || '').trim());
                            return t ? { ...order, indiaPost: t } : order;
                        });
                    }
                }
            }
        } catch (ipErr) {
            debugLog('India Post enrichment failed:', ipErr?.message);
        }

        return NextResponse.json({orders: enrichedOrders})
    } catch (error) {
        console.error('[ORDER API ERROR]', error);
        debugLog('API error:', error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}