import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { NextResponse } from 'next/server'

// Seed demo stores with return address and logo if missing
async function ensureDemoStoresHaveMetadata() {
  try {
    const stores = await Store.find().limit(5).lean()
    for (const store of stores) {
      const updates = {}
      
      // Add return address if missing
      if (!store.returnAddress) {
        updates.returnAddress = `${store.name || 'Quickfynd Store'}\n${store.address || 'Store Address, City'}\nPin: 680001\nPhone: ${store.contact || '+91-XXXXXXXXXX'}`
      }
      
      // Add logo if missing
      if (!store.logo) {
        updates.logo = '/logo/logo1.png'
      }
      
      // Add GST if missing
      if (!store.gst) {
        updates.gst = '32JWVPS4831L1Z1'
      }
      
      if (Object.keys(updates).length > 0) {
        await Store.updateOne({ _id: store._id }, { $set: updates })
      }
    }
  } catch (err) {
    console.error('Demo store seeding error:', err)
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB()
    
    // Seed demo data on first request
    await ensureDemoStoresHaveMetadata()
    
    const { storeId } = params
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

    const store = await Store.findOne({ _id: storeId }).lean()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    return NextResponse.json({ success: true, store: {
      _id: store._id.toString(),
      name: store.name,
      email: store.email || '',
      contact: store.contact || '',
      address: store.address || '',
      returnAddress: store.returnAddress || `${store.name || 'Store'}\n${store.address || 'Address'}\nPin: 680001`,
      logo: store.logo || '/logo/logo1.png',
      gst: store.gst || '32JWVPS4831L1Z1',
      customerId: store.customerId || '',
      contractIds: store.contractIds || []
    }})
  } catch (err) {
    console.error('GET /api/store/[storeId] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
