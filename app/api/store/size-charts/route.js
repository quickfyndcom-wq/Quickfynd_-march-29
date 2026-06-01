import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import SizeChartTemplate from '@/models/SizeChartTemplate';

const normalizeTemplate = (template) => ({
  id: template?._id ? String(template._id) : null,
  name: String(template?.name || '').trim(),
  mode: template?.mode === 'table' ? 'table' : 'upload',
  sizeChartEnabled: Boolean(template?.sizeChartEnabled),
  sizeChartUrl: String(template?.sizeChartUrl || '').trim(),
  sizeChartTable: template?.sizeChartTable || null,
  updatedAt: template?.updatedAt || null,
});

const getUserIdFromRequest = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded?.uid || null;
};

export async function GET(request) {
  try {
    await connectDB();

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await SizeChartTemplate.find({ storeId: userId })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      templates: templates.map(normalizeTemplate),
    });
  } catch (error) {
    console.error('[store/size-charts GET] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to fetch saved size charts',
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const mode = String(body?.mode || 'upload').toLowerCase() === 'table' ? 'table' : 'upload';
    const sizeChartUrl = String(body?.sizeChartUrl || '').trim();
    const sizeChartTable = body?.sizeChartTable || null;
    const sizeChartEnabled = body?.sizeChartEnabled !== false;

    if (!name) {
      return NextResponse.json({ error: 'Chart name is required' }, { status: 400 });
    }

    if (!sizeChartUrl && !sizeChartTable) {
      return NextResponse.json({ error: 'Create or upload a size chart first' }, { status: 400 });
    }

    const nameKey = name.toLowerCase();

    const saved = await SizeChartTemplate.findOneAndUpdate(
      { storeId: userId, nameKey },
      {
        $set: {
          name,
          mode,
          sizeChartEnabled,
          sizeChartUrl,
          sizeChartTable,
          createdBy: userId,
        },
        $setOnInsert: {
          storeId: userId,
          nameKey,
        },
      },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      template: normalizeTemplate(saved),
    });
  } catch (error) {
    console.error('[store/size-charts POST] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to save size chart template',
    }, { status: 500 });
  }
}
