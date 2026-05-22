import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StoreUser from "@/models/StoreUser";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@/lib/firebase-admin";

const DEFAULT_PERMISSIONS = {
  overview: false,
  catalog: false,
  orders: false,
  customers: false,
  marketing: false,
  storefront: false,
};

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePermissions(input) {
  if (!input || typeof input !== "object") return DEFAULT_PERMISSIONS;
  return {
    overview: input.overview === true,
    catalog: input.catalog === true,
    orders: input.orders === true,
    customers: input.customers === true,
    marketing: input.marketing === true,
    storefront: input.storefront === true,
  };
}

function normalizeMenuPermissions(input) {
  if (!input || typeof input !== "object") return {};
  const normalized = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof key === "string" && key.startsWith("/store")) {
      normalized[key] = value !== false;
    }
  }
  return normalized;
}

function toAllowedPaths(menuPermissions) {
  return Object.entries(menuPermissions)
    .filter(([, allowed]) => allowed === true)
    .map(([path]) => path);
}

export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { userId: targetUserDocId, userEmail, permissions } = await request.json();
    if (!targetUserDocId && !userEmail) {
      return NextResponse.json({ error: "Missing target user id or email" }, { status: 400 });
    }

    const normalizedPermissions = normalizePermissions(permissions);
    const normalizedMenuPermissions = normalizeMenuPermissions(permissions);
    const allowedPaths = toAllowedPaths(normalizedMenuPermissions);

    let targetDoc = null;

    if (targetUserDocId) {
      targetDoc = await StoreUser.findOne({
        _id: targetUserDocId,
        storeId: String(storeId),
        status: { $in: ["approved", "pending", "invited"] },
      }).lean();
    }

    if (!targetDoc && userEmail) {
      targetDoc = await StoreUser.findOne({
        storeId: String(storeId),
        email: String(userEmail).toLowerCase().trim(),
        status: { $in: ["approved", "pending", "invited"] },
      }).lean();
    }

    if (!targetDoc) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const updatePayload = {
      permissions: normalizedPermissions,
      menuPermissions: normalizedMenuPermissions,
      allowedPaths,
      permissionsConfigured: true,
    };

    const primaryUpdate = await StoreUser.updateOne(
      {
        _id: targetDoc._id,
        storeId: String(storeId),
        status: { $in: ["approved", "pending", "invited"] },
      },
      { $set: updatePayload }
    );

    if (!primaryUpdate.matchedCount) {
      return NextResponse.json({ error: "Team member not found for update" }, { status: 404 });
    }

    const canonicalEmail = String(targetDoc.email || userEmail || "").trim();
    if (canonicalEmail) {
      await StoreUser.updateMany(
        {
          storeId: String(storeId),
          _id: { $ne: targetDoc._id },
          email: { $regex: `^${escapeRegex(canonicalEmail)}$`, $options: "i" },
          status: { $in: ["approved", "pending", "invited"] },
        },
        { $set: updatePayload }
      );
    }

    const updated = await StoreUser.findOne({
      _id: targetDoc._id,
      storeId: String(storeId),
    }).lean();

    return NextResponse.json({
      message: "Permissions updated successfully",
      user: { ...updated, id: String(updated._id), _id: String(updated._id) },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update permissions" }, { status: 400 });
  }
}
