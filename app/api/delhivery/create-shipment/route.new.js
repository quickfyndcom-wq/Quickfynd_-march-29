import { NextResponse } from 'next/server';
import Waybill from '@/models/Waybill';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';

export async function POST(req) {
  await connectDB();
  let body = await req.json();
  // Assign unused waybill from pool if not present
  let assignedWaybill = null;
  if (!body.shipments?.[0]?.waybill) {
    const waybillDoc = await Waybill.findOneAndUpdate({ used: false }, { used: true });
    if (!waybillDoc) {
      return NextResponse.json({ error: 'No available waybills. Please try again later.' }, { status: 500 });
    }
    assignedWaybill = waybillDoc.waybill;
    if (!body.shipments) body.shipments = [{}];
    body.shipments[0].waybill = assignedWaybill;
  }
  const url = 'https://track.delhivery.com/api/cmu/create.json';
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DELHIVERY_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();

  // If Delhivery returns success and AWB, update the order
  if (data && data.packages && data.packages[0] && data.packages[0].waybill) {
    const trackingId = data.packages[0].waybill;
    const orderId = body.reference_id || body.orderId || body._id; // Adjust as per your payload
    if (orderId) {
      await Order.findOneAndUpdate(
        { _id: orderId },
        { trackingId, courier: 'Delhivery' }
      );
    }
    return NextResponse.json({ success: true, trackingId, delhivery: data });
  }

  return NextResponse.json(data);
}
