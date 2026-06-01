import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import authSeller from "@/middlewares/authSeller";

function getRequestOrigin(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function buildProductSummary(order) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  if (!items.length) return "Order items";

  // Resolve missing names from Product collection when order item snapshot has no name.
  const missingNameIds = items
    .filter((item) => !String(item?.name || item?.productId?.name || "").trim())
    .map((item) => String(item?.productId || "").trim())
    .filter(Boolean);

  let productNameMap = new Map();
  if (missingNameIds.length > 0) {
    const products = await Product.find({ _id: { $in: missingNameIds } }).select("_id name").lean();
    productNameMap = new Map(products.map((p) => [String(p._id), String(p.name || "")]));
  }

  const summary = items
    .slice(0, 4)
    .map((item) => {
      const directName = String(item?.name || item?.productId?.name || "").trim();
      const fallbackName = productNameMap.get(String(item?.productId || "").trim()) || "Item";
      const name = directName || fallbackName;
      const qty = Number(item?.quantity || 1);
      return `${name} x${qty}`;
    })
    .join(", ");

  return summary || "Order items";
}

export async function POST(request, { params }) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split(" ")[1];
    const { getAuth } = await import("firebase-admin/auth");
    const { initializeApp, applicationDefault, getApps } = await import("firebase-admin/app");
    if (getApps().length === 0) initializeApp({ credential: applicationDefault() });

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const amount = Number(body?.amount || 0);

    const order = await Order.findOne({ _id: orderId, storeId }).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    const finalAmount = Number.isFinite(amount) && amount > 0 ? amount : Number(order.total || 0);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const customerName = String(order?.shippingAddress?.name || order?.guestName || "Customer").trim();
    const customerEmailRaw = String(order?.shippingAddress?.email || order?.guestEmail || "").trim();
    const customerEmail = customerEmailRaw && customerEmailRaw.includes("@") ? customerEmailRaw : undefined;
    const rawPhone = String(order?.shippingAddress?.phone || order?.guestPhone || "");
    const localPhone = rawPhone.replace(/\D/g, "").slice(-10);
    const customerPhone = localPhone.length >= 10 ? `91${localPhone}` : undefined;

    const origin = process.env.NEXT_PUBLIC_APP_URL || getRequestOrigin(request);
    const shortOrderNo = String(order.shortOrderNumber || String(order._id).slice(-6));
    const productSummary = await buildProductSummary(order);
    const itemCount = Array.isArray(order?.orderItems) ? order.orderItems.length : 0;

    // Razorpay reference_id has a strict length cap; keep it short and deterministic.
    const referenceId = `SO_${String(order._id).slice(-8)}_${Date.now().toString().slice(-6)}`;

    const paymentLinkPayload = {
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      accept_partial: false,
      description: `Order #${shortOrderNo} | ${productSummary}`.slice(0, 240),
      reference_id: referenceId,
      reminder_enable: true,
      notes: {
        orderId: String(order._id),
        storeId: String(storeId),
        source: "STORE_ORDER_PAYMENT_LINK",
        amountInr: String(finalAmount),
        itemCount: String(itemCount),
        products: productSummary.slice(0, 200),
      },
      callback_url: `${origin}/order-success?orderId=${order._id}`,
      callback_method: "get",
    };

    if (customerName || customerEmail || customerPhone) {
      paymentLinkPayload.customer = {
        name: customerName || "Customer",
        ...(customerEmail ? { email: customerEmail } : {}),
        ...(customerPhone ? { contact: customerPhone } : {}),
      };
      paymentLinkPayload.notify = {
        sms: Boolean(customerPhone),
        email: Boolean(customerEmail),
      };
    }

    const paymentLink = await razorpay.paymentLink.create(paymentLinkPayload);

    const updated = await Order.findByIdAndUpdate(
      order._id,
      {
        total: finalAmount,
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        isPaid: false,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url || paymentLink?.short_url || paymentLink?.url || "",
        paymentLinkAmount: finalAmount,
        paymentLinkCreatedAt: new Date(),
      },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.short_url || paymentLink?.url,
        amount: finalAmount,
      },
      order: updated,
    });
  } catch (error) {
    console.error("[Store Order Payment Link] Error:", error);
    const providerError =
      error?.error?.description ||
      error?.description ||
      error?.message ||
      "Failed to create payment link";
    return NextResponse.json({ error: providerError }, { status: 500 });
  }
}
