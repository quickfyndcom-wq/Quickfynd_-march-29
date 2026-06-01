import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

const resolveImageUrl = (image) => {
  if (typeof image === 'string' && image.trim()) return image;
  if (image && typeof image === 'object') {
    const resolved = image.url || image.src;
    if (typeof resolved === 'string' && resolved.trim()) return resolved;
  }
  return 'https://ik.imagekit.io/jrstupuke/placeholder.png';
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenizeText = (value = '') => String(value)
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .map((token) => token.trim())
  .filter(Boolean);

const boundedLevenshtein = (a = '', b = '', maxDistance = 1) => {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (!lenA) return lenB;
  if (!lenB) return lenA;
  if (Math.abs(lenA - lenB) > maxDistance) return maxDistance + 1;

  let prev = new Array(lenB + 1);
  let curr = new Array(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, curr] = [curr, prev];
  }

  return prev[lenB];
};

const isFuzzyTokenMatch = (token = '', words = []) => {
  if (!token || !Array.isArray(words) || words.length === 0) return false;
  if (words.includes(token)) return true;
  if (token.length < 4) return false;

  const tolerance = token.length >= 8 ? 2 : 1;
  return words.some((word) => {
    if (!word) return false;
    if (Math.abs(word.length - token.length) > tolerance) return false;
    return boundedLevenshtein(token, word, tolerance) <= tolerance;
  });
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const excludeId = searchParams.get('excludeId') || '';
    const limitParam = Number(searchParams.get('limit') || '12');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 24) : 12;

    if (category) {
      await dbConnect();

      const categoryQuery = {
        category: { $regex: category, $options: 'i' },
        inStock: { $ne: false }
      };

      if (excludeId) {
        categoryQuery._id = { $ne: excludeId };
      }

      const products = await Product.find(categoryQuery)
        .select('_id name slug images price mrp category tags inStock')
        .limit(limit)
        .lean();

      return NextResponse.json({
        keyword: '',
        products: products.map(p => ({
          _id: p._id,
          slug: p.slug,
          name: p.name,
          image: resolveImageUrl(p.images?.[0]),
          price: p.price,
          mrp: p.mrp,
          category: p.category
        })),
        resultCount: products.length,
        message: products.length === 0 ? 'No products found' : `Found ${products.length} product${products.length !== 1 ? 's' : ''}`
      });
    }

    if (!keyword) {
      return NextResponse.json({ 
        error: 'No keyword provided',
        products: [],
        resultCount: 0
      }, { status: 400 });
    }

    await dbConnect();
    
    console.log(`Search for keyword: ${keyword}`);
    
    const keywordTokens = keyword
      .trim()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const tokenConditions = keywordTokens.map((token) => {
      const tokenRegex = new RegExp(escapeRegExp(token), 'i');
      return {
        $or: [
          { name: tokenRegex },
          { category: tokenRegex },
          { tags: tokenRegex },
          { shortDescription: tokenRegex },
        ],
      };
    });

    // Strategy 1: Match across fields with token-aware conditions
    let products = await Product.find({
      ...(tokenConditions.length > 0
        ? { $and: tokenConditions }
        : {
            $or: [
              { name: { $regex: keyword, $options: 'i' } },
              { category: { $regex: keyword, $options: 'i' } },
              { tags: { $regex: keyword, $options: 'i' } },
              { shortDescription: { $regex: keyword, $options: 'i' } },
            ],
          }),
      inStock: { $ne: false }
    })
    .select('_id name slug images price mrp category tags inStock')
    .limit(limit)
    .lean();

    // Strategy 2: Word boundary match
    if (products.length === 0) {
      const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      products = await Product.find({
        $or: [
          { name: wordBoundaryRegex },
          { category: wordBoundaryRegex },
          { tags: wordBoundaryRegex },
        ],
        inStock: { $ne: false }
      })
      .select('_id name slug images price mrp category tags inStock')
      .limit(limit)
      .lean();
    }

    // Strategy 3: Partial match
    if (products.length === 0) {
      const partialRegex = new RegExp(keyword, 'i');
      products = await Product.find({
        $or: [
          { name: partialRegex },
          { category: partialRegex },
          { tags: partialRegex },
          { shortDescription: partialRegex },
        ],
        inStock: { $ne: false }
      })
      .select('_id name slug images price mrp category tags inStock')
      .limit(limit)
      .lean();
    }

    // Strategy 4: Prefix match
    if (products.length === 0 && keyword.length > 2) {
      const prefixRegex = new RegExp(`^${keyword.substring(0, 3)}`, 'i');
      products = await Product.find({
        $or: [
          { name: prefixRegex },
          { category: prefixRegex },
        ],
        inStock: { $ne: false }
      })
      .select('_id name slug images price mrp category tags inStock')
      .limit(limit)
      .lean();
    }

    // Strategy 5: Fallback to popular products
    if (products.length === 0) {
      products = await Product.find({ inStock: { $ne: false } })
        .select('_id name slug images price mrp category tags inStock')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // Strategy 6: Typo-tolerant fallback (small spelling mistakes)
    if (products.length === 0 && keywordTokens.length > 0) {
      const candidateLimit = Math.max(120, limit * 20);
      const candidates = await Product.find({ inStock: { $ne: false } })
        .select('_id name slug images price mrp category tags shortDescription inStock')
        .sort({ createdAt: -1 })
        .limit(candidateLimit)
        .lean();

      products = candidates
        .filter((product) => {
          const haystack = [
            product?.name,
            product?.category,
            Array.isArray(product?.tags) ? product.tags.join(' ') : '',
            product?.shortDescription,
          ].join(' ');
          const words = tokenizeText(haystack);
          return keywordTokens.every((token) => {
            if (words.includes(token)) return true;
            return isFuzzyTokenMatch(token, words);
          });
        })
        .slice(0, limit);
    }

    console.log(`Found ${products.length} products for keyword: ${keyword}`);
    
    return NextResponse.json({
      keyword,
      products: products.map(p => ({
        _id: p._id,
        slug: p.slug,
        name: p.name,
        image: resolveImageUrl(p.images?.[0]),
        price: p.price,
        mrp: p.mrp,
        category: p.category
      })),
      resultCount: products.length,
      message: products.length === 0 ? 'No products found' : `Found ${products.length} product${products.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('Search products error:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
