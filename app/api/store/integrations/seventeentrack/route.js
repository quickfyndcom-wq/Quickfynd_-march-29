import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import { getAuth } from '@/lib/firebase-admin';

const maskValue = (value = '') => {
  const v = String(value || '').trim();
  return v ? `${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : '';
};

async function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded?.uid || null;
}

export async function GET(request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const store = await Store.findOne({ userId })
      .select(
        '+integrations.seventeentrack.baseUrl +integrations.seventeentrack.apiKey +integrations.seventeentrack.publicKey +integrations.seventeentrack.secretKey'
      )
      .lean();

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const cfg = store?.integrations?.seventeentrack || {};
    const baseUrl = String(cfg.baseUrl || '').trim();
    const apiKey = String(cfg.apiKey || '').trim();
    const publicKey = String(cfg.publicKey || '').trim();
    const secretKey = String(cfg.secretKey || '').trim();
    const configured = !!(apiKey || publicKey || secretKey);

    return NextResponse.json({
      success: true,
      configured,
      baseUrl,
      maskedApiKey: maskValue(apiKey),
      maskedPublicKey: maskValue(publicKey),
      maskedSecretKey: maskValue(secretKey),
    });
  } catch (error) {
    console.error('Get 17track integration error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch 17track settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const hasAnyField = ['baseUrl', 'apiKey', 'publicKey', 'secretKey'].some((k) => Object.prototype.hasOwnProperty.call(body, k));
    if (!hasAnyField) {
      return NextResponse.json({ success: false, error: 'No integration fields provided' }, { status: 400 });
    }

    const $set = {};
    const $unset = {};

    if (Object.prototype.hasOwnProperty.call(body, 'baseUrl')) {
      const baseUrl = String(body.baseUrl || '').trim();
      if (baseUrl) $set['integrations.seventeentrack.baseUrl'] = baseUrl;
      else $unset['integrations.seventeentrack.baseUrl'] = 1;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'apiKey')) {
      const apiKey = String(body.apiKey || '').trim();
      if (apiKey && apiKey.length < 10) {
        return NextResponse.json({ success: false, error: 'Invalid API key format' }, { status: 400 });
      }
      if (apiKey) $set['integrations.seventeentrack.apiKey'] = apiKey;
      else $unset['integrations.seventeentrack.apiKey'] = 1;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'publicKey')) {
      const publicKey = String(body.publicKey || '').trim();
      if (publicKey) $set['integrations.seventeentrack.publicKey'] = publicKey;
      else $unset['integrations.seventeentrack.publicKey'] = 1;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'secretKey')) {
      const secretKey = String(body.secretKey || '').trim();
      if (secretKey) $set['integrations.seventeentrack.secretKey'] = secretKey;
      else $unset['integrations.seventeentrack.secretKey'] = 1;
    }

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const store = await Store.findOneAndUpdate(
      { userId },
      update,
      { new: true }
    ).select('+integrations.seventeentrack.baseUrl +integrations.seventeentrack.apiKey +integrations.seventeentrack.publicKey +integrations.seventeentrack.secretKey');

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const cfg = store?.integrations?.seventeentrack || {};
    const configured = !!(cfg.apiKey || cfg.publicKey || cfg.secretKey);

    return NextResponse.json({ success: true, configured, message: '17track integration saved' });
  } catch (error) {
    console.error('Save 17track integration error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save 17track settings' }, { status: 500 });
  }
}
