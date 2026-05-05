import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import CustomerReferral from '@/models/CustomerReferral';
import ReferralCode from '@/models/ReferralCode';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

// POST /api/referrals/link
// Body: { storeId: string, referralCode?: string, inviterUserId?: string }
export async function POST(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const invitedUserId = String(decoded.uid || '').trim();
    if (!invitedUserId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const storeId = String(body?.storeId || '').trim();
    const inviterUserIdFromBody = String(body?.inviterUserId || '').trim();
    const referralCode = String(body?.referralCode || '').trim().toUpperCase();

    if (!storeId) return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    if (!referralCode && !inviterUserIdFromBody) {
      return NextResponse.json({ error: 'referralCode or inviterUserId is required' }, { status: 400 });
    }

    await dbConnect();

    let inviterUserId = inviterUserIdFromBody;

    if (!inviterUserId && referralCode) {
      const codeDoc = await ReferralCode.findOne({ storeId, code: referralCode }).lean();
      if (!codeDoc?.userId) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
      }
      inviterUserId = String(codeDoc.userId || '').trim();
    }

    if (!inviterUserId) return NextResponse.json({ error: 'inviterUserId is required' }, { status: 400 });
    if (inviterUserId === invitedUserId) {
      return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
    }

    // Upsert: avoids TOCTOU race between findOne + create.
    // setOnInsert only applies on insert; $set is a no-op for existing docs.
    const result = await CustomerReferral.findOneAndUpdate(
      { storeId, invitedUserId },
      {
        $setOnInsert: {
          storeId,
          inviterUserId,
          invitedUserId,
          invitedAt: new Date(),
        },
      },
      { upsert: true, new: false, lean: true }
    );

    // result is null on insert (new doc), or the old doc if it already existed
    if (result) {
      return NextResponse.json(
        {
          success: true,
          message: 'Referral already linked for this store',
          inviterUserId: result.inviterUserId,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Referral linked successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[referrals/link POST] error:', error);
    return NextResponse.json({ error: 'Failed to link referral' }, { status: 500 });
  }
}
