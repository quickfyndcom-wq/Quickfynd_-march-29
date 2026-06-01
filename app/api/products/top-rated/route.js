import dbConnect from "@/lib/mongodb";
import Rating from "@/models/Rating";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const resolveImageUrl = (image) => {
  if (typeof image === 'string' && image.trim()) return image;
  if (image && typeof image === 'object') {
    const resolved = image.url || image.src;
    if (typeof resolved === 'string' && resolved.trim()) return resolved;
  }
  return 'https://ik.imagekit.io/jrstupuke/placeholder.png';
};

// GET: Aggregate approved ratings and return top-rated products in one call
export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const threshold = Number(searchParams.get("threshold") || 4);
    const minReviews = Number(searchParams.get("minReviews") || 1);
    const limit = Number(searchParams.get("limit") || 50);
    const storeId = searchParams.get("storeId");

    // Aggregate approved reviews by product
    const pipeline = [
      { $match: { approved: true } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
      { $match: { averageRating: { $gte: threshold }, ratingCount: { $gte: minReviews } } },
      // Convert string productId to ObjectId for lookup
      {
        $addFields: {
          productObjectId: {
            $cond: [
              { $regexMatch: { input: "$_id", regex: /^[a-fA-F0-9]{24}$/ } },
              { $toObjectId: "$_id" },
              null,
            ],
          },
        },
      },
      { $match: { productObjectId: { $ne: null } } },
      // Lookup product document
      {
        $lookup: {
          from: mongoose.model("Product").collection.name,
          localField: "productObjectId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      // Optional store filter
      ...(storeId ? [{ $match: { "product.storeId": storeId } }] : []),
      // Merge product fields with rating stats
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$product",
              { averageRating: "$averageRating", ratingCount: "$ratingCount" },
            ],
          },
        },
      },
      // Only in-stock products
      { $match: { inStock: { $ne: false } } },
      // Sort by rating desc, then count desc
      { $sort: { averageRating: -1, ratingCount: -1, createdAt: -1 } },
      { $limit: limit },
      // Project minimal fields to reduce payload
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          shortDescription: 1,
          mrp: 1,
          price: 1,
          images: 1,
          category: 1,
          sku: 1,
          hasVariants: 1,
          variants: 1,
          attributes: 1,
          fastDelivery: 1,
          stockQuantity: 1,
          createdAt: 1,
          averageRating: 1,
          ratingCount: 1,
        },
      },
    ];

    const rawProducts = await Rating.aggregate(pipeline).exec();
    const products = rawProducts.map((product) => {
      const normalizedImages = Array.isArray(product.images)
        ? product.images.map(resolveImageUrl).filter(Boolean)
        : [];

      return {
        ...product,
        images: normalizedImages,
        image: normalizedImages[0] || resolveImageUrl(null),
      };
    });

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Top-rated products API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch top-rated products" },
      { status: 500 }
    );
  }
}
