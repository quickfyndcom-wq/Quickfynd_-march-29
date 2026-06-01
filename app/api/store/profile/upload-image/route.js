import { NextResponse } from 'next/server';
import imagekit from '../../../../../configs/imageKit';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: 'Forbidden - No store access' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: `store_profile_${Date.now()}_${file.name || 'image'}`,
      folder: '/profile-images/',
    });
    return NextResponse.json({ url: uploadResponse.url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
