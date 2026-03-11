import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json();
  const url = 'https://track.delhivery.com/fm/request/new/';
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DELHIVERY_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return NextResponse.json(data);
}
