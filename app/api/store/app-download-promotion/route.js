import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import AppDownloadPromotionSettings from '@/models/AppDownloadPromotionSettings';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

export async function GET(req) {
  try {
    await dbConnect();

    const token = parseAuthHeader(req);
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        const own = await AppDownloadPromotionSettings.findOne({ storeId: decoded.uid }).lean();
        if (own) {
          return NextResponse.json({ enabled: !!own.enabled }, { status: 200 });
        }
      } catch (error) {
        console.warn('[API /store/app-download-promotion GET] Token verification failed:', error?.message);
      }
    }

    const settings = await AppDownloadPromotionSettings.findOne({}).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ enabled: settings ? !!settings.enabled : true }, { status: 200 });
  } catch (error) {
    console.error('[API /store/app-download-promotion GET] error:', error);
    return NextResponse.json({ enabled: true }, { status: 200 });
  }
}

export async function POST(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    await dbConnect();

    const body = await req.json();
    const enabled = body?.enabled !== false;

    const settings = await AppDownloadPromotionSettings.findOneAndUpdate(
      { storeId: decoded.uid },
      {
        storeId: decoded.uid,
        enabled,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        message: enabled ? 'App download promotion enabled' : 'App download promotion disabled',
        enabled: !!settings.enabled,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/app-download-promotion POST] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save app download promotion settings' }, { status: 500 });
  }
}