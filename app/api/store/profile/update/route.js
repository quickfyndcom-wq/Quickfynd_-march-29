import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuth } from "@/lib/firebase-admin";

function normalizeEmail(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    await dbConnect();

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const image = String(body?.image || "").trim();
    const email = normalizeEmail(body?.email || "");

    if (email) {
      const existingEmailUser = await User.findOne({
        _id: { $ne: userId },
        email,
      })
        .select("_id")
        .lean();
      if (existingEmailUser) {
        return NextResponse.json(
          {
            error: {
              code: "EMAIL_ALREADY_IN_USE",
              message: "Email is already linked to another account.",
            },
          },
          { status: 409 }
        );
      }
    }

    await User.findOneAndUpdate(
      { _id: userId },
      {
        $setOnInsert: { _id: userId },
        $set: {
          firebaseUid: userId,
          name,
          image,
          ...(email ? { email } : {}),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_ALREADY_IN_USE",
            message: "Email is already linked to another account.",
          },
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
