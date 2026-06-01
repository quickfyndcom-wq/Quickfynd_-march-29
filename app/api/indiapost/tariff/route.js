import { NextResponse } from 'next/server';
import { getIndiaPostBusinessParcelTariff, getIndiaPostSpeedPostTariff } from '@/lib/indiaPost';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const service = (searchParams.get('service') || 'speed-post').toLowerCase();

    const query = Object.fromEntries(searchParams.entries());
    delete query.service;

    if (service === 'business-parcel' || service === 'bp') {
      const data = await getIndiaPostBusinessParcelTariff(query);
      return NextResponse.json(data);
    }

    const data = await getIndiaPostSpeedPostTariff(query);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch India Post tariff' }, { status: 500 });
  }
}
