import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import { getAuth } from '@/lib/firebase-admin';
import { fetchSeventeenTrackInfo } from '@/lib/seventeentrack';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const awb = (searchParams.get('awb') || '').trim();

  if (!awb) {
    return NextResponse.json({ success: false, message: 'AWB is required' }, { status: 400 });
  }

  try {
    await connectDB();

    let seventeenTrackConfig = {};
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decoded = await getAuth().verifyIdToken(idToken);
      const store = await Store.findOne({ userId: decoded.uid })
        .select('+integrations.seventeentrack.baseUrl +integrations.seventeentrack.apiKey +integrations.seventeentrack.publicKey +integrations.seventeentrack.secretKey')
        .lean();
      const cfg = store?.integrations?.seventeentrack || {};
      seventeenTrackConfig = {
        baseUrl: String(cfg.baseUrl || '').trim(),
        apiKey: String(cfg.apiKey || '').trim(),
        publicKey: String(cfg.publicKey || '').trim(),
        secretKey: String(cfg.secretKey || '').trim(),
      };
    }

    const tracking = await fetchSeventeenTrackInfo(awb, seventeenTrackConfig);
    if (!tracking) {
      const hasStoreToken = !!(
        seventeenTrackConfig.apiKey ||
        seventeenTrackConfig.publicKey ||
        seventeenTrackConfig.secretKey
      );
      if (!hasStoreToken && !process.env.SEVENTEENTRACK_API_KEY?.trim()) {
        return NextResponse.json(
          { success: false, message: '17track API key is not configured', noKey: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: false, message: 'No tracking data found for this AWB' }, { status: 404 });
    }
    return NextResponse.json({ success: true, tracking });
  } catch (err) {
    console.error('17track fetch error:', err?.message || err);
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch tracking' }, { status: 500 });
  }
}
