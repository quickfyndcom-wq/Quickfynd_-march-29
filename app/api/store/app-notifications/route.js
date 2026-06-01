import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import AppPushNotification from '@/models/AppPushNotification';

const DEFAULT_TOPIC = process.env.APP_CUSTOMERS_FCM_TOPIC || 'quickfynd_app_customers';

async function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded?.uid || null;
  } catch {
    return null;
  }
}

function sanitizeUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return '';
}

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    await dbConnect();
    const history = await AppPushNotification.find({ storeId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[app-notifications GET] error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch notification history' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    const topic = String(body?.topic || DEFAULT_TOPIC).trim() || DEFAULT_TOPIC;
    const imageUrl = sanitizeUrl(body?.imageUrl);
    const targetUrl = sanitizeUrl(body?.targetUrl);

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    await dbConnect();

    const payload = {
      topic,
      notification: {
        title,
        body: message,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: {
        type: 'app_broadcast',
        title,
        message,
        ...(targetUrl ? { targetUrl } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        createdAt: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          ...(imageUrl ? { imageUrl } : {}),
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
        ...(targetUrl ? { fcmOptions: { link: targetUrl } } : {}),
      },
      webpush: {
        ...(targetUrl ? { fcmOptions: { link: targetUrl } } : {}),
        notification: {
          title,
          body: message,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      },
    };

    try {
      const providerMessageId = await getMessaging().send(payload);

      const record = await AppPushNotification.create({
        storeId,
        title,
        message,
        imageUrl,
        targetUrl,
        topic,
        audience: 'all_app_customers',
        status: 'sent',
        providerMessageId,
        sentBy: userId,
      });

      return NextResponse.json({
        success: true,
        message: 'App notification sent successfully',
        id: record._id,
        providerMessageId,
      });
    } catch (sendError) {
      await AppPushNotification.create({
        storeId,
        title,
        message,
        imageUrl,
        targetUrl,
        topic,
        audience: 'all_app_customers',
        status: 'failed',
        errorMessage: sendError?.message || 'Failed to send notification',
        sentBy: userId,
      });

      return NextResponse.json(
        {
          error: 'Failed to send push notification. Check Firebase Admin messaging configuration.',
          details: sendError?.message || 'Unknown messaging error',
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('[app-notifications POST] error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
