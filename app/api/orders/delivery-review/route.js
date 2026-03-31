import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST(request) {
  try {
    const { orderId, rating, feedback, agentBehavior, packageCondition, damagePhotoUrl } = await request.json();

    const allowedAgentBehavior = ['VERY_POLITE', 'POLITE', 'AVERAGE', 'RUDE'];
    const allowedPackageConditions = ['INTACT', 'MINOR_DAMAGE', 'DAMAGED'];

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: orderId, rating (1-5)' },
        { status: 400 }
      );
    }

    if (agentBehavior && !allowedAgentBehavior.includes(agentBehavior)) {
      return NextResponse.json(
        { error: 'Invalid agentBehavior value' },
        { status: 400 }
      );
    }

    if (packageCondition && !allowedPackageConditions.includes(packageCondition)) {
      return NextResponse.json(
        { error: 'Invalid packageCondition value' },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order with delivery review
    order.deliveryReview = {
      rating: Number(rating),
      feedback: feedback?.trim() || '',
      agentBehavior: agentBehavior || null,
      packageCondition: packageCondition || null,
      damagePhotoUrl: damagePhotoUrl?.trim() || '',
      submittedAt: new Date(),
      reviewed: true
    };

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Delivery review submitted successfully',
      review: order.deliveryReview
    });
  } catch (error) {
    console.error('Error submitting delivery review:', error);
    return NextResponse.json(
      { error: 'Failed to submit delivery review' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findById(orderId).select('deliveryReview');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      review: order.deliveryReview || null
    });
  } catch (error) {
    console.error('Error fetching delivery review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery review' },
      { status: 500 }
    );
  }
}
