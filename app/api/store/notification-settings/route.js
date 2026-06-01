import dbConnect from '@/lib/mongodb'
import StoreNotificationSetting from '@/models/StoreNotificationSetting'
import authSeller from '@/middlewares/authSeller'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split(' ')[1]
      const { getAuth } = await import('firebase-admin/auth')
      const { initializeApp, getApps } = await import('firebase-admin/app')
      if (getApps().length === 0) {
        initializeApp()
      }
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch (e) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const storeId = await authSeller(userId)
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

    await dbConnect()
    let settings = await StoreNotificationSetting.findOne({ storeId })
    if (!settings) {
      settings = await StoreNotificationSetting.create({
        storeId,
        enableNewProductNotifications: true,
        notifyOnProductAdded: true
      })
    }

    return NextResponse.json({ settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split(' ')[1]
      const { getAuth } = await import('firebase-admin/auth')
      const { initializeApp, getApps } = await import('firebase-admin/app')
      if (getApps().length === 0) {
        initializeApp()
      }
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch (e) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const storeId = await authSeller(userId)
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

    const body = await request.json()
    
    await dbConnect()
    const settings = await StoreNotificationSetting.findOneAndUpdate(
      { storeId },
      {
        enableNewProductNotifications: body.enableNewProductNotifications,
        notifyOnProductAdded: body.notifyOnProductAdded
      },
      { new: true, upsert: true }
    )

    return NextResponse.json({ settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
