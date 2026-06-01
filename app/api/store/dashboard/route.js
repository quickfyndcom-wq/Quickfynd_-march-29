import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Rating from "@/models/Rating";
import AbandonedCart from "@/models/AbandonedCart";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";

const IST_TIMEZONE = 'Asia/Kolkata';

const getISTDateKey = (value) => {
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '';

   const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   });

   return formatter.format(date);
};

const EXCLUDED_TODAY_STATUSES = new Set([
   'CANCELLED',
   'PAYMENT_FAILED',
   'FAILED_ORDER',
   'DELETED',
]);

const shouldCountOrderInToday = (order = {}) => {
   const status = String(order?.status || '').toUpperCase();
   if (order?.deletedAt || order?.isDeleted) return false;
   return !EXCLUDED_TODAY_STATUSES.has(status);
};

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

         // Calculate today's orders using IST date key (stable and timezone-safe).
         // For converted orders, count by convertedAt; otherwise count by createdAt.
         const todayISTKey = getISTDateKey(new Date());
         const todaysOrders = orders.filter((order) => {
            if (!shouldCountOrderInToday(order)) return false;
            const effectiveDate = order?.convertedFromAbandonedCheckout && order?.convertedAt
               ? order.convertedAt
               : order?.createdAt;
            return getISTDateKey(effectiveDate) === todayISTKey;
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