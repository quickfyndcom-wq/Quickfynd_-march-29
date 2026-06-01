import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Order from '@/models/Order'

// This endpoint is called by admin to request a delivery pickup for an order
export async function POST(req) {
  try {
    await connectDB()
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }
    // Find the order
    const order = await Order.findById(orderId)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    // Only allow pickup if not already picked up/shipped/delivered
    if (["PICKED_UP", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json({ success: false, error: 'Order already picked up or shipped' }, { status: 400 })
    }
    // Here you would call your delivery partner's API to request pickup
    // For now, we just update the status
    order.status = 'PICKED_UP'
    await order.save()
    // TODO: Optionally send email notification to customer
    return NextResponse.json({ success: true, message: 'Pickup requested', order })
  } catch (error) {
    console.error('Pickup API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to request pickup' }, { status: 500 })
  }
}
