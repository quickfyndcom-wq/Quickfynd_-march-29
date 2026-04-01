import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CustomerBehaviorEvent from "@/models/CustomerBehaviorEvent";
import User from "@/models/User";
import Address from "@/models/Address";

const ALLOWED_EVENTS = new Set([
  "product_view",
  "product_exit",
  "add_to_cart",
  "go_to_checkout",
  "order_placed",
  "page_view",
  "checkout_visit",
]);

const normalize = (value) => String(value || "").trim();

function buildCustomerIdentity(body) {
  const userId = normalize(body?.userId);
  const email = normalize(body?.customerEmail).toLowerCase();
  const phone = normalize(body?.customerPhone);
  const name = normalize(body?.customerName);
  const address = normalize(body?.customerAddress);
  const visitorId = normalize(body?.visitorId);
  const sessionId = normalize(body?.sessionId);

  let customerType = userId ? "logged_in" : "guest";
  let customerKey = "";

  if (userId) customerKey = `user:${userId}`;
  else if (visitorId) customerKey = `guest:${visitorId}`;
  else if (email) customerKey = `guest_email:${email}`;
  else if (phone) customerKey = `guest_phone:${phone}`;
  else if (sessionId) customerKey = `guest_session:${sessionId}`;
  else customerType = "anonymous";

  return {
    customerType,
    customerKey,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    customerAddress: address,
  };
}

async function hydrateMissingIdentity(storeId, body, customer) {
  const hasIdentity = Boolean(
    customer.customerName || customer.customerEmail || customer.customerPhone || customer.customerAddress
  );
  if (hasIdentity) return customer;

  const visitorId = String(body?.visitorId || "").trim();
  const sessionId = String(body?.sessionId || "").trim();
  const userId = String(body?.userId || "").trim();

  const orFilters = [];
  if (customer.customerKey) orFilters.push({ customerKey: customer.customerKey });
  if (visitorId) orFilters.push({ visitorId });
  if (sessionId) orFilters.push({ sessionId });
  if (userId) orFilters.push({ userId });

  if (orFilters.length === 0) return customer;

  const previous = await CustomerBehaviorEvent.findOne({
    storeId,
    $and: [
      { $or: orFilters },
      {
        $or: [
          { customerName: { $ne: "" } },
          { customerEmail: { $ne: "" } },
          { customerPhone: { $ne: "" } },
          { customerAddress: { $ne: "" } },
        ],
      },
    ],
  })
    .sort({ eventAt: -1 })
    .lean();

  const hydratedFromEvents = {
    customerType: customer.customerType || previous?.customerType || "guest",
    customerKey: customer.customerKey || previous?.customerKey || "",
    customerName: customer.customerName || String(previous?.customerName || ""),
    customerEmail: customer.customerEmail || String(previous?.customerEmail || ""),
    customerPhone: customer.customerPhone || String(previous?.customerPhone || ""),
    customerAddress: customer.customerAddress || String(previous?.customerAddress || ""),
  };

  if (!previous) {
    hydratedFromEvents.customerType = customer.customerType || (userId ? "logged_in" : "guest");
    hydratedFromEvents.customerKey = customer.customerKey || (userId ? `user:${userId}` : "");
    hydratedFromEvents.customerName = customer.customerName || "";
    hydratedFromEvents.customerEmail = customer.customerEmail || "";
    hydratedFromEvents.customerPhone = customer.customerPhone || "";
    hydratedFromEvents.customerAddress = customer.customerAddress || "";
  }

  const stillMissingIdentity = !(
    hydratedFromEvents.customerName || hydratedFromEvents.customerEmail || hydratedFromEvents.customerPhone || hydratedFromEvents.customerAddress
  );

  if (!stillMissingIdentity || !userId) {
    return hydratedFromEvents;
  }

  const [userDoc, latestAddress] = await Promise.all([
    User.findOne({ $or: [{ _id: userId }, { firebaseUid: userId }] }).lean(),
    Address.findOne({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const addressText = latestAddress
    ? [
        latestAddress.street,
        latestAddress.city,
        latestAddress.district,
        latestAddress.state,
        latestAddress.country,
        latestAddress.pincode || latestAddress.zip,
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    customerType: hydratedFromEvents.customerType || "logged_in",
    customerKey: hydratedFromEvents.customerKey,
    customerName:
      hydratedFromEvents.customerName ||
      String(userDoc?.name || latestAddress?.name || "").trim(),
    customerEmail:
      hydratedFromEvents.customerEmail ||
      String(userDoc?.email || latestAddress?.email || "").trim().toLowerCase(),
    customerPhone:
      hydratedFromEvents.customerPhone ||
      String(userDoc?.phone || latestAddress?.phone || "").trim(),
    customerAddress: hydratedFromEvents.customerAddress || addressText,
  };
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const storeId = String(body?.storeId || "").trim();
    const eventType = String(body?.eventType || "").trim();

    if (!storeId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json(
        { error: "Invalid tracking payload" },
        { status: 400 }
      );
    }

    const eventAt = body?.eventAt ? new Date(body.eventAt) : new Date();
    const baseCustomer = buildCustomerIdentity(body);
    const customer = await hydrateMissingIdentity(storeId, body, baseCustomer);

    await CustomerBehaviorEvent.create({
      storeId,
      sessionId: String(body?.sessionId || "").trim() || `session_${Date.now()}`,
      visitorId: String(body?.visitorId || "").trim() || `visitor_${Date.now()}`,
      userId: body?.userId ? String(body.userId) : null,
      customerType: customer.customerType,
      customerKey: customer.customerKey,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      customerPhone: customer.customerPhone,
      customerAddress: customer.customerAddress,
      eventType,
      source: String(body?.source || "direct").toLowerCase(),
      medium: String(body?.medium || "direct").toLowerCase(),
      campaign: String(body?.campaign || "none"),
      referrer: String(body?.referrer || "direct"),
      pagePath: String(body?.pagePath || ""),
      productId: body?.productId ? String(body.productId) : null,
      productSlug: body?.productSlug ? String(body.productSlug) : null,
      productName: body?.productName ? String(body.productName) : null,
      durationMs: Number(body?.durationMs || 0),
      scrollDepthPercent: Number(body?.scrollDepthPercent || 0),
      nextAction: String(body?.nextAction || "unknown"),
      orderId: body?.orderId ? String(body.orderId) : null,
      orderValue: Number(body?.orderValue || 0),
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      eventAt: Number.isNaN(eventAt.getTime()) ? new Date() : eventAt,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[customer-behavior] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track event" },
      { status: 500 }
    );
  }
}
