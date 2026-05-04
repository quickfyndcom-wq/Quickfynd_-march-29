import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SpinCampaign from '@/models/SpinCampaign';
import Store from '@/models/Store';
import authSeller from '@/middlewares/authSeller';

async function getSellerUserId(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const idToken = authHeader.split(' ')[1];
  try {
    const { getAuth } = await import('firebase-admin/auth');
    const { initializeApp, getApps } = await import('firebase-admin/app');
    if (getApps().length === 0) {
      const { applicationDefault } = await import('firebase-admin/app');
      initializeApp({ credential: applicationDefault() });
    }
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

// GET /api/store/spin-campaign — fetch current campaign settings
export async function GET(req) {
  try {
    await connectDB();
    const userId = await getSellerUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const campaign = await SpinCampaign.findOne({ storeId: storeId.toString() }).lean();
    return NextResponse.json({ campaign: campaign || null }, { status: 200 });
  } catch (err) {
    console.error('[spin-campaign GET]', err);
    return NextResponse.json({ error: 'Failed to fetch spin campaign' }, { status: 500 });
  }
}

// POST /api/store/spin-campaign — create or update campaign settings
export async function POST(req) {
  try {
    await connectDB();
    const userId = await getSellerUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const {
      isEnabled,
      campaignName,
      couponPrefix,
      dailySpinLimit,
      slices,
    } = body;

    // Validate slices
    if (!Array.isArray(slices)) {
      return NextResponse.json({ error: 'slices must be an array' }, { status: 400 });
    }

    // Sanitize slices
    const sanitizedSlices = slices.map((s) => ({
      label: String(s.label || '').trim().slice(0, 50),
      weight: Math.max(0, Number(s.weight) || 0),
      rewardType: ['coupon_percent', 'coupon_flat', 'no_win'].includes(s.rewardType) ? s.rewardType : 'no_win',
      discountValue: Math.max(0, Number(s.discountValue) || 0),
      minOrderValue: Math.max(0, Number(s.minOrderValue) || 0),
      expiryHours: Math.max(1, Number(s.expiryHours) || 48),
      color: /^#[0-9a-fA-F]{3,6}$/.test(s.color) ? s.color : '#6366f1',
    }));

    const prefix = String(couponPrefix || 'SPIN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

    const campaign = await SpinCampaign.findOneAndUpdate(
      { storeId: storeId.toString() },
      {
        storeId: storeId.toString(),
        isEnabled: Boolean(isEnabled),
        campaignName: String(campaignName || 'Spin & Win').trim().slice(0, 80),
        couponPrefix: prefix,
        dailySpinLimit: Math.max(1, Math.min(10, Number(dailySpinLimit) || 1)),
        slices: sanitizedSlices,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ campaign }, { status: 200 });
  } catch (err) {
    console.error('[spin-campaign POST]', err);
    return NextResponse.json({ error: 'Failed to save spin campaign' }, { status: 500 });
  }
}
