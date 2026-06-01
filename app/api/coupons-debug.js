import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import Store from "@/models/Store";

// GET - Debug endpoint to see all coupons
export async function GET(request) {
  try {
    await connectDB();

    // Get the first store
    const store = await Store.findOne().lean();
    console.log('Store found:', store?._id);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Get all coupons for this store
    const coupons = await Coupon.find({ storeId: store._id.toString() }).lean();
    console.log('Coupons for store:', coupons.length);
    console.log('Coupons:', coupons);

    // Get active coupons
    const now = new Date();
    const activeCoupons = coupons.filter(c => {
      const isActive = c.isActive !== false;
      const notExpired = !c.expiresAt || new Date(c.expiresAt) > now;
      console.log(`Coupon ${c.code}: isActive=${isActive}, notExpired=${notExpired}`);
      return isActive && notExpired;
    });

    console.log('Active coupons:', activeCoupons.length);

    // Get ALL coupons regardless of storeId to debug
    const allCouponsInDb = await Coupon.find({}).lean();
    console.log('All coupons in database:', allCouponsInDb.length);

    return NextResponse.json({
      success: true,
      storeId: store._id.toString(),
      storeName: store.name,
      totalCoupons: coupons.length,
      activeCoupons: activeCoupons.length,
      allCouponsInDatabase: allCouponsInDb.length,
      coupons: coupons.map(c => ({
        code: c.code,
        storeId: c.storeId,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
        discount: c.discount || c.discountValue,
      })),
      allCoupons: allCouponsInDb.map(c => ({
        code: c.code,
        storeId: c.storeId,
        title: c.title,
        isActive: c.isActive,
      })),
      activeCouponsList: activeCoupons,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
