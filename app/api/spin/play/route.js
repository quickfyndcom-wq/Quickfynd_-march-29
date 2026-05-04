import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SpinCampaign from '@/models/SpinCampaign';
import SpinLog from '@/models/SpinLog';
import Coupon from '@/models/Coupon';
import { getAuth } from '@/lib/firebase-admin';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

function todayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Pick a slice by weighted random */
function pickSlice(slices) {
  const totalWeight = slices.reduce((sum, s) => sum + (s.weight || 0), 0);
  if (totalWeight <= 0) return null;
  let rand = Math.random() * totalWeight;
  for (const slice of slices) {
    rand -= slice.weight || 0;
    if (rand <= 0) return slice;
  }
  return slices[slices.length - 1];
}

/** Generate a unique coupon code like SPIN-A3F9K */
function generateCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

/**
 * POST /api/spin/play
 * Body: { storeId: string }
 * Auth: Bearer <firebase_id_token>
 *
 * Returns:
 * {
 *   sliceLabel: string,
 *   rewardType: 'coupon_percent' | 'coupon_flat' | 'no_win',
 *   couponCode: string | null,
 *   discountValue: number,
 *   minOrderValue: number,
 *   expiresAt: ISO string | null,
 *   message: string
 * }
 */
export async function POST(req) {
  try {
    await connectDB();

    // Authenticate user
    const token = parseAuthHeader(req);
    if (!token) return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });

    let userId;
    try {
      const auth = getAuth();
      const decoded = await auth.verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const storeId = String(body?.storeId || '').trim();
    if (!storeId) return NextResponse.json({ error: 'storeId is required' }, { status: 400 });

    // Load spin campaign
    const campaign = await SpinCampaign.findOne({ storeId }).lean();
    if (!campaign || !campaign.isEnabled) {
      return NextResponse.json({ error: 'Spin wheel is not active' }, { status: 404 });
    }

    const slices = campaign.slices || [];
    if (slices.length === 0) {
      return NextResponse.json({ error: 'Spin wheel has no slices configured' }, { status: 400 });
    }

    // Check daily spin limit
    const today = todayString();
    const spinsToday = await SpinLog.countDocuments({ userId, storeId, spinDate: today });
    if (spinsToday >= (campaign.dailySpinLimit || 1)) {
      return NextResponse.json({
        error: 'You have used all your spins for today. Come back tomorrow!',
        nextSpinAt: `${today}T00:00:00.000Z`,
      }, { status: 429 });
    }

    // Pick a slice
    const slice = pickSlice(slices);
    if (!slice) {
      return NextResponse.json({ error: 'Could not determine reward' }, { status: 500 });
    }

    let couponCode = null;
    let expiresAt = null;

    // Issue coupon if reward type requires one
    if (slice.rewardType === 'coupon_percent' || slice.rewardType === 'coupon_flat') {
      const discountType = slice.rewardType === 'coupon_percent' ? 'percentage' : 'fixed';
      const prefix = campaign.couponPrefix || 'SPIN';
      const hours = slice.expiryHours || 48;
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      // Try up to 5 times to generate a unique code
      let attempts = 0;
      while (attempts < 5) {
        const candidate = generateCode(prefix);
        const exists = await Coupon.exists({ code: candidate });
        if (!exists) {
          couponCode = candidate;
          break;
        }
        attempts++;
      }

      if (!couponCode) {
        return NextResponse.json({ error: 'Failed to generate coupon code, please try again' }, { status: 500 });
      }

      const discountVal = slice.discountValue || 0;
      await Coupon.create({
        code: couponCode,
        title: `${discountVal}${discountType === 'percentage' ? '%' : '₹'} Off (Spin Reward)`,
        description: `You won this coupon by spinning! Use it on your next order.`,
        storeId,
        discountType,
        discountValue: discountVal,
        discount: discountVal,
        minOrderValue: slice.minOrderValue || 0,
        minPrice: slice.minOrderValue || 0,
        maxUsesPerUser: 1,
        maxUses: 1,
        usageLimit: 1,
        oneTimePerUser: true,
        isPublic: false,
        isActive: true,
        expiresAt,
      });
    }

    // Log the spin
    await SpinLog.create({
      userId,
      storeId,
      spinDate: today,
      rewardType: slice.rewardType,
      couponCode,
      sliceLabel: slice.label,
    });

    return NextResponse.json({
      sliceLabel: slice.label,
      rewardType: slice.rewardType,
      couponCode,
      discountValue: slice.discountValue || 0,
      minOrderValue: slice.minOrderValue || 0,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      message: couponCode
        ? `Congratulations! You won: ${slice.label}. Use code ${couponCode} at checkout.`
        : slice.rewardType === 'no_win'
        ? "Better luck next time! You can spin again tomorrow."
        : `You won: ${slice.label}!`,
    }, { status: 200 });

  } catch (err) {
    console.error('[spin/play POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
