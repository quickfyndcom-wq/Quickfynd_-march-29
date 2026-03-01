import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WishlistItem from "@/models/WishlistItem";
import Product from "@/models/Product";
import { getAuth } from "@/lib/firebase-admin";

// GET - Fetch user's wishlist
export async function GET(request) {
    try {
        // Firebase Auth: Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await dbConnect();
        const wishlistItems = await WishlistItem.find({ userId }).sort({ createdAt: -1 }).lean();

        // Populate product data in a single query (avoids N+1 DB calls)
        const validProductIds = [...new Set(
            wishlistItems
                .map(item => item?.productId)
                .filter(pid => typeof pid === 'string' && /^[a-fA-F0-9]{24}$/.test(pid))
        )];

        const products = validProductIds.length
            ? await Product.find({ _id: { $in: validProductIds } })
                .select('_id name slug price mrp images inStock stockQuantity')
                .lean()
            : [];

        const productMap = new Map(products.map(p => [String(p._id), p]));

        for (const item of wishlistItems) {
            item.product = productMap.get(String(item.productId)) || null;
        }

        return NextResponse.json({ wishlist: wishlistItems });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
    }
}

// POST - Add/Remove product from wishlist
export async function POST(request) {
    try {
        // Firebase Auth: Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productId, action } = await request.json();

        if (!productId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();
        if (action === 'add') {
            // Check if already in wishlist
            const existing = await WishlistItem.findOne({ userId, productId }).lean();

            if (existing) {
                return NextResponse.json({ message: 'Already in wishlist', inWishlist: true });
            }

            // Add to wishlist
            await WishlistItem.create({
                userId,
                productId
            });

            return NextResponse.json({ message: 'Added to wishlist', inWishlist: true });
        } else if (action === 'remove') {
            // Remove from wishlist
            await WishlistItem.findOneAndDelete({ userId, productId });

            return NextResponse.json({ message: 'Removed from wishlist', inWishlist: false });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating wishlist:', error);
        return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
    }
}
