import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { validateRazorpayWebhookSignature } from '@/lib/razorpay';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler for real-time payment and settlement updates
 * POST /api/webhooks/razorpay
 * 
 * Handles events:
 * - payment.authorized
 * - payment.captured
 * - payment.failed
 * - settlement.processed
 * - transfer.created
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature using the dedicated webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.warn('[Razorpay Webhook] Invalid signature');
      return NextResponse.json({
        error: 'Invalid signature'
      }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('[Razorpay Webhook] Event:', event.event);

    await dbConnect();

    switch (event.event) {
      case 'payment.captured':
        return handlePaymentCaptured(event.payload);

      case 'payment.authorized':
        return handlePaymentAuthorized(event.payload);

      case 'payment.failed':
        return handlePaymentFailed(event.payload);

      case 'settlement.processed':
        return handleSettlementProcessed(event.payload);

      case 'transfer.created':
        return handleTransferCreated(event.payload);

      case 'payment_link.paid':
        return handlePaymentLinkPaid(event.payload);

      case 'refund.created':
        return handleRefundCreated(event.payload);

      default:
        console.log('[Razorpay Webhook] Unhandled event:', event.event);
        return NextResponse.json({
          success: true,
          message: 'Event received'
        });
    }
  } catch (error) {
    console.error('[Razorpay Webhook Error]', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

async function handlePaymentCaptured(payload) {
  try {
    const paymentId = payload.payment.id;
    const amount = payload.payment.amount;

    // Find order with this payment ID
    const order = await Order.findOne({ razorpayPaymentId: paymentId });

    if (order) {
      console.log(`[Webhook] Payment captured for order ${order._id}`);
      
      // Update order as paid
      order.isPaid = true;
      order.paymentStatus = 'CAPTURED';
      
      // Store settlement info
      order.razorpaySettlement = {
        paymentId,
        status: 'PENDING',
        captured_at: new Date(),
        amount: amount / 100, // Convert paise to rupees
        fee: payload.payment.fee ? payload.payment.fee / 100 : 0
      };
      
      await order.save();
      console.log(`[Webhook] Order ${order._id} marked as PAID`);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment captured processed'
    });
  } catch (error) {
    console.error('[handlePaymentCaptured Error]', error);
    throw error;
  }
}

async function handlePaymentAuthorized(payload) {
  try {
    const paymentId = payload.payment.id;

    // Find order with this payment ID
    const order = await Order.findOne({ razorpayPaymentId: paymentId });

    if (order) {
      console.log(`[Webhook] Payment authorized for order ${order._id}`);
      order.paymentStatus = 'AUTHORIZED';
      await order.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Payment authorized processed'
    });
  } catch (error) {
    console.error('[handlePaymentAuthorized Error]', error);
    throw error;
  }
}

async function handlePaymentFailed(payload) {
  try {
    const paymentId = payload.payment.id;
    const errorReason = payload.payment.error_reason;

    // Find order with this payment ID
    const order = await Order.findOne({ razorpayPaymentId: paymentId });

    if (order) {
      console.log(`[Webhook] Payment failed for order ${order._id}: ${errorReason}`);
      
      order.isPaid = false;
      order.status = 'PAYMENT_FAILED';
      order.paymentStatus = 'FAILED';
      order.notes = `Payment failed: ${errorReason}`;
      
      await order.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Payment failed processed'
    });
  } catch (error) {
    console.error('[handlePaymentFailed Error]', error);
    throw error;
  }
}

async function handleSettlementProcessed(payload) {
  try {
    const settlementId = payload.settlement.id;
    const amount = payload.settlement.amount;
    const fees = payload.settlement.fees;

    console.log(`[Webhook] Settlement processed: ${settlementId}, Amount: ₹${amount / 100}`);

    // Find orders that were part of this settlement
    // You might need to track which orders are in which settlement
    // For now, we'll log it
    return NextResponse.json({
      success: true,
      message: 'Settlement processed'
    });
  } catch (error) {
    console.error('[handleSettlementProcessed Error]', error);
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
      console.warn('[Razorpay Webhook] payment_link.paid: order not found');
      return NextResponse.json({ success: true, message: 'Order not found' });
    }

    order.paymentMethod = order.paymentMethod || 'CARD';
    order.paymentStatus = 'paid';
    order.isPaid = true;
    order.paidAt = new Date();
    if (paymentEntity?.id) order.razorpayPaymentId = paymentEntity.id;
    if (paymentEntity?.order_id) order.razorpayOrderId = paymentEntity.order_id;
    await order.save();

    console.log('[Razorpay Webhook] payment_link.paid: order updated', order._id);
    return NextResponse.json({ success: true, message: 'Payment link paid processed' });
  } catch (error) {
    console.error('[handlePaymentLinkPaid Error]', error);
    throw error;
  }
}

async function handleRefundCreated(payload) {
  try {
    const refund = payload?.refund?.entity || payload?.refund || payload;
    const paymentId = refund?.payment_id;

    if (!paymentId) {
      console.warn('[Razorpay Webhook] refund.created: no payment_id in payload');
      return NextResponse.json({ success: true });
    }

    const order = await Order.findOne({ razorpayPaymentId: paymentId });
    if (order) {
      order.paymentStatus = 'refunded';
      order.isPaid = false;
      order.status = 'RETURNED_REFUNDED';
      const refundAmt = (refund.amount || 0) / 100;
      const refundId = refund.id || 'N/A';
      order.notes = `Refund ₹${refundAmt} processed via Razorpay (ID: ${refundId})`;
      await order.save();
      console.log('[Razorpay Webhook] refund.created: order updated to RETURNED_REFUNDED', order._id);
    }

    return NextResponse.json({ success: true, message: 'Refund created processed' });
  } catch (error) {
    console.error('[handleRefundCreated Error]', error);
    throw error;
  }
}

async function handleTransferCreated(payload) {
  try {
    const transferId = payload.transfer.id;
    const amount = payload.transfer.amount;
    const source = payload.transfer.source;

    console.log(`[Webhook] Transfer created: ${transferId} for amount ₹${amount / 100}`);

    // If this is a payment transfer
    if (source && source.includes('pay_')) {
      const paymentId = source;
      const order = await Order.findOne({ razorpayPaymentId: paymentId });

      if (order && order.razorpaySettlement) {
        console.log(`[Webhook] Updating settlement for order ${order._id}`);
        
        order.razorpaySettlement.is_transferred = true;
        order.razorpaySettlement.transferred_at = new Date();
        order.razorpaySettlement.transfer_id = transferId;
        order.razorpaySettlement.amount_transferred = amount / 100;
        order.razorpaySettlement.status = 'TRANSFERRED';
        
        await order.save();
        console.log(`[Webhook] Order ${order._id} settlement updated - transferred to bank`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer created processed'
    });
  } catch (error) {
    console.error('[handleTransferCreated Error]', error);
    throw error;
  }
}
