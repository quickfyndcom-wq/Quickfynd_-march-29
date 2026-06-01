import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Extract userId from Firebase token in Authorization header
    const authHeader = request.headers.get("authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split(" ")[1];
      const { getAuth } = await import("firebase-admin/auth");
      const { initializeApp, applicationDefault, getApps } = await import("firebase-admin/app");
      if (getApps().length === 0) {
        initializeApp({ credential: applicationDefault() });
      }
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (e) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: "Not authorized as seller" }, { status: 401 });

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findById(productId)
      .select('_id storeId fastDelivery')
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify the product belongs to the seller's store
    if (String(product.storeId) !== String(storeId)) {
      return NextResponse.json({ error: "Unauthorized to modify this product" }, { status: 403 });
    }

    const nextFastDelivery = !Boolean(product.fastDelivery);

    await Product.findByIdAndUpdate(productId, {
      fastDelivery: nextFastDelivery,
    });

    return NextResponse.json({ 
      message: nextFastDelivery ? "Fast delivery enabled" : "Fast delivery disabled",
      fastDelivery: nextFastDelivery 
    });
  } catch (error) {
    console.error("Error toggling fast delivery:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
