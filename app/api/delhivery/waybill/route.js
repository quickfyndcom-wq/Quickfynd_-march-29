import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const count = searchParams.get('count') || 1;
  const url = `https://track.delhivery.com/waybill/api/bulk/json/?count=${count}`;
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}
