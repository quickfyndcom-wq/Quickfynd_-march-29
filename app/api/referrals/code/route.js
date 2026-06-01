import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import ReferralCode from '@/models/ReferralCode';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

function randomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function createUniqueCode(storeId, userId) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = randomCode(8);
    try {
      const doc = await ReferralCode.create({ storeId, userId, code: candidate });
      return doc.code;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new Error('Unable to generate unique referral code');
}

// GET /api/referrals/code?storeId=<storeId>
// Returns inviter's referral code for this store.
export async function GET(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const userId = String(decoded.uid || '').trim();
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const storeId = String(searchParams.get('storeId') || '').trim();
    if (!storeId) return NextResponse.json({ error: 'storeId is required' }, { status: 400 });

    await dbConnect();

    const existing = await ReferralCode.findOne({ storeId, userId }).lean();
    if (existing?.code) {
      return NextResponse.json({ code: existing.code }, { status: 200 });
    }

    const code = await createUniqueCode(storeId, userId);
    return NextResponse.json({ code }, { status: 200 });
  } catch (error) {
    console.error('[referrals/code GET] error:', error);
    return NextResponse.json({ error: 'Failed to get referral code' }, { status: 500 });
  }
}
