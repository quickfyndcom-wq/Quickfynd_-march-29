import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Address from "@/models/Address";
import { getAuth } from "@/lib/firebase-admin";

function mapAddressToShippingAddress(address = {}) {
  if (!address || typeof address !== "object") return null;

  const zip = String(address.zip || address.pincode || "").trim();

  return {
    name: address.name || "",
    email: address.email || "",
    phone: address.phone || "",
    phoneCode: address.phoneCode || "+91",
    alternatePhone: address.alternatePhone || "",
    alternatePhoneCode: address.alternatePhoneCode || address.phoneCode || "+91",
    houseNumber: address.houseNumber || "",
    street: address.street || address.address || "",
    city: address.city || "",
    state: address.state || "",
    country: address.country || "",
    district: address.district || "",
    zip,
    pincode: zip,
  };
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { storeId, items, total, shippingFee, reason, paymentPayload } = body;

    if (!storeId) {
      return NextResponse.json({ success: false, message: "storeId is required" }, { status: 400 });
    }

    // Try to get userId from auth token if available
    let userId = null;
    const authHeader = request.headers.get("authorization");
    const tokenFromPayload = typeof body?.paymentPayload?.token === "string" ? body.paymentPayload.token.trim() : "";
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : tokenFromPayload;
    if (idToken) {
      try {
        const decoded = await getAuth().verifyIdToken(idToken);
        userId = decoded.uid;
      } catch (_) {
        // Token invalid or expired — fine, still save the failed order
      }
    }

    const pp = paymentPayload || {};
    const rawItems = items || pp.items || [];

    // Enrich items with product data to build orderItems
    let orderItems = [];
    if (rawItems.length > 0) {
      const productIds = rawItems.map(i => i.id).filter(Boolean);
      const products = await Product.find({ _id: { $in: productIds } }).lean();
      const productMap = {};
      products.forEach(p => { productMap[String(p._id)] = p; });

      orderItems = rawItems.map(item => {
        const product = productMap[String(item.id)];
        if (!product) return null;

        // Resolve price from variant if present
        let price = product.price || 0;
        if (item.variantOptions && product.variants?.length) {
          const matchedVariant = product.variants.find(v => {
            if (!v.options) return false;
            return Object.entries(item.variantOptions).every(([k, val]) => v.options[k] === val);
          });
          if (matchedVariant?.price != null) price = matchedVariant.price;
        }

        return {
          productId: product._id,
          name: product.name,
          price,
          quantity: item.quantity || 1,
          variantOptions: item.variantOptions || null,
        };
      }).filter(Boolean);
    }

    const orderData = {
      storeId,
      status: "PAYMENT_FAILED",
      paymentStatus: "FAILED",
      paymentMethod: "CARD",
      notes: `Payment failed: ${reason || "unknown"}`,
      isPaid: false,
      items: rawItems,
      orderItems,
      total: total || pp.total || 0,
      shippingFee: shippingFee || pp.shippingFee || 0,
    };

    if (userId) orderData.userId = userId;

    // Guest info
    if (pp.isGuest && pp.guestInfo) {
      orderData.isGuest = true;
      orderData.guestName = pp.guestInfo.name;
      orderData.guestEmail = pp.guestInfo.email;
      orderData.guestPhone = pp.guestInfo.phone;
      orderData.shippingAddress = mapAddressToShippingAddress({
        ...pp.guestInfo,
        street: pp.guestInfo.street || pp.guestInfo.address,
        zip: pp.guestInfo.zip || pp.guestInfo.pincode,
      });
    }

    if (!pp.isGuest) {
      if (pp.addressId) {
        orderData.addressId = pp.addressId;

        const savedAddress = await Address.findById(pp.addressId).lean();
        if (savedAddress) {
          orderData.shippingAddress = mapAddressToShippingAddress(savedAddress);
          orderData.alternatePhone = savedAddress.alternatePhone || "";
          orderData.alternatePhoneCode = savedAddress.alternatePhoneCode || savedAddress.phoneCode || "+91";
        }
      } else if (pp.addressData) {
        orderData.shippingAddress = mapAddressToShippingAddress(pp.addressData);
        orderData.alternatePhone = pp.addressData.alternatePhone || "";
        orderData.alternatePhoneCode = pp.addressData.alternatePhoneCode || pp.addressData.phoneCode || "+91";
      }
    }

    if (pp.addressId && !orderData.addressId) orderData.addressId = pp.addressId;
    if (pp.coupon) orderData.coupon = pp.coupon;

    const order = new Order(orderData);
    await order.save();

    return NextResponse.json({ success: true, orderId: order._id.toString() });
  } catch (error) {
    console.error("[Failed Order Save Error]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

