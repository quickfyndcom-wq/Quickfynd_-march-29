import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

// POST: Accepts { orderedIds: ['id1','id2', ...] } and updates sortOrder on each slider
export async function POST(req) {
  try {
    await dbConnect();
    const token = parseAuthHeader(req);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }

    // Bulk update sortOrder
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    await CategorySlider.bulkWrite(bulkOps);

    return NextResponse.json({ message: 'Order saved' }, { status: 200 });
  } catch (error) {
    console.error('Error reordering sliders:', error);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}
