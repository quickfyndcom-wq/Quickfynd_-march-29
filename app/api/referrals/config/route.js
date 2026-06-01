import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ReferralProgramSettings from '@/models/ReferralProgramSettings';

// GET /api/referrals/config?storeId=<storeId>
// Public endpoint for mobile/web app to know if referral program is enabled and reward amount.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = String(searchParams.get('storeId') || '').trim();
    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    await dbConnect();

    const settings = await ReferralProgramSettings.findOne({ storeId }).lean();

    return NextResponse.json(
      {
        enabled: settings?.enabled !== false,
        inviterRewardCoins: Number(settings?.inviterRewardCoins ?? 25),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[referrals/config GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch referral config' }, { status: 500 });
  }
}
