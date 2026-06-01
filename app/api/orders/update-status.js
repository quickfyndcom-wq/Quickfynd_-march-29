import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(req) {
  try {
    await connectDB();
    const { orderId, status } = await req.json();
    console.log('[update-status] Received:', { orderId, status });
    if (!orderId || !status) {
      console.log('[update-status] Missing orderId or status');
      return NextResponse.json({ success: false, error: 'Order ID and status are required' }, { status: 400 });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('[update-status] Order not found:', orderId);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    const normalizedStatus = String(status || '').trim().toUpperCase();
    order.status = normalizedStatus;
    await order.save();

    // Log order and status before sending email
    console.log('[update-status] Sending status email:', { email: order.guestEmail || order.email, status: normalizedStatus });
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await sendOrderStatusEmail(order, normalizedStatus);
      emailSent = Boolean(emailResult);
      console.log('[update-status] Email send result:', emailResult);
    } catch (emailError) {
      emailError = emailError?.message || String(emailError);
      console.error('[update-status] Email sending failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: emailSent ? 'Order status updated and email sent' : 'Order status updated, but email was not sent',
      email: {
        sent: emailSent,
        error: emailError,
      },
      order,
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json({ success: false, error: error?.message || error }, { status: 500 });
  }
}
