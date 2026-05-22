import dbConnect from "@/lib/mongodb";
import Store from "@/models/Store";
import StoreUser from "@/models/StoreUser";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/firebase-admin";

const FULL_PERMISSIONS = {
    overview: true,
    catalog: true,
    orders: true,
    customers: true,
    marketing: true,
    storefront: true,
};

const LOCKED_PERMISSIONS = {
    overview: false,
    catalog: false,
    orders: false,
    customers: false,
    marketing: false,
    storefront: false,
};

const LEGACY_PERMISSION_KEYS = ['overview', 'catalog', 'orders', 'customers', 'marketing', 'storefront'];

function toPlainMenuPermissions(value) {
    if (!value || typeof value !== 'object') return {};
    if (value instanceof Map) return Object.fromEntries(value.entries());
    return { ...value };
}

    function fromAllowedPaths(paths) {
        const mapped = {};
        if (!Array.isArray(paths)) return mapped;
        for (const path of paths) {
            if (typeof path === 'string' && path.startsWith('/store')) {
                mapped[path] = true;
            }
        }
        return mapped;
    }

function hasLegacyPermissionConfig(value) {
    if (!value || typeof value !== 'object') return false;
    return LEGACY_PERMISSION_KEYS.some((key) => typeof value[key] === 'boolean');
}

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[is-seller API] Missing or invalid authorization header:', authHeader);
            return NextResponse.json({ isSeller: false, reason: 'missing-auth-header' }, { status: 200 });
        }
        const idToken = authHeader.split(' ')[1];
        let decodedToken;
        try {
            // Set GCLOUD_PROJECT env var before verifying token to fix Project ID detection
            if (!process.env.GCLOUD_PROJECT && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                process.env.GCLOUD_PROJECT = serviceAccount.project_id;
                process.env.GOOGLE_CLOUD_PROJECT = serviceAccount.project_id;
            }
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (err) {
            console.log('[is-seller API] Token verification error:', err.message);
            console.log('[is-seller API] Token (first 20 chars):', idToken?.substring(0, 20));
            return NextResponse.json({ isSeller: false, reason: 'invalid-token', error: err.message }, { status: 200 });
        }
        const userId = decodedToken.uid;
        console.log('[is-seller API] Checking seller status for userId:', userId);
        const sellerResult = await authSeller(userId);
        console.log('[is-seller API] authSeller result:', sellerResult);
        if(!sellerResult){
            // Not a seller or not approved
            console.log('[is-seller API] User is NOT a seller (authSeller returned false)');
            return NextResponse.json({ isSeller: false, userId, reason: 'not-seller-or-not-approved' }, { status: 200 });
        }
        console.log('[is-seller API] User IS a seller, fetching store info...');
        await dbConnect();
        const storeInfo = await Store.findById(sellerResult).lean();
        console.log('[is-seller API] Store info:', storeInfo ? 'Found' : 'Not found');
        const isOwner = storeInfo?.userId === userId;
        let accessPermissions = isOwner ? { ...FULL_PERMISSIONS } : { ...LOCKED_PERMISSIONS };
        let menuPermissions = {};
        let permissionsConfigured = false;
        let allowedPaths = [];

        if (!isOwner) {
            const membership = await StoreUser.findOne({
                storeId: String(sellerResult),
                userId,
                status: { $in: ['approved', 'pending'] },
            }).lean();

            permissionsConfigured = membership?.permissionsConfigured === true;
            allowedPaths = Array.isArray(membership?.allowedPaths) ? membership.allowedPaths : [];

            const normalizedMenuPermissions = toPlainMenuPermissions(membership?.menuPermissions);
            const configuredMenuPermissions = membership?.permissionsConfigured === true
                ? fromAllowedPaths(membership?.allowedPaths)
                : normalizedMenuPermissions;
            const hasExplicitMenuPermissions = membership?.permissionsConfigured === true
                || Object.keys(normalizedMenuPermissions).length > 0;
            const hasLegacyPermissions = hasLegacyPermissionConfig(membership?.permissions);

            if (membership?.permissions && typeof membership.permissions === 'object') {
                accessPermissions = {
                    overview: membership.permissions.overview === true,
                    catalog: membership.permissions.catalog === true,
                    orders: membership.permissions.orders === true,
                    customers: membership.permissions.customers === true,
                    marketing: membership.permissions.marketing === true,
                    storefront: membership.permissions.storefront === true,
                };
            }

            if (!hasExplicitMenuPermissions && !hasLegacyPermissions && membership?.role === 'admin' && membership?.permissionsConfigured !== true) {
                accessPermissions = { ...FULL_PERMISSIONS };
            }

            menuPermissions = configuredMenuPermissions;
        }

        return NextResponse.json({
            isSeller: true,
            storeInfo: {
                ...storeInfo,
                isOwner,
                accessPermissions,
                menuPermissions,
                permissionsConfigured,
                allowedPaths,
            },
            userId,
        });
    } catch (error) {
        console.error('[is-seller API] Error:', error);
        return NextResponse.json({ isSeller: false, reason: 'server-error', message: error.code || error.message }, { status: 200 });
    }
}