import { NextResponse } from 'next/server';
import { loginIndiaPost } from '@/lib/indiaPost';

export async function POST() {
  try {
    const data = await loginIndiaPost();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error?.message || 'India Post login failed' }, { status: 500 });
  }
}
