import dbConnect from '@/lib/mongodb';
import StoreMenu from '@/models/StoreMenu';
import Category from '@/models/Category';
import { getAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeCategoryItem(item = {}, index = 0) {
  const idFromName = slugify(item?.name || '');
  const id = String(item?.id || idFromName || `cat-${Date.now()}-${index}`);

  return {
    id,
    name: String(item?.name || '').trim(),
    image: String(item?.image || '').trim(),
    url: String(item?.url || '').trim(),
    children: Array.isArray(item?.children)
      ? item.children.map((child, childIndex) => ({
          id: String(child?.id || slugify(child?.name || '') || `${id}-child-${childIndex}`),
          name: String(child?.name || '').trim(),
          image: String(child?.image || '').trim(),
          url: String(child?.url || '').trim(),
          children: Array.isArray(child?.children) ? child.children : [],
        }))
      : [],
  };
}

function extractCategorySlug(url = '') {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'http://local');
    const raw = parsed.searchParams.get('category') || '';
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    const match = String(url).match(/category=([^&]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : '';
  }
}

function flattenCategories(items = []) {
  const result = [];
  for (const item of items) {
    result.push(item);
    if (Array.isArray(item?.children) && item.children.length) {
      result.push(...flattenCategories(item.children));
    }
  }
  return result;
}

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

export async function GET(request) {
  try {
    const token = parseAuthHeader(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const firebaseAuth = getAuth();
    const decoded = await firebaseAuth.verifyIdToken(token);
    const userId = decoded.uid;

    await dbConnect();
    const storeMenu = await StoreMenu.findOne({ storeId: userId });
    
    return NextResponse.json({ 
      categories: storeMenu?.categories || []
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = parseAuthHeader(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const firebaseAuth = getAuth();
    const decoded = await firebaseAuth.verifyIdToken(token);
    const userId = decoded.uid;

    await dbConnect();
    const { categories } = await request.json();

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      );
    }

    if (categories.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 categories allowed' },
        { status: 400 }
      );
    }

    const normalizedCategories = categories.map((item, index) => normalizeCategoryItem(item, index));

    const allItems = flattenCategories(normalizedCategories);
    const imageSyncOps = allItems
      .filter((item) => item?.image)
      .map((item) => {
        const slugFromUrl = extractCategorySlug(item?.url);
        const slug = slugFromUrl || slugify(item?.name || '');
        if (!slug) return null;
        return {
          updateOne: {
            filter: { slug },
            update: { $set: { image: item.image } },
          },
        };
      })
      .filter(Boolean);

    if (imageSyncOps.length > 0) {
      await Category.bulkWrite(imageSyncOps, { ordered: false });
    }

    const storeMenu = await StoreMenu.findOneAndUpdate(
      { storeId: userId },
      { 
        storeId: userId,
        categories: normalizedCategories
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ storeMenu }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
