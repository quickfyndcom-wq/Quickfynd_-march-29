import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

// GET /api/store/most-selling-products
export async function GET(req) {
  await connectDB();

  // Fetch all orders with product info
  const orders = await Order.find({})
    .populate('orderItems.productId')
    .lean();

  // Map productId to product info and order/delivery stats
  const productStats = {};
  for (const order of orders) {
    for (const item of order.orderItems) {
      const product = item.productId;
      if (!product) continue;
      if (!productStats[product._id]) {
        productStats[product._id] = {
          _id: product._id,
          name: product.name,
          images: product.images,
          price: product.price,
          sku: product.sku,
          totalOrders: 0,
          deliveredCount: 0,
          inProgressCount: 0,
        };
      }
      productStats[product._id].totalOrders += 1;
      if (order.status === 'DELIVERED') {
        productStats[product._id].deliveredCount += 1;
      } else {
        productStats[product._id].inProgressCount += 1;
      }
    }
  }

  // Convert to array and sort by totalOrders desc
  const result = Object.values(productStats).sort((a, b) => b.totalOrders - a.totalOrders);

  return NextResponse.json({ products: result });
}
