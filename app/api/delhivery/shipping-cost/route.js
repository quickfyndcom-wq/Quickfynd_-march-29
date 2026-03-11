import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const md = searchParams.get('md');
  const cgm = searchParams.get('cgm');
  const o_pin = searchParams.get('o_pin');
  const d_pin = searchParams.get('d_pin');
  const ss = searchParams.get('ss');
  const pt = searchParams.get('pt');
  if (!md || !cgm || !o_pin || !d_pin || !ss || !pt) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }
  const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${md}&cgm=${cgm}&o_pin=${o_pin}&d_pin=${d_pin}&ss=${ss}&pt=${pt}`;
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}
