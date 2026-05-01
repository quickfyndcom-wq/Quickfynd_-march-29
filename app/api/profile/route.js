import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
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

  // India-local input like 9526473883 -> +919526473883
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

function toProfilePayload(user) {
  return {
    id: user?._id || "",
    uid: user?._id || "",
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    image: user?.image || "",
    phoneVerifiedAt: user?.phoneVerifiedAt || null,
    emailVerifiedAt: user?.emailVerifiedAt || null,
    updatedAt: user?.updatedAt || null,
  };
}

export async function GET(request) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth?.uid) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    await dbConnect();

    let user = await User.findById(auth.uid);
    if (!user) {
      user = await User.findOneAndUpdate(
        { _id: auth.uid },
        {
          $setOnInsert: {
            _id: auth.uid,
            firebaseUid: auth.uid,
            email: auth.email || null,
            phone: auth.phone || null,
            emailVerifiedAt: auth.email ? new Date() : null,
            phoneVerifiedAt: auth.phone ? new Date() : null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      const updates = {};
      if (!user.email && auth.email) {
        updates.email = auth.email;
        updates.emailVerifiedAt = user.emailVerifiedAt || new Date();
      }
      if (!user.phone && auth.phone) {
        updates.phone = auth.phone;
        updates.phoneVerifiedAt = user.phoneVerifiedAt || new Date();
      }
      if (Object.keys(updates).length) {
        user = await User.findByIdAndUpdate(
          auth.uid,
          { $set: updates },
          { new: true }
        );
      }
    }

    return NextResponse.json({
      profile: toProfilePayload(user),
    });
  } catch (error) {
    return errorResponse("PROFILE_FETCH_FAILED", error.message || "Failed to fetch profile", 400);
  }
}

export async function PATCH(request) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth?.uid) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    const body = await request.json();
    await dbConnect();

    const updateSet = {
      firebaseUid: auth.uid,
    };
    const unsetFields = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      updateSet.name = String(body.name || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "image")) {
      updateSet.image = String(body.image || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const nextEmail = normalizeEmail(body.email);
      if (nextEmail) {
        const emailTaken = await User.findOne({
          _id: { $ne: auth.uid },
          email: nextEmail,
        })
          .select("_id")
          .lean();

        if (emailTaken) {
          return errorResponse("EMAIL_ALREADY_IN_USE", "Email is already linked to another account.", 409);
        }

        updateSet.email = nextEmail;
        if (auth.email && auth.email === nextEmail) {
          updateSet.emailVerifiedAt = new Date();
        }
      } else {
        unsetFields.email = 1;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
      const nextPhone = normalizePhone(body.phone);
      if (String(body.phone || "").trim() && !nextPhone) {
        return errorResponse("INVALID_PHONE", "Phone format is invalid", 422);
      }

      if (nextPhone && !isValidPhoneE164(nextPhone)) {
        return errorResponse("INVALID_PHONE", "Phone format is invalid", 422);
      }

      if (nextPhone) {
        const phoneTaken = await User.findOne({
          _id: { $ne: auth.uid },
          phone: nextPhone,
        })
          .select("_id")
          .lean();

        if (phoneTaken) {
          return errorResponse("PHONE_ALREADY_IN_USE", "Phone is already linked to another account.", 409);
        }

        updateSet.phone = nextPhone;
        // Trust Firebase OTP identity if current token includes this phone.
        if (auth.phone && auth.phone === nextPhone) {
          updateSet.phoneVerifiedAt = new Date();
        }
      } else {
        unsetFields.phone = 1;
      }
    }

    const update = {
      $setOnInsert: { _id: auth.uid },
      $set: updateSet,
    };
    if (Object.keys(unsetFields).length) {
      update.$unset = unsetFields;
    }

    const user = await User.findOneAndUpdate(
      { _id: auth.uid },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      profile: toProfilePayload(user),
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

    return errorResponse("PROFILE_UPDATE_FAILED", error.message || "Failed to update profile", 400);
  }
}
