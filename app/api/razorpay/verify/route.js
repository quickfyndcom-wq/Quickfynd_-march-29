import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { verifyAuth } from "@/lib/verifyAuth";

function inferOrderSource(request, payload = {}) {
  const normalize = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;
    if (
      ['app', 'mobile', 'android', 'ios', 'react-native', 'reactnative', 'flutter', 'dart', 'expo'].includes(normalized) ||
      normalized.includes('app') ||
      normalized.includes('android') ||
      normalized.includes('ios') ||
      normalized.includes('flutter') ||
      normalized.includes('dart')
    ) {
      return 'APP';
    }
    if (['web', 'website', 'browser'].includes(normalized) || normalized.includes('web')) return 'WEB';
    return null;
  };

  const isTruthyFlag = (value) => {
    if (value === true) return true;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value || '').trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  };

  const nested = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {};

  const appHint =
    normalize(payload?.appId) ||
    normalize(payload?.clientApp) ||
    normalize(payload?.client) ||
    normalize(payload?.channel) ||
    normalize(payload?.deviceType) ||
    normalize(payload?.device) ||
    normalize(payload?.appName) ||
    normalize(nested?.appId) ||
    normalize(nested?.clientApp) ||
    normalize(nested?.platform);

  if (isTruthyFlag(payload?.isApp) || isTruthyFlag(payload?.isMobileApp) || isTruthyFlag(nested?.isApp)) return 'APP';
  if (appHint) return 'APP';

  const explicit =
    normalize(payload?.orderSource) ||
    normalize(payload?.source) ||
    normalize(payload?.platform) ||
    normalize(nested?.orderSource) ||
    normalize(nested?.source) ||
    normalize(nested?.platform) ||
    normalize(request.headers.get('x-order-source')) ||
    normalize(request.headers.get('x-client-platform')) ||
    normalize(request.headers.get('x-app-platform')) ||
    normalize(request.headers.get('x-mobile-platform')) ||
    normalize(request.headers.get('x-platform')) ||
    normalize(request.headers.get('x-app-source')) ||
    normalize(request.headers.get('x-app-id')) ||
    normalize(request.headers.get('x-device-type')) ||
    normalize(request.headers.get('x-mobile-app')) ||
    normalize(request.headers.get('x-client'));
  if (explicit) return explicit;

  const ua = String(request.headers.get('user-agent') || '').toLowerCase();
  const appSignatures = ['okhttp', 'cfnetwork', 'dalvik', 'reactnative', 'react-native', 'expo', 'flutter', 'dart'];
  if (appSignatures.some((signature) => ua.includes(signature))) return 'APP';
  return 'WEB';
}

