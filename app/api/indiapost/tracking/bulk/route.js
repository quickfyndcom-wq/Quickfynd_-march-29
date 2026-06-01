import { NextResponse } from 'next/server';
import { trackIndiaPostBulk } from '@/lib/indiaPost';

export async function POST(request) {
  try {
    const body = await request.json();
    const bulk = Array.isArray(body?.bulk) ? body.bulk.map(String).filter(Boolean) : [];

    if (bulk.length === 0) {
      return NextResponse.json({ error: 'bulk array is required' }, { status: 400 });
    }
    if (bulk.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 article numbers allowed per request' }, { status: 400 });
    }

    const data = await trackIndiaPostBulk(bulk);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'India Post tracking failed' }, { status: 500 });
  }
}
