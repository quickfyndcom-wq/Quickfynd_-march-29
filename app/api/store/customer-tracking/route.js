import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CustomerBehaviorEvent from "@/models/CustomerBehaviorEvent";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@/lib/firebase-admin";

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const idToken = authHeader.split("Bearer ")[1];
  const decodedToken = await getAuth().verifyIdToken(idToken);
  const userId = decodedToken.uid;
  const storeId = await authSeller(userId);

  if (!storeId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { storeId };
}

function getDateRange(searchParams) {
  const days = Number(searchParams.get("days") || 7);
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;
  const from = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  return { from, safeDays };
}

function buildCustomerLookupFilter(baseFilter, customerKey) {
  if (!customerKey) return baseFilter;

  const prefixMatch = String(customerKey).match(/^(user|guest|guest_session|guest_email|guest_phone):(.*)$/);
  if (!prefixMatch) {
    return { ...baseFilter, customerKey };
  }

  const type = prefixMatch[1];
  const value = String(prefixMatch[2] || "").trim();
  if (!value) return { ...baseFilter, customerKey };

  if (type === "user") {
    return {
      ...baseFilter,
      $or: [
        { customerKey },
        { userId: value },
      ],
    };
  }

  if (type === "guest") {
    return {
      ...baseFilter,
      $or: [
        { customerKey },
        { visitorId: value },
      ],
    };
  }

  if (type === "guest_session") {
    return {
      ...baseFilter,
      $or: [
        { customerKey },
        { sessionId: value },
      ],
    };
  }

  if (type === "guest_email") {
    return {
      ...baseFilter,
      $or: [
        { customerKey },
        { customerEmail: value.toLowerCase() },
      ],
    };
  }

  if (type === "guest_phone") {
    return {
      ...baseFilter,
      $or: [
        { customerKey },
        { customerPhone: value },
      ],
    };
  }

  return { ...baseFilter, customerKey };
}

function pickLatestNonEmpty(timeline, fieldName) {
  if (!Array.isArray(timeline) || timeline.length === 0) return "";
  for (const event of timeline) {
    const value = String(event?.[fieldName] || "").trim();
    if (value) return value;
  }
  return "";
}

function inferCustomerType(event) {
  const explicitType = String(event?.customerType || "").trim().toLowerCase();
  if (explicitType === "logged_in") return "logged_in";

  const userId = String(event?.userId || "").trim();
  if (userId) return "logged_in";

  const key = String(event?.customerKey || "").trim().toLowerCase();
  if (key.startsWith("user:")) return "logged_in";

  return explicitType || "guest";
}

function inferCustomerTypeFromTimeline(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return "guest";
  for (const event of timeline) {
    if (inferCustomerType(event) === "logged_in") return "logged_in";
  }
  return "guest";
}

