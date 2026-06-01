import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import GuestUser from "@/models/GuestUser";
import Order from "@/models/Order";
import { getAuth } from "@/lib/firebase-admin";

function errorResponse(code, message, status) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

function normalizeEmail(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function normalizePhone(value) {
  if (value === null || value === undefined) return "";
  let raw = String(value).trim();
  if (!raw) return "";

  raw = raw.replace(/[\s\-()]/g, "");
  if (raw.startsWith("00")) {
    raw = `+${raw.slice(2)}`;
  }

  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return "";

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return "";
}

function isValidPhoneE164(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

async function getAuthContextFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const idToken = authHeader.split(" ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return {
      uid: decoded?.uid || null,
      email: normalizeEmail(decoded?.email || ""),
      phone: normalizePhone(decoded?.phone_number || ""),
    };
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth?.uid) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    const body = await request.json();
    const bodyEmail = normalizeEmail(body?.email);
    const bodyPhoneRaw = String(body?.phone || "").trim();
    const bodyPhone = normalizePhone(body?.phone);

    if (bodyPhoneRaw && (!bodyPhone || !isValidPhoneE164(bodyPhone))) {
      return errorResponse("INVALID_PHONE", "Phone format is invalid", 422);
    }

    const targetEmail = bodyEmail || auth.email || "";
    const targetPhone = bodyPhone || auth.phone || "";

    if (!targetEmail && !targetPhone) {
      return errorResponse(
        "INVALID_INPUT",
        "At least one valid identity (email or phone) is required",
        422
      );
    }

    await dbConnect();

    if (targetEmail) {
      const emailTaken = await User.findOne({
        _id: { $ne: auth.uid },
        email: targetEmail,
      })
        .select("_id")
        .lean();
      if (emailTaken) {
        return errorResponse("EMAIL_ALREADY_IN_USE", "Email is already linked to another account.", 409);
      }
    }

    if (targetPhone) {
      const phoneTaken = await User.findOne({
        _id: { $ne: auth.uid },
        phone: targetPhone,
      })
        .select("_id")
        .lean();
      if (phoneTaken) {
        return errorResponse("PHONE_ALREADY_IN_USE", "Phone is already linked to another account.", 409);
      }
    }

    const now = new Date();
    const existingUser = await User.findById(auth.uid).select("email phone").lean();
    await User.findOneAndUpdate(
      { _id: auth.uid },
      {
        $setOnInsert: {
          _id: auth.uid,
          firebaseUid: auth.uid,
        },
        $set: {
          firebaseUid: auth.uid,
          ...(targetEmail ? { email: targetEmail } : {}),
          ...(targetPhone ? { phone: targetPhone } : {}),
          ...(targetEmail && auth.email === targetEmail ? { emailVerifiedAt: now } : {}),
          ...(targetPhone && auth.phone === targetPhone ? { phoneVerifiedAt: now } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const orderOrFilter = [];
    if (targetEmail) orderOrFilter.push({ guestEmail: targetEmail });
    if (targetPhone) orderOrFilter.push({ guestPhone: targetPhone });

    let mergedGuestOrders = 0;
    if (orderOrFilter.length) {
      const mergeResult = await Order.updateMany(
        {
          isGuest: true,
          userId: { $in: [null, ""] },
          $or: orderOrFilter,
        },
        {
          $set: {
            userId: auth.uid,
            isGuest: false,
          },
        }
      );
      mergedGuestOrders = mergeResult?.modifiedCount || 0;
    }

    const guestUserOrFilter = [];
    if (targetEmail) guestUserOrFilter.push({ email: targetEmail });
    if (targetPhone) guestUserOrFilter.push({ phone: targetPhone });

    if (guestUserOrFilter.length) {
      await GuestUser.updateMany(
        {
          accountCreated: false,
          $or: guestUserOrFilter,
        },
        {
          $set: {
            accountCreated: true,
            convertedUserId: auth.uid,
            convertedAt: now,
          },
        }
      );
    }

    console.info("[AccountLink] Linked identities", {
      uid: auth.uid,
      oldEmail: existingUser?.email || null,
      newEmail: targetEmail || null,
      oldPhone: existingUser?.phone || null,
      newPhone: targetPhone || null,
      source: auth.phone ? "phone_otp" : "google",
      timestamp: now.toISOString(),
      mergedGuestOrders,
    });

    return NextResponse.json({
      ok: true,
      linked: {
        email: Boolean(targetEmail),
        phone: Boolean(targetPhone),
      },
      mergedGuestOrders,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const dupKey = Object.keys(error?.keyPattern || {})[0];
      if (dupKey === "email") {
        return errorResponse("EMAIL_ALREADY_IN_USE", "Email is already linked to another account.", 409);
      }
      if (dupKey === "phone") {
        return errorResponse("PHONE_ALREADY_IN_USE", "Phone is already linked to another account.", 409);
      }
    }

    return errorResponse("LINK_IDENTITIES_FAILED", error.message || "Failed to link identities", 500);
  }
}