async function createFallbackCapturedOrder({ request, paymentPayload, razorpay_payment_id, razorpay_order_id, razorpay_signature, failureReason }) {
  const inferredOrderSource = inferOrderSource(request, paymentPayload || {});
  const items = Array.isArray(paymentPayload?.items) ? paymentPayload.items : [];

  const orderItems = items.map((item) => ({
    productId: item?.id || item?.productId || undefined,
    name: item?.name || item?.title || 'Product',
    image: item?.image || item?.productImage || '',
    productImage: item?.productImage || item?.image || '',
    price: Number(item?.price || 0),
    quantity: Number(item?.quantity || 1),
    variantOptions: item?.variantOptions || null,
  }));

  const fallbackData = {
    storeId: paymentPayload?.storeId,
    total: Number(paymentPayload?.total || 0),
    shippingFee: Number(paymentPayload?.shippingFee || 0),
    status: 'PAYMENT_CAPTURED_REVIEW',
    paymentMethod: 'CARD',
    orderSource: inferredOrderSource,
    paymentStatus: 'paid',
    isPaid: true,
    notes: `Payment captured but standard order creation failed: ${failureReason || 'Unknown reason'}`,
    orderItems,
    items,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
  };

  if (paymentPayload?.isGuest && paymentPayload?.guestInfo) {
    fallbackData.isGuest = true;
    fallbackData.guestName = paymentPayload.guestInfo.name;
    fallbackData.guestEmail = paymentPayload.guestInfo.email;
    fallbackData.guestPhone = paymentPayload.guestInfo.phone;
    fallbackData.shippingAddress = {
      name: paymentPayload.guestInfo.name,
      email: paymentPayload.guestInfo.email,
      phone: paymentPayload.guestInfo.phone,
      phoneCode: paymentPayload.guestInfo.phoneCode || '',
      alternatePhone: paymentPayload.guestInfo.alternatePhone || '',
      alternatePhoneCode: paymentPayload.guestInfo.alternatePhoneCode || '',
      houseNumber: paymentPayload.guestInfo.houseNumber || '',
      street: paymentPayload.guestInfo.street || paymentPayload.guestInfo.address || '',
      city: paymentPayload.guestInfo.city || '',
      state: paymentPayload.guestInfo.state || '',
      zip: paymentPayload.guestInfo.pincode || paymentPayload.guestInfo.zip || '',
      country: paymentPayload.guestInfo.country || '',
      district: paymentPayload.guestInfo.district || '',
    };
  } else {
    if (paymentPayload?.addressId) fallbackData.addressId = paymentPayload.addressId;
    if (paymentPayload?.addressData) fallbackData.shippingAddress = paymentPayload.addressData;

    if (paymentPayload?.token) {
      const auth = await verifyAuth(paymentPayload.token);
      if (auth?.userId) fallbackData.userId = auth.userId;
    }
  }

  if (!fallbackData.storeId) {
    return null;
  }

  const existing = await Order.findOne({
    $or: [
      { razorpayPaymentId: razorpay_payment_id },
      { razorpayOrderId: razorpay_order_id }
    ]
  }).lean();

  if (existing?._id) {
    return existing;
  }

  return Order.create(fallbackData);
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    await dbConnect();
    
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentPayload } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.error('[Verify] Missing required fields');
      return NextResponse.json({ 
        success: false, 
        message: "Missing payment verification data" 
      }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('[Verify] RAZORPAY_KEY_SECRET not configured');
      return NextResponse.json({ 
        success: false, 
        message: "Payment system configuration error" 
      }, { status: 500 });
    }

    // Create signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    // Verify signature
    if (generated_signature === razorpay_signature) {
      const existingByPayment = await Order.findOne({
        $or: [
          { razorpayPaymentId: razorpay_payment_id },
          { razorpayOrderId: razorpay_order_id }
        ]
      }).lean();

      if (existingByPayment?._id) {
        return NextResponse.json({
          success: true,
          _id: existingByPayment._id.toString(),
          orderId: existingByPayment._id.toString(),
          message: 'Payment already verified and order exists'
        });
      }

      // If paying for an existing COD order, update that order instead of creating a new one
      if (paymentPayload && paymentPayload.existingOrderId) {
        try {
          const existingOrder = await Order.findById(paymentPayload.existingOrderId);
          if (!existingOrder) {
            return NextResponse.json({ success: false, message: 'Existing order not found' }, { status: 404 });
          }

          const shouldApplyPrepaidDiscount = paymentPayload.applyPrepaidDiscount === true;

          if (shouldApplyPrepaidDiscount) {
            const discountedTotal = Number((existingOrder.total * 0.95).toFixed(2));
            existingOrder.total = discountedTotal;
            existingOrder.isCouponUsed = true;
            existingOrder.coupon = { code: 'PREPAID5', discountType: 'percentage', discount: 5 };
          }

          existingOrder.isPaid = true;
          existingOrder.paymentMethod = 'CARD';
          existingOrder.paymentStatus = 'paid';
          existingOrder.razorpayPaymentId = razorpay_payment_id;
          existingOrder.razorpayOrderId = razorpay_order_id;
          existingOrder.razorpaySignature = razorpay_signature;
          await existingOrder.save();

          return NextResponse.json({ 
            success: true,
            orderId: existingOrder._id.toString(),
            message: shouldApplyPrepaidDiscount
              ? 'Existing order updated to prepaid with discount'
              : 'Existing COD order paid successfully' 
          });
        } catch (e) {
          return NextResponse.json({ success: false, message: e.message || 'Failed to update existing order' }, { status: 500 });
        }
      }

      // Payment verified - create a fresh order via the main Orders API (standard card checkout)
      console.log('[Verify] Payment verified successfully:', razorpay_payment_id);
      console.log('[Verify] Creating order in database...');
      
      // Prepare the order creation payload
      const inferredOrderSource = inferOrderSource(request, paymentPayload || {});
      const orderPayload = {
        items: paymentPayload.items,
        paymentMethod: 'CARD',
        shippingFee: paymentPayload.shippingFee || 0,
        shippingMethod: paymentPayload.shippingMethod,
        orderSource: inferredOrderSource,
        source: inferredOrderSource,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      };

      if (paymentPayload.coinsToRedeem) {
        orderPayload.coinsToRedeem = paymentPayload.coinsToRedeem;
      }

      // Add user/guest info
      if (paymentPayload.token) {
        // Logged-in user — always forward address data from the payload so it
        // is available even when verifyAuth returns null (e.g. token refreshed
        // mid-payment).  The orders API re-verifies the token independently via
        // the Authorization header that is already set below.
        if (paymentPayload.addressId) {
          orderPayload.addressId = paymentPayload.addressId;
        }
        if (paymentPayload.addressData?.street) {
          orderPayload.addressData = paymentPayload.addressData;
        }
      } else if (paymentPayload.isGuest && paymentPayload.guestInfo) {
        // Guest user
        orderPayload.isGuest = true;
        orderPayload.guestInfo = paymentPayload.guestInfo;
      }

      if (paymentPayload.coupon) {
        orderPayload.coupon = paymentPayload.coupon;
        // orders API reads couponCode as a string — forward the code directly
        if (paymentPayload.coupon.code) {
          orderPayload.couponCode = paymentPayload.coupon.code;
        }
      }

      // Call the main orders API internally
      const orderRequest = new Request(request.url.replace('/razorpay/verify', '/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-order-source': inferredOrderSource,
          'x-client-platform': inferredOrderSource,
          ...(paymentPayload.token ? { 'Authorization': `Bearer ${paymentPayload.token}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      // Import and call the orders POST handler
      const { POST: createOrder } = await import('@/app/api/orders/route');
      const orderResponse = await createOrder(orderRequest);
      const orderData = await orderResponse.json();

      // Check for id field (from orders API response) or orderId
      const orderId = orderData.id || orderData.orderId || orderData._id;
      
      if (orderResponse.ok && orderId) {
        const duration = Date.now() - startTime;
        console.log(`[Verify] Order created successfully: ${orderId} (${duration}ms)`);
        
        return NextResponse.json({ 
          success: true,
          _id: orderId,
          orderId: orderId,
          message: "Payment verified and order created successfully" 
        });
      } else {
        console.error('[Verify] Order creation failed:', orderData);
        console.error('[Verify] Response status:', orderResponse.status);

        const fallbackOrder = await createFallbackCapturedOrder({
          request,
          paymentPayload,
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          failureReason: orderData?.error || `Orders API returned ${orderResponse.status}`,
        });

        if (fallbackOrder?._id) {
          const fallbackId = fallbackOrder._id.toString();
          console.warn('[Verify] Fallback captured order created:', fallbackId);
          return NextResponse.json({
            success: true,
            _id: fallbackId,
            orderId: fallbackId,
            message: 'Payment verified. Order saved for manual review.',
            fallback: true,
          });
        }
        
        return NextResponse.json({ 
          success: false, 
          message: orderData.error || "Order creation failed after payment" 
        }, { status: 400 });
      }
    } else {
      console.error('[Verify] Signature verification failed');
      console.error('[Verify] Expected:', generated_signature);
      console.error('[Verify] Received:', razorpay_signature);
      
      return NextResponse.json({ 
        success: false, 
        message: "Payment verification failed" 
      }, { status: 400 });
    }
  } catch (error) {
    console.error("[Verify] Critical error:", error);
    console.error("[Verify] Stack:", error.stack);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: "Payment verification system error"
    }, { status: 500 });
  }
}
