import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import Product from '@/models/Product';
import Rating from '@/models/Rating';
import { NextResponse } from 'next/server';

function attachRatingSummary(products = [], ratingsMap = {}) {
  return products.map((product) => {
    const reviews = ratingsMap[String(product._id)] || [];
    const ratingCount = reviews.length;
    const averageRating = ratingCount > 0
      ? reviews.reduce((sum, rating) => sum + rating, 0) / ratingCount
      : 0;

    return {
      ...product,
      ratingCount,
      averageRating,
    };
  });
}

export async function GET(req) {
  try {
    await dbConnect();

    // Fetch all category sliders (sections) to display on homepage
    let sections = await CategorySlider.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();

    const ratingsMap = {};
    const collectRatingsForProducts = async (products = []) => {
      if (!products.length) return;

      const productIds = products.map((product) => String(product._id));
      const allRatings = await Rating.find({
        productId: { $in: productIds },
        approved: true,
      }).select('productId rating').lean();

      allRatings.forEach((review) => {
        if (!ratingsMap[review.productId]) {
          ratingsMap[review.productId] = [];
        }
        ratingsMap[review.productId].push(review.rating);
      });
    };

    // If no sections exist, create fallback with actual products from database
    if (!sections || sections.length === 0) {
      const availableProducts = await Product.find({ inStock: true })
        .select('_id name slug image images price basePrice mrp rating reviews inStock')
        .limit(10)
        .lean();

      await collectRatingsForProducts(availableProducts);
      const enrichedProducts = attachRatingSummary(availableProducts, ratingsMap);

      if (availableProducts && availableProducts.length > 0) {
        sections = [
          {
            _id: 'fallback-featured',
            title: 'Featured Products',
            subtitle: 'Check out our latest collection',
            products: enrichedProducts.slice(0, 5)
          },
          {
            _id: 'fallback-trending',
            title: 'Trending Now',
            subtitle: 'Most popular items',
            products: enrichedProducts.slice(5, 10)
          }
        ];
      }
    } else {
      // Populate products for each section with productIds
      sections = await Promise.all(
        sections.map(async (section) => {
          if (section.productIds && section.productIds.length > 0) {
            const products = await Product.find({
              _id: { $in: section.productIds },
              inStock: true
            })
            .select('_id name slug image images price basePrice mrp rating reviews inStock fastDelivery')
            .lean();

            await collectRatingsForProducts(products);
            
            return {
              ...section,
              products: attachRatingSummary(products, ratingsMap)
            };
          }
          return section;
        })
      );
    }

    return NextResponse.json({ sections: sections || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching featured sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}
