import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Rating from "@/models/Rating";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        await connectDB();
        const { productIds } = await req.json();

        if (!productIds || !Array.isArray(productIds)) {
            return NextResponse.json({ error: 'Invalid product IDs' }, { status: 400 });
        }

        if (productIds.length === 0) {
            return NextResponse.json({ products: [] });
        }

        const products = await Product.find({ _id: { $in: productIds } })
            .select('name slug price mrp images category categories inStock fastDelivery imageAspectRatio shortDescription sku hasVariants variants allowReturn allowReplacement mobileSpecsEnabled mobileSpecs')
            .lean();

        const ratingsMap = {};
        if (products.length > 0) {
            const allRatings = await Rating.find({
                productId: { $in: products.map(product => String(product._id)) },
                approved: true
            }).select('productId rating').lean();

            allRatings.forEach(review => {
                if (!ratingsMap[review.productId]) {
                    ratingsMap[review.productId] = [];
                }
                ratingsMap[review.productId].push(review.rating);
            });
        }

        const enrichedProducts = products.map(product => {
            const reviews = ratingsMap[String(product._id)] || [];
            const ratingCount = reviews.length;
            const averageRating = ratingCount > 0
                ? reviews.reduce((sum, rating) => sum + rating, 0) / ratingCount
                : 0;

            return {
                ...product,
                ratingCount,
                averageRating
            };
        });

        // Preserve order of productIds in response
        const productMap = new Map(enrichedProducts.map(product => [product._id.toString(), product]));
        const orderedProducts = productIds
            .map(id => productMap.get(id))
            .filter(Boolean);

        return NextResponse.json({ products: orderedProducts });
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
