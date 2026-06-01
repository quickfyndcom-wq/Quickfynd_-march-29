import dbConnect from '@/lib/mongodb';
import StoreMenu from '@/models/StoreMenu';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    let storeMenu = await StoreMenu.findOne({
      categories: { $exists: true, $not: { $size: 0 } },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!storeMenu) {
      storeMenu = await StoreMenu.findOne({}).sort({ updatedAt: -1 }).lean();
    }

    return NextResponse.json(
      { categories: storeMenu?.categories || [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
