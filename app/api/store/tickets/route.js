import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { getAuth } from '@/lib/firebase-admin';

// GET - Fetch all tickets (admin view)
export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // TODO: Add seller/admin check here if needed
    // For now, assuming authenticated user is admin

    const tickets = await Ticket.find({})
      .populate('orderId', 'orderNumber shortOrderNumber _id')
      .sort({ createdAt: -1, priority: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      tickets 
    });
  } catch (error) {
    console.error('Admin tickets GET error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
