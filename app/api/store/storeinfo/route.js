import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

// GET /api/store/storeinfo
// Returns the storeId for the currently logged-in seller.
// Use this to find your storeId to share with the app developer.
export async function GET(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let uid;
    try {
      const decoded = await getAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const storeId = await authSeller(uid);
    if (!storeId) {
      return NextResponse.json({ error: 'No store found for this account' }, { status: 404 });
    }

    return NextResponse.json({ storeId });
  } catch (err) {
    console.error('[store/storeinfo]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
