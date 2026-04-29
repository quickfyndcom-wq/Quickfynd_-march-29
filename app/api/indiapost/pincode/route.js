import { NextResponse } from 'next/server';
import { searchIndiaPostOffices } from '@/lib/indiaPost';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = String(searchParams.get('pincode') || '').trim();
    const limit = Number(searchParams.get('limit') || 50);
    const officeType = String(searchParams.get('officeType') || '').trim();

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Valid 6-digit pincode is required' }, { status: 400 });
    }

    const data = await searchIndiaPostOffices({ pincode, limit, officeType });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to search India Post offices' }, { status: 500 });
  }
}
