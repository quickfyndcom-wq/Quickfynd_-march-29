import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { sendOrderConfirmationEmail } from '@/lib/email';

// Customer order placement (guest or logged-in)
export async function POST(request) {
  try {
    await connectDB();
    
    const data = await request.json();

    const normalizeOrderSource = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (['app', 'mobile', 'android', 'ios', 'react-native', 'reactnative'].includes(normalized)) return 'APP';
      if (['web', 'website', 'browser'].includes(normalized)) return 'WEB';
      return null;
    };

    const inferOrderSource = () => {
      const explicit =
        normalizeOrderSource(data?.orderSource) ||
        normalizeOrderSource(data?.source) ||
        normalizeOrderSource(data?.platform) ||
        normalizeOrderSource(request.headers.get('x-order-source')) ||
        normalizeOrderSource(request.headers.get('x-client-platform')) ||
        normalizeOrderSource(request.headers.get('x-platform'));
      if (explicit) return explicit;

      const userAgent = String(request.headers.get('user-agent') || '').toLowerCase();
      const appSignatures = ['okhttp', 'cfnetwork', 'dalvik', 'reactnative', 'react-native', 'expo'];
      if (appSignatures.some((signature) => userAgent.includes(signature))) return 'APP';
      return 'WEB';
    };

    const inferredOrderSource = inferOrderSource();
    // Required fields for India
    const { name, email, phone, address, state, pincode, cartItems, userId } = data;
    if (!name || !phone || !address || !state || !pincode || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Optionally associate with user if logged in
    let user = null;
    if (userId) {
      user = await User.findById(userId).lean();
    }

    // Create order
    const order = await Order.create({
      userId: user ? user._id.toString() : null,
      orderSource: inferredOrderSource,
      name,
      email,
      phone,
      address,
      state,
      pincode,
      orderItems: cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      status: "pending",
    });

    // Populate order with items
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: 'orderItems.productId',
        model: 'Product'
      })
      .lean();

    // Send confirmation email (non-blocking)
    try {
      const recipientEmail = populatedOrder?.email || user?.email;
      if (recipientEmail) {
        await sendOrderConfirmationEmail({
          email: recipientEmail,
          name: populatedOrder?.name || user?.name || 'there',
          orderId: populatedOrder?._id,
          shortOrderNumber: populatedOrder?.shortOrderNumber,
          total: populatedOrder?.total || 0,
          orderItems: populatedOrder?.orderItems || [],
          shippingAddress: populatedOrder?.shippingAddress || null,
          createdAt: populatedOrder?.createdAt || new Date(),
          paymentMethod: populatedOrder?.paymentMethod || 'N/A',
        });
      }
    } catch (emailError) {
      console.error('[store/checkout] Confirmation email failed:', emailError);
    }

    return NextResponse.json({ message: "Order placed successfully", order: populatedOrder });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}
