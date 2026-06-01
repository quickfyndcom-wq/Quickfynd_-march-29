import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Rating from "@/models/Rating";
import AbandonedCart from "@/models/AbandonedCart";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";

// Next.js API route handler for GET
export async function GET(request) {
   try {
      // Firebase Auth: Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const idToken = authHeader.split('Bearer ')[1];
      const { getAuth } = await import('firebase-admin/auth');
      const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
      if (getApps().length === 0) {
         initializeApp({ credential: applicationDefault() });
      }
      let decodedToken;
      try {
         decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (e) {
         return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      const userId = decodedToken.uid;
      const storeId = await authSeller(userId);
      if (!storeId) {
         return NextResponse.json({ error: 'Forbidden: Seller not approved or no store found.' }, { status: 403 });
      }

      await dbConnect();
         // Get all orders for seller
         const orders = await Order.find({ storeId }).lean();

         // Calculate today's orders (all orders created today, regardless of status/payment)
         // Use IST (UTC+5:30) for 12am-12am window
         const now = new Date();
         // Get current IST date
         const istOffset = 5.5 * 60 * 60 * 1000;
         const nowIST = new Date(now.getTime() + istOffset);
         const startOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0));
         const endOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate() + 1, 0, 0, 0));
         const todaysOrders = orders.filter(order => {
            const created = new Date(order.createdAt);
            // Convert createdAt to IST
            const createdIST = new Date(created.getTime() + istOffset);
            return createdIST >= startOfTodayIST && createdIST < endOfTodayIST;
         });

      // Get all products with ratings for seller
      const products = await Product.find({ storeId }).lean();

      const ratings = await Rating.find({
         productId: { $in: products.map(product => product._id.toString()) }
      }).lean();

      // Get unique customers who have ordered from this store
      const uniqueCustomerIds = [...new Set(orders.map(order => order.userId))];
      const totalCustomers = uniqueCustomerIds.length;

      // Get abandoned carts for this store
      const abandonedCarts = await AbandonedCart.countDocuments({ storeId });


      const dashboardData = {
         ratings,
         totalOrders: orders.length,
         totalEarnings: Math.round(orders.reduce((acc, order) => acc + (order.total || 0), 0)),
         totalProducts: products.length,
         totalCustomers,
         abandonedCarts,
         todaysOrdersCount: todaysOrders.length
      };

      return NextResponse.json({ dashboardData });
   } catch (error) {
      console.error(error);
      return NextResponse.json({ error: error.code || error.message }, { status: 400 });
   }
}