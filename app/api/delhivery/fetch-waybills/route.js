import { NextResponse } from 'next/server';
import Waybill from '@/models/Waybill';
import connectDB from '@/lib/mongodb';

export async function POST(request) {
  await connectDB();
  const { count } = await request.json();
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN;
  const url = `https://track.delhivery.com/waybill/api/bulk/json/?count=${count}`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${DELHIVERY_TOKEN}` }
  });
  const data = await res.json();
  if (!data.waybills) return NextResponse.json({ error: 'No waybills returned' }, { status: 500 });

  let added = 0;
  for (const wb of data.waybills) {
    try {
      await Waybill.create({ waybill: wb });
      added++;
    } catch (e) {
      // Ignore duplicates
    }
  }
  return NextResponse.json({ success: true, count: added });
}
