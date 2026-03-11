import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

// GET /api/store/ordered-products
export async function GET(req) {
  await connectDB();

  // Optionally, get storeId from query or auth
  // const { searchParams } = new URL(req.url);
  // const storeId = searchParams.get('storeId');

  // Find all orders (optionally filter by store)
  const orders = await Order.find({ /* storeId: storeId */ })
    .populate('orderItems.productId')
    .lean();

  // Map productId to product info and its orders
  const productOrderMap = {};
  for (const order of orders) {
    for (const item of order.orderItems) {
      const product = item.productId;
      if (!product) continue;
      if (!productOrderMap[product._id]) {
        productOrderMap[product._id] = {
          product: {
            _id: product._id,
            name: product.name,
            images: product.images,
            price: product.price,
            sku: product.sku,
          },
          orders: [],
        };
      }
      productOrderMap[product._id].orders.push({
        orderId: order._id,
        status: order.status,
        createdAt: order.createdAt,
        total: order.total,
        quantity: item.quantity,
        // Add more fields as needed
      });
    }
  }

  const result = Object.values(productOrderMap);

  return NextResponse.json({ products: result });
}