export async function GET(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const { from, safeDays } = getDateRange(searchParams);
    const customerKey = String(searchParams.get("customerKey") || "").trim();
    const { storeId } = authResult;

    const baseFilter = {
      storeId,
      eventAt: { $gte: from },
    };

    const [
      totalEvents,
      uniqueVisitors,
      uniqueCustomers,
      productViews,
      goToCheckout,
      ordersPlaced,
      avgDuration,
      avgScrollDepth,
      sourceBreakdown,
      eventBreakdown,
      topProducts,
      recentEvents,
    ] = await Promise.all([
      CustomerBehaviorEvent.countDocuments(baseFilter),
      CustomerBehaviorEvent.distinct("visitorId", baseFilter),
      CustomerBehaviorEvent.distinct("customerKey", {
        ...baseFilter,
        customerKey: { $ne: "" },
      }),
      CustomerBehaviorEvent.countDocuments({ ...baseFilter, eventType: "product_view" }),
      CustomerBehaviorEvent.countDocuments({ ...baseFilter, eventType: "go_to_checkout" }),
      CustomerBehaviorEvent.countDocuments({ ...baseFilter, eventType: "order_placed" }),
      CustomerBehaviorEvent.aggregate([
        { $match: { ...baseFilter, eventType: "product_exit" } },
        { $group: { _id: null, avgDurationMs: { $avg: "$durationMs" } } },
      ]),
      CustomerBehaviorEvent.aggregate([
        { $match: { ...baseFilter, eventType: "product_exit" } },
        { $group: { _id: null, avgScroll: { $avg: "$scrollDepthPercent" } } },
      ]),
      CustomerBehaviorEvent.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      CustomerBehaviorEvent.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CustomerBehaviorEvent.aggregate([
        { $match: { ...baseFilter, productId: { $ne: null } } },
        {
          $group: {
            _id: "$productId",
            productName: { $first: "$productName" },
            views: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "product_view"] }, 1, 0],
              },
            },
            checkouts: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "go_to_checkout"] }, 1, 0],
              },
            },
            orders: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "order_placed"] }, 1, 0],
              },
            },
            avgDurationMs: {
              $avg: {
                $cond: [
                  { $eq: ["$eventType", "product_exit"] },
                  "$durationMs",
                  null,
                ],
              },
            },
          },
        },
        { $sort: { views: -1, checkouts: -1 } },
        { $limit: 20 },
      ]),
      CustomerBehaviorEvent.find(baseFilter)
        .sort({ eventAt: -1 })
        .limit(50)
        .lean(),
    ]);

    let customerTimeline = [];
    let customerSummary = null;
    if (customerKey) {
      const customerFilter = buildCustomerLookupFilter(baseFilter, customerKey);

      customerTimeline = await CustomerBehaviorEvent.find(customerFilter)
        .sort({ eventAt: -1 })
        .limit(200)
        .lean();

      if (customerTimeline.length > 0) {
        const customerType = inferCustomerTypeFromTimeline(customerTimeline);
        const userId = pickLatestNonEmpty(customerTimeline, "userId");
        const customerName = pickLatestNonEmpty(customerTimeline, "customerName");
        const customerEmail = pickLatestNonEmpty(customerTimeline, "customerEmail");
        const customerPhone = pickLatestNonEmpty(customerTimeline, "customerPhone");
        const customerAddress = pickLatestNonEmpty(customerTimeline, "customerAddress");

        customerSummary = {
          customerKey,
          customerType,
          userId,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          totalEvents: customerTimeline.length,
          firstSeenAt: customerTimeline[customerTimeline.length - 1]?.eventAt || null,
          lastSeenAt: customerTimeline[0]?.eventAt || null,
        };
      }
    }

    const visitorsCount = Array.isArray(uniqueVisitors) ? uniqueVisitors.length : 0;
    const customersCount = Array.isArray(uniqueCustomers) ? uniqueCustomers.length : 0;
    const checkoutRate = productViews > 0 ? (goToCheckout / productViews) * 100 : 0;
    const orderRateFromCheckout = goToCheckout > 0 ? (ordersPlaced / goToCheckout) * 100 : 0;

    return NextResponse.json({
      periodDays: safeDays,
      overview: {
        totalEvents,
        uniqueVisitors: visitorsCount,
        uniqueCustomers: customersCount,
        productViews,
        goToCheckout,
        ordersPlaced,
        checkoutRate,
        orderRateFromCheckout,
        avgDurationMs: avgDuration?.[0]?.avgDurationMs || 0,
        avgScrollDepth: avgScrollDepth?.[0]?.avgScroll || 0,
      },
      sourceBreakdown,
      eventBreakdown,
      topProducts,
      recentEvents: recentEvents.map((event) => ({
        ...event,
        _id: String(event._id),
        userId: event.userId || "",
        visitorId: event.visitorId || "",
        sessionId: event.sessionId || "",
        customerType: inferCustomerType(event),
        customerKey: event.customerKey || "",
        customerName: event.customerName || "",
        customerEmail: event.customerEmail || "",
        customerPhone: event.customerPhone || "",
        customerAddress: event.customerAddress || "",
      })),
      customerSummary,
      customerTimeline: customerTimeline.map((event) => ({
        ...event,
        _id: String(event._id),
        userId: event.userId || "",
        visitorId: event.visitorId || "",
        sessionId: event.sessionId || "",
        customerType: inferCustomerType(event),
        customerKey: event.customerKey || "",
        customerName: event.customerName || "",
        customerEmail: event.customerEmail || "",
        customerPhone: event.customerPhone || "",
        customerAddress: event.customerAddress || "",
      })),
    });
  } catch (error) {
    console.error("[store-customer-tracking] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
