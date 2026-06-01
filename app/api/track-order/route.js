import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Store from '@/models/Store'
import { fetchNormalizedDelhiveryTracking } from '@/lib/delhivery'
import { fetchSeventeenTrackInfo } from '@/lib/seventeentrack'
import { fetchNormalizedIndiaPostTracking } from '@/lib/indiaPost'

const asOrderShape = (normalized, awb = '') => {
  if (!normalized) return null;
  return {
    courier: normalized.courier,
    trackingId: normalized.trackingId || awb,
    trackingUrl: normalized.trackingUrl,
    delhivery: normalized.delhivery,
    orderItems: [],
    total: 0
  };
};

export async function GET(req) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')
    const awbParam = searchParams.get('awb')
    const orderIdParam = searchParams.get('orderId')
    // Support either ?awb= or ?orderId= for the same input value
    const awb = awbParam || orderIdParam
    const carrier = (searchParams.get('carrier') || '').toLowerCase()

    if (!phone && !awb) {
      return NextResponse.json(
        { success: false, message: 'Phone Number or AWB Number is required' },
        { status: 400 }
      )
    }

    // If explicitly requested, try Delhivery directly first
    if (carrier === 'delhivery' && awb) {
      try {
        const normalized = await fetchNormalizedDelhiveryTracking(awb.trim())
        const synthetic = asOrderShape(normalized, awb.trim())
        if (synthetic) {
          return NextResponse.json({ success: true, order: synthetic })
        }
      } catch (e) {
        const msg = (e?.message || '').includes('DELHIVERY_API_TOKEN')
          ? 'Tracking temporarily unavailable. Delhivery API token not configured.'
          : `Delhivery tracking failed: ${e?.message || 'Unknown error'}`
        return NextResponse.json({ success: false, message: msg }, { status: 503 })
      }
    }

    let order = null;
    if (awb) {
      const awbTrim = awb.trim();
      // 1. Try by trackingId / awb / airwayBillNo (legacy field compatibility)
      order = await Order.findOne({
        $or: [
          { trackingId: awbTrim },
          { awb: awbTrim },
          { airwayBillNo: awbTrim }
        ]
      }).lean()
        .populate('orderItems.productId')
        .sort({ createdAt: -1 })
        .lean();
      // 2. Try by full orderId (ObjectId)
      if (!order && /^[a-fA-F0-9]{24}$/.test(awbTrim)) {
        order = await Order.findOne({ _id: awbTrim }).lean()
          .populate('orderItems.productId')
          .lean();
      }
      // 3. Try by shortOrderNumber field
      if (!order && /^\d{1,}$/.test(awbTrim)) {
        order = await Order.findOne({ shortOrderNumber: Number(awbTrim) }).lean()
          .populate('orderItems.productId')
          .lean();
      }
    }
    // 4. Try by phone number if provided (fallback)
    if (!order && phone) {
      order = await Order.findOne({ 'shippingAddress.phone': phone.trim() }).lean()
        .populate('orderItems.productId')
        .sort({ createdAt: -1 })
        .lean();
    }
    if (!order) {
      // Fallback: try to fetch directly from Delhivery using provided AWB
      if (awb) {
        try {
          const normalized = await fetchNormalizedDelhiveryTracking(awb.trim());
          const synthetic = asOrderShape(normalized, awb.trim());
          if (synthetic) {
            return NextResponse.json({ success: true, order: synthetic });
          }
        } catch (e) {
          console.error('Delhivery fallback failed:', e?.message || e);
        }
      }
      return NextResponse.json(
        { success: false, message: 'Order not found with the provided information' },
        { status: 404 }
      );
    }
    
    // Ensure shortOrderNumber exists (for old orders without it)
    if (!order.shortOrderNumber && order._id) {
      const hex = order._id.toString().slice(-6);
      order.shortOrderNumber = parseInt(hex, 16);
    }
    
    // If order has a Delhivery trackingId, fetch live tracking
    try {
      const courier = (order.courier || '').toLowerCase();
      const trackingId = order.trackingId || order.awb || order.airwayBillNo;
      // Try Delhivery when courier is explicitly delhivery OR courier is missing and it's not India Post.
      const isIndiaPost = courier.includes('india post');
      const isDelhivery = courier.includes('delhivery') || (!courier && !isIndiaPost);

      if (trackingId && isDelhivery) {
        const normalized = await fetchNormalizedDelhiveryTracking(trackingId);
        if (normalized) {
          order.delhivery = normalized.delhivery;
          order.trackingUrl = order.trackingUrl || normalized.trackingUrl;
          order.courier = order.courier || normalized.courier;
          order.trackingId = order.trackingId || normalized.trackingId;
          
          // IMPORTANT: Update order.status to match delhivery tracking status if available
          if (normalized.delhivery?.current_status) {
            order.status = normalized.delhivery.current_status;
          }
        }
      }

      // Fetch live India Post tracking: try India Post direct API first, fallback to 17track
      if (trackingId && isIndiaPost) {
        let ipTracking = null;

        // 1. Try India Post direct API (free, real-time) — only if credentials are configured
        const hasIndiaPostCreds = !!(process.env.INDIAPOST_USERNAME?.trim() && process.env.INDIAPOST_PASSWORD?.trim());
        if (hasIndiaPostCreds) {
          try {
            const ipDirect = await fetchNormalizedIndiaPostTracking(trackingId);
            if (ipDirect?.indiapost?.tracking_details?.length > 0) {
              const events = ipDirect.indiapost.tracking_details.map(e => ({
                time: `${e.date || ''} ${e.time || ''}`.trim(),
                description: e.event || '',
                location: e.office || '',
                country: 'IN',
              }));
              const isDelivered = (ipDirect.indiapost.current_status || '').toLowerCase().includes('delivered');
              ipTracking = {
                awb: trackingId,
                statusCode: isDelivered ? 40 : 10,
                statusLabel: isDelivered ? 'Delivered' : 'In Transit',
                isDelivered,
                deliveredAt: isDelivered ? ipDirect.indiapost.current_status_time : null,
                currentLocation: ipDirect.indiapost.current_status_location || null,
                latestEvent: events[events.length - 1] || null,
                events: events.slice().reverse(), // newest first
                source: 'indiapost',
              };
            }
          } catch (ipDirectErr) {
            console.error('India Post direct tracking failed, falling back to 17track:', ipDirectErr?.message || ipDirectErr);
          }
        }

        // 2. Fallback to 17track if India Post direct failed or no credentials
        if (!ipTracking) {
          try {
            let seventeenTrackConfig = {};
            if (order.storeId) {
              const storeOr = [{ userId: order.storeId }];
              if (/^[a-fA-F0-9]{24}$/.test(String(order.storeId))) {
                storeOr.unshift({ _id: order.storeId });
              }
              const store = await Store.findOne({ $or: storeOr })
                .select('+integrations.seventeentrack.baseUrl +integrations.seventeentrack.apiKey +integrations.seventeentrack.publicKey +integrations.seventeentrack.secretKey')
                .lean();
              const cfg = store?.integrations?.seventeentrack || {};
              seventeenTrackConfig = {
                baseUrl: String(cfg.baseUrl || '').trim(),
                apiKey: String(cfg.apiKey || '').trim(),
                publicKey: String(cfg.publicKey || '').trim(),
                secretKey: String(cfg.secretKey || '').trim(),
              };
            }
            ipTracking = await fetchSeventeenTrackInfo(trackingId, seventeenTrackConfig);
            if (ipTracking) ipTracking.source = '17track';
          } catch (ipErr) {
            console.error('India Post 17track fetch failed:', ipErr?.message || ipErr);
          }
        }

        if (ipTracking) {
          order.indiaPost = ipTracking;
          // Update order status to reflect real delivery status
          if (ipTracking.isDelivered) {
            order.status = 'DELIVERED';
          } else if (ipTracking.statusCode === 10) {
            order.status = order.status === 'ORDER_PLACED' || order.status === 'PROCESSING'
              ? 'SHIPPED'
              : order.status;
          }
        }
      }
    } catch (e) {
      // Don't fail the API if courier call fails; just log
      console.error('Courier tracking fetch failed:', e?.message || e);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Track order error:', error && error.stack ? error.stack : error)
    return NextResponse.json(
      { success: false, message: 'Failed to track order', error: error?.message || error },
      { status: 500 }
    )
  }
}
