import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import ReferralProgramSettings from '@/models/ReferralProgramSettings';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

export async function GET(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    await dbConnect();

    const storeId = await authSeller(decoded.uid);
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const settings = await ReferralProgramSettings.findOne({ storeId: String(storeId) }).lean();

    return NextResponse.json(
      {
        enabled: settings?.enabled !== false,
        inviterRewardCoins: Number(settings?.inviterRewardCoins ?? 25),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[store/referral-program GET] error:', error);
    return NextResponse.json({ error: 'Failed to load referral settings' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    await dbConnect();

    const storeId = await authSeller(decoded.uid);
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const enabled = body?.enabled !== false;
    const inviterRewardCoins = Math.max(0, Number(body?.inviterRewardCoins ?? 25));

    const settings = await ReferralProgramSettings.findOneAndUpdate(
      { storeId: String(storeId) },
      {
        storeId: String(storeId),
        enabled,
        inviterRewardCoins,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json(
      {
        enabled: !!settings.enabled,
        inviterRewardCoins: Number(settings.inviterRewardCoins || 25),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[store/referral-program POST] error:', error);
    return NextResponse.json({ error: 'Failed to save referral settings' }, { status: 500 });
  }
}
