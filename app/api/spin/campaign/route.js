import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SpinCampaign from '@/models/SpinCampaign';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/spin/campaign?storeId=<storeId>
// Public endpoint for app clients to fetch active spin configuration
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeId = String(searchParams.get('storeId') || '').trim();

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const campaign = await SpinCampaign.findOne({ storeId }).lean();
    if (!campaign || !campaign.isEnabled) {
      return NextResponse.json(
        {
          isEnabled: false,
          campaign: null,
          lastUpdatedAt: null,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const slices = Array.isArray(campaign.slices) ? campaign.slices.map((s) => ({
      label: String(s.label || ''),
      color: String(s.color || '#6366f1'),
      weight: Number(s.weight || 0),
      rewardType: String(s.rewardType || 'no_win'),
      discountValue: Number(s.discountValue || 0),
      minOrderValue: Number(s.minOrderValue || 0),
      expiryHours: Number(s.expiryHours || 48),
    })) : [];

    return NextResponse.json(
      {
        isEnabled: true,
        campaign: {
          storeId,
          campaignName: campaign.campaignName || 'Spin & Win',
          dailySpinLimit: Number(campaign.dailySpinLimit || 1),
          couponPrefix: campaign.couponPrefix || 'SPIN',
          slices,
        },
        lastUpdatedAt: campaign.updatedAt ? new Date(campaign.updatedAt).toISOString() : null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err) {
    console.error('[spin/campaign GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch spin campaign' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
