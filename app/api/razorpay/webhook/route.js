import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(request) {
  try {
    await dbConnect();

    // Get webhook signature from headers
    const signature = request.headers.get("x-razorpay-signature");
    
    if (!signature) {
      console.error("[Webhook] Missing signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Parse the webhook payload
    const event = JSON.parse(body);
    console.log("[Webhook] Received event:", event.event);

    // Handle different webhook events
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case "payment_link.paid":
        await handlePaymentLinkPaid(event.payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case "refund.created":
        await handleRefundCreated(event.payload.refund.entity);
        break;

      case "order.paid":
        console.log("[Webhook] Order paid:", event.payload.order.entity.id);
        break;

      default:
        console.log("[Webhook] Unhandled event type:", event.event);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ 
      error: "Webhook processing failed",
      message: error.message 
    }, { status: 500 });
  }
}

async function handlePaymentCaptured(payment) {
  console.log("[Webhook] Payment captured:", payment.id);
  
  try {
    // Find order by razorpay payment ID
    let order = await Order.findOne({ razorpayPaymentId: payment.id });

    if (!order && payment?.notes?.orderId) {
      order = await Order.findById(payment.notes.orderId);
    }

    if (!order && payment?.order_id) {
      order = await Order.findOne({ razorpayOrderId: payment.order_id });
    }

    if (order) {
      // Update order status if not already updated
      if (order.paymentStatus !== 'paid') {
        order.paymentMethod = order.paymentMethod || 'CARD';
        order.paymentStatus = 'paid';
        order.isPaid = true;
        order.razorpayPaymentId = payment.id;
        if (payment?.order_id) order.razorpayOrderId = payment.order_id;
        order.paidAt = new Date();
        await order.save();
        console.log("[Webhook] Order updated:", order._id);
      }
    } else {
      // If order doesn't exist yet (race condition with verify endpoint)
      console.log("[Webhook] Order not found for payment:", payment.id);
      // The verify endpoint will create it shortly
    }
  } catch (error) {
    console.error("[Webhook] Error handling payment.captured:", error);
    throw error;
  }
}

async function handlePaymentLinkPaid(payload) {
  try {
    const linkEntity = payload?.payment_link?.entity || payload?.payment_link || null;
    const paymentEntity = payload?.payment?.entity || payload?.payment || null;

    const paymentLinkId = linkEntity?.id || paymentEntity?.payment_link_id || null;
    const orderIdFromNotes = paymentEntity?.notes?.orderId || linkEntity?.notes?.orderId || null;

    let order = null;
    if (orderIdFromNotes) {
      order = await Order.findById(orderIdFromNotes);
    }
    if (!order && paymentLinkId) {
      order = await Order.findOne({ paymentLinkId });
    }

    if (!order) {
      console.warn('[Webhook] payment_link.paid received but order not found');
      return;
    }

    order.paymentMethod = 'CARD';
    order.paymentStatus = 'paid';
    order.isPaid = true;
    order.paidAt = new Date();
    if (paymentEntity?.id) order.razorpayPaymentId = paymentEntity.id;
    if (paymentEntity?.order_id) order.razorpayOrderId = paymentEntity.order_id;
    await order.save();

    console.log('[Webhook] payment_link.paid order updated:', order._id);
  } catch (error) {
    console.error('[Webhook] Error handling payment_link.paid:', error);
    throw error;
  }
}

async function handlePaymentFailed(payment) {
  console.log("[Webhook] Payment failed:", payment.id, payment.error_description);
  
  try {
    // Find order by razorpay order ID
    const order = await Order.findOne({ 
      razorpayOrderId: payment.order_id 
    });

    if (order) {
      order.paymentStatus = 'failed';
      order.status = 'PAYMENT_FAILED';
      order.notes = `Payment failed: ${payment.error_description || 'Unknown error'}`;
      await order.save();
      console.log("[Webhook] Order marked as failed:", order._id);
    }
  } catch (error) {
    console.error("[Webhook] Error handling payment.failed:", error);
    throw error;
  }
}

async function handleRefundCreated(refund) {
  console.log("[Webhook] Refund created:", refund.id);
  
  try {
    // Find order by razorpay payment ID
    const order = await Order.findOne({ 
      razorpayPaymentId: refund.payment_id 
    });

    if (order) {
      order.paymentStatus = 'refunded';
      order.status = 'RETURNED';
      order.notes = `Refund processed: ₹${refund.amount / 100}`;
      await order.save();
      console.log("[Webhook] Order marked as refunded:", order._id);
    }
  } catch (error) {
    console.error("[Webhook] Error handling refund.created:", error);
    throw error;
  }
}
