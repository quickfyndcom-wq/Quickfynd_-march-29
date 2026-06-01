import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '17track webhook endpoint is active'
  });
}

export async function POST(req) {
  try {
    let payload = null;
    try {
      payload = await req.json();
    } catch {
      payload = null;
    }

    // Keep lightweight logging to confirm webhook delivery in server logs.
    console.log('[17track webhook] Received event', {
      at: new Date().toISOString(),
      hasPayload: !!payload,
      eventType: payload?.event || payload?.type || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[17track webhook] Handler error:', error?.message || error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
