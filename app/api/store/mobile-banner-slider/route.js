import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import MobileBannerSettings from '@/models/MobileBannerSettings';

const MAX_SLIDES = 8;

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

export async function GET(req) {
  try {
    await dbConnect();

    // Try to get user's own banner if authenticated
    const token = parseAuthHeader(req);
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        const own = await MobileBannerSettings.findOne({ storeId: decoded.uid }).lean();
        if (own && own.enabled && own.slides?.length > 0) {
          console.log(`[API /store/mobile-banner-slider GET] Auth - Found user banner: ${own.slides.length} slides`);
          return NextResponse.json({ enabled: true, slides: own.slides }, { status: 200 });
        }
      } catch (error) {
        console.warn('[API /store/mobile-banner-slider GET] Token verification failed:', error?.message);
      }
    }

    // Get any enabled public banner (works for both auth and non-auth users)
    const settings = await MobileBannerSettings.findOne({ 
      enabled: true, 
      slides: { $exists: true, $ne: [] } 
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (settings && settings.slides?.length > 0) {
      console.log(`[API /store/mobile-banner-slider GET] Found public banner: ${settings.slides.length} slides`);
      return NextResponse.json({ enabled: true, slides: settings.slides }, { status: 200 });
    }

    console.log('[API /store/mobile-banner-slider GET] No banner found');
    return NextResponse.json({ enabled: false, slides: [] }, { status: 200 });
  } catch (error) {
    console.error('[API /store/mobile-banner-slider GET] error:', error);
    return NextResponse.json({ enabled: false, slides: [] }, { status: 200 });
  }
}

export async function POST(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    console.log(`[API /store/mobile-banner-slider POST] User ${userId} attempting to save banner`);

    await dbConnect();

    const body = await req.json();
    const { enabled = true, slides = [] } = body || {};

    if (!Array.isArray(slides)) {
      console.warn(`[API /store/mobile-banner-slider POST] Invalid slides format for user ${userId}`);
      return NextResponse.json({ error: 'Slides must be an array' }, { status: 400 });
    }

    if (slides.length === 0) {
      console.warn(`[API /store/mobile-banner-slider POST] No slides provided by user ${userId}`);
      return NextResponse.json({ error: 'At least one slide is required' }, { status: 400 });
    }

    if (slides.length > MAX_SLIDES) {
      console.warn(`[API /store/mobile-banner-slider POST] Too many slides (${slides.length}) by user ${userId}`);
      return NextResponse.json({ error: `Maximum ${MAX_SLIDES} slides allowed` }, { status: 400 });
    }

    const sanitizedSlides = slides.map((slide, idx) => {
      const image = String(slide?.image || '').trim();
      const link = String(slide?.link || '/offers').trim() || '/offers';
      const title = String(slide?.title || '').trim();

      if (!image) {
        throw new Error(`Slide ${idx + 1}: image is required`);
      }

      return { image, link, title };
    });

    const settings = await MobileBannerSettings.findOneAndUpdate(
      { storeId: userId },
      {
        storeId: userId,
        enabled: !!enabled,
        slides: sanitizedSlides,
      },
      { upsert: true, new: true }
    );

    console.log(`[API /store/mobile-banner-slider POST] Successfully saved banner for user ${userId}: enabled=${settings.enabled}, slides=${settings.slides.length}`);

    return NextResponse.json(
      {
        message: 'Mobile banner slider settings updated',
        data: {
          enabled: settings.enabled,
          slides: settings.slides,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/mobile-banner-slider POST] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save mobile banner slider settings' }, { status: 500 });
  }
}
