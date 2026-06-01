import dbConnect from '@/lib/mongodb';
import HeroSliderSettings from '@/models/HeroSliderSettings';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';

const MAX_SLIDES = 6;

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

function sanitizeHexColor(color, fallback = '#7A0A11') {
  const raw = String(color || '').trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(raw)) return raw;
  return fallback;
}

export async function GET(req) {
  try {
    await dbConnect();

    const token = parseAuthHeader(req);
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        const own = await HeroSliderSettings.findOne({ storeId: decoded.uid }).lean();

        return NextResponse.json(
          {
            enabled: own?.enabled ?? true,
            slides: own?.slides || [],
          },
          { status: 200 }
        );
      } catch (error) {
        console.warn('[API /store/hero-slider GET] token verify failed:', error?.message || error);
      }
    }

    const settings = await HeroSliderSettings.findOne({ enabled: true, slides: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        enabled: settings?.enabled ?? false,
        slides: settings?.slides || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/hero-slider GET] error:', error);
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

    await dbConnect();

    const body = await req.json();
    const { enabled = true, slides = [] } = body || {};

    if (!Array.isArray(slides)) {
      return NextResponse.json({ error: 'Slides must be an array' }, { status: 400 });
    }

    if (slides.length === 0) {
      return NextResponse.json({ error: 'At least one slide is required' }, { status: 400 });
    }

    if (slides.length > MAX_SLIDES) {
      return NextResponse.json({ error: `Maximum ${MAX_SLIDES} slides allowed` }, { status: 400 });
    }

    const sanitizedSlides = slides.map((slide, idx) => {
      const image = String(slide?.image || '').trim();
      const link = String(slide?.link || '/offers').trim() || '/offers';
      const bg = sanitizeHexColor(slide?.bg, '#7A0A11');

      if (!image) {
        throw new Error(`Slide ${idx + 1}: image is required`);
      }

      return { image, link, bg };
    });

    const settings = await HeroSliderSettings.findOneAndUpdate(
      { storeId: userId },
      {
        storeId: userId,
        enabled: !!enabled,
        slides: sanitizedSlides,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        message: 'Hero slider settings updated',
        data: {
          enabled: settings.enabled,
          slides: settings.slides,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/hero-slider POST] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save hero slider settings' }, { status: 500 });
  }
}