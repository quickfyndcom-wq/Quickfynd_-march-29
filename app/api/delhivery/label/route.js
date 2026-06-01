import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const waybill = searchParams.get('waybill');
  const pdf = searchParams.get('pdf') || 'true';
  const pdf_size = searchParams.get('pdf_size') || 'A4';
  if (!waybill) {
    return NextResponse.json({ error: 'Missing waybill' }, { status: 400 });
  }
  const url = `https://track.delhivery.com/api/p/packing_slip?wbns=${waybill}&pdf=${pdf}&pdf_size=${pdf_size}`;
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}
