import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

// GET /api/public/most-selling-products
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
          costPrice: product.costPrice || 0,
          sku: product.sku,
          stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : 0,
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

  // Add profit calculation for each product
  const result = Object.values(productStats).map(p => ({
    ...p,
    profit: ((p.price || 0) - (p.costPrice || 0)) * (p.deliveredCount || 0)
  })).sort((a, b) => b.totalOrders - a.totalOrders);

  return NextResponse.json({ products: result });
}
