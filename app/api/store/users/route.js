import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import StoreUser from '@/models/StoreUser';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

const normalizeMenuPermissions = (menuPermissions) => {
  if (!menuPermissions) return {};
  if (menuPermissions instanceof Map) {
    return Object.fromEntries(menuPermissions.entries());
  }
  if (typeof menuPermissions === 'object') {
    return { ...menuPermissions };
  }
  return {};
};

const effectiveMenuPermissions = (userDoc) => {
  if (userDoc?.permissionsConfigured === true && Array.isArray(userDoc.allowedPaths)) {
    const mapped = {};
    for (const path of userDoc.allowedPaths) {
      if (typeof path === 'string' && path.startsWith('/store')) {
        mapped[path] = true;
      }
    }
    return mapped;
  }
  return normalizeMenuPermissions(userDoc?.menuPermissions);
};

const canManageTeam = async (storeId, userId) => {
  const store = await Store.findById(storeId).lean();
  if (!store) return false;
  if (store.userId === userId) return true;

  const membership = await StoreUser.findOne({
    storeId: String(storeId),
    userId,
    status: { $in: ['approved', 'pending'] },
  }).lean();

  return membership?.role === 'admin';
};

export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Resolve storeId for owners or team members
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const authorized = await canManageTeam(storeId, userId);
    if (!authorized) {
      return NextResponse.json({ error: 'Only admins can manage team access' }, { status: 403 });
    }

    // Fetch approved users
    const users = await StoreUser.find({
      storeId: storeId,
      status: 'approved'
    }).lean();

    // Fetch pending invites
    const pending = await StoreUser.find({
      storeId: storeId,
      status: { $in: ['invited', 'pending'] }
    }).lean();

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
        _id: u._id.toString(),
        menuPermissions: effectiveMenuPermissions(u),
      })),
      pending: pending.map(p => ({
        ...p,
        id: p._id.toString(),
        _id: p._id.toString(),
        menuPermissions: effectiveMenuPermissions(p),
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
