import dbConnect from '@/lib/mongodb';
import HomeCategorySettings from '@/models/HomeCategorySettings';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    const settings = await HomeCategorySettings.findOne({}).sort({ updatedAt: -1 }).lean();

    return NextResponse.json(
      { categories: settings?.categories || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/home-categories/public GET] error:', error);
    return NextResponse.json(
      { categories: [] },
      { status: 200 }
    );
  }
}
