import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AbandonedCart from '@/models/AbandonedCart';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(idToken);
  const userId = decodedToken.uid;
  const storeId = await authSeller(userId);

  if (!storeId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { storeId };
}

export async function GET(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;
    const { storeId } = authResult;

    await dbConnect();
    const carts = await AbandonedCart.find({ storeId })
      .sort({ lastSeenAt: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({ carts: carts.map(c => ({ ...c, _id: String(c._id) })) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await getStoreIdFromRequest(request);
    if (authResult.error) return authResult.error;
    const { storeId } = authResult;

    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cartId');
    const source = searchParams.get('source');

    await dbConnect();

    if (cartId) {
      const deleted = await AbandonedCart.findOneAndDelete({ _id: cartId, storeId });
      if (!deleted) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedCount: 1 });
    }

    const filter = { storeId };
    if (source && source !== 'all') {
      filter.source = source;
    }

    const result = await AbandonedCart.deleteMany(filter);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete records' }, { status: 500 });
  }
}