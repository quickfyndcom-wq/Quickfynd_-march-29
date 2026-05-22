'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import padlockImage from "@/assets/padlock.png"


import axios from "axios"
import { useAuth } from "@/lib/useAuth";

const StoreLayout = ({ children }) => {

    const { user, loading, getToken } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const [isSeller, setIsSeller] = useState(false);
    const [sellerLoading, setSellerLoading] = useState(true);
    const [storeInfo, setStoreInfo] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sellerReason, setSellerReason] = useState('');

    const fullPermissions = {
        overview: true,
        catalog: true,
        orders: true,
        customers: true,
        marketing: true,
        storefront: true,
    };

    const getAccessSnapshot = (info) => {
        const menuPermissions = info?.menuPermissions && typeof info.menuPermissions === 'object'
            ? info.menuPermissions
            : {};
        const hasExplicitMenuPermissions = info?.permissionsConfigured === true || Object.keys(menuPermissions).length > 0;
        const rawPermissions = info?.accessPermissions || fullPermissions;
        const permissions = {
            overview: rawPermissions.overview !== false,
            catalog: rawPermissions.catalog !== false,
            orders: rawPermissions.orders !== false,
            customers: rawPermissions.customers !== false,
            marketing: rawPermissions.marketing !== false,
            storefront: rawPermissions.storefront !== false,
        };

        const hasAnyAccess = hasExplicitMenuPermissions
            ? Object.values(menuPermissions).some((allowed) => allowed === true)
            : Object.values(permissions).some(Boolean);

        return { permissions, menuPermissions, hasExplicitMenuPermissions, hasAnyAccess };
    };

    const isPathAllowedByMenu = (menuPermissions, path) => {
        const allowedEntries = Object.entries(menuPermissions).filter(([, allowed]) => allowed === true);
        if (!allowedEntries.length) return false;
        for (const [key] of allowedEntries) {
            if (key.includes('#')) {
                const basePath = key.split('#')[0];
                if (path === basePath) return true;
                continue;
            }
            if (key === '/store' && path === '/store') return true;
            if (path === key || path?.startsWith(`${key}/`)) return true;
        }
        return false;
    };

    const fetchIsSeller = async () => {
        if (!user) return;
        try {
            const token = await getToken(true); // Force refresh token
            if (!token) {
                setIsSeller(false);
                setStoreInfo(null);
                setSellerReason('missing-token');
                setSellerLoading(false);
                return;
            }
            const { data } = await axios.get('/api/store/is-seller', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSeller(!!data.isSeller);
            setStoreInfo(data.storeInfo || null);
            setSellerReason(data.isSeller ? '' : (data.reason || 'not-seller-or-not-approved'));
        } catch (error) {
            try {
                const retryToken = await getToken(true);
                if (!retryToken) {
                    setIsSeller(false);
                    setStoreInfo(null);
                    setSellerReason('missing-token');
                } else {
                    const { data } = await axios.get('/api/store/is-seller', {
                        headers: { Authorization: `Bearer ${retryToken}` }
                    });
                    setIsSeller(!!data.isSeller);
                    setStoreInfo(data.storeInfo || null);
                    setSellerReason(data.isSeller ? '' : (data.reason || 'not-seller-or-not-approved'));
                }
            } catch {
                setIsSeller(false);
                setStoreInfo(null);
                setSellerReason('seller-check-failed');
            }
        } finally {
            setSellerLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && user) {
            fetchIsSeller();
        }
    }, [loading, user, pathname]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isSeller || !storeInfo) return;

        const { permissions, menuPermissions, hasExplicitMenuPermissions, hasAnyAccess } = getAccessSnapshot(storeInfo);

        const permissionByPathPrefix = [
            { key: 'overview', prefixes: ['/store#contact-messages', '/store'] },
            { key: 'catalog', prefixes: ['/store/categories', '/store/add-product', '/store/manage-product'] },
            { key: 'orders', prefixes: ['/store/orders', '/store/abandoned-checkout', '/store/customer-tracking', '/store/shipping', '/store/return-requests', '/store/balance', '/store/sales-report', '/store/most-selling-products'] },
            { key: 'customers', prefixes: ['/store/customers', '/store/settings/users', '/store/reviews', '/store/tickets', '/store/product-notifications'] },
            { key: 'marketing', prefixes: ['/store/personalized-offers', '/store/coupons', '/store/promotional-emails', '/store/ads-tracking', '/store/marketing-expenses'] },
            { key: 'storefront', prefixes: ['/store/storefront', '/store/home-preferences', '/store/category-slider', '/store/navbar-menu', '/store/media', '/store/mobile-features'] },
        ];

        const isBlockedByMenuPermission = (() => {
            if (!hasExplicitMenuPermissions) return false;

            return !isPathAllowedByMenu(menuPermissions, pathname);
        })();

        const activeRule = permissionByPathPrefix.find((rule) => {
            return rule.prefixes.some((prefix) => {
                if (prefix === '/store') return pathname === '/store';
                return pathname?.startsWith(prefix);
            });
        });

        if (!hasAnyAccess) {
            if (pathname !== '/store') {
                router.replace('/store');
            }
            return;
        }

        if (isBlockedByMenuPermission || (activeRule && !permissions[activeRule.key])) {
            const fallback = hasExplicitMenuPermissions
                ? (isPathAllowedByMenu(menuPermissions, '/store/manage-product')
                    ? '/store/manage-product'
                    : isPathAllowedByMenu(menuPermissions, '/store/orders')
                        ? '/store/orders'
                        : isPathAllowedByMenu(menuPermissions, '/store/customers')
                            ? '/store/customers'
                            : isPathAllowedByMenu(menuPermissions, '/store/coupons')
                                ? '/store/coupons'
                                : isPathAllowedByMenu(menuPermissions, '/store/home-preferences')
                                    ? '/store/home-preferences'
                                    : isPathAllowedByMenu(menuPermissions, '/store/settings')
                                        ? '/store/settings'
                                        : '/store')
                : (permissions.catalog
                ? '/store/manage-product'
                : permissions.orders
                    ? '/store/orders'
                    : permissions.customers
                        ? '/store/customers'
                        : permissions.marketing
                            ? '/store/coupons'
                            : permissions.storefront
                                ? '/store/home-preferences'
                                : '/store');
            if (fallback !== pathname) {
                router.replace(fallback);
            }
        }
    }, [isSeller, pathname, router, storeInfo]);

    const lockedNoAccess = isSeller && storeInfo ? !getAccessSnapshot(storeInfo).hasAnyAccess : false;
    const lockedCurrentRoute = isSeller && storeInfo
        ? (() => {
            const { permissions, menuPermissions, hasExplicitMenuPermissions } = getAccessSnapshot(storeInfo);
            if (hasExplicitMenuPermissions) {
                return !isPathAllowedByMenu(menuPermissions, pathname);
            }
            const permissionByPathPrefix = [
                { key: 'overview', prefixes: ['/store#contact-messages', '/store'] },
                { key: 'catalog', prefixes: ['/store/categories', '/store/add-product', '/store/manage-product'] },
                { key: 'orders', prefixes: ['/store/orders', '/store/abandoned-checkout', '/store/customer-tracking', '/store/shipping', '/store/return-requests', '/store/balance', '/store/sales-report', '/store/most-selling-products'] },
                { key: 'customers', prefixes: ['/store/customers', '/store/settings/users', '/store/reviews', '/store/tickets', '/store/product-notifications'] },
                { key: 'marketing', prefixes: ['/store/personalized-offers', '/store/coupons', '/store/promotional-emails', '/store/ads-tracking', '/store/marketing-expenses'] },
                { key: 'storefront', prefixes: ['/store/storefront', '/store/home-preferences', '/store/category-slider', '/store/navbar-menu', '/store/media', '/store/mobile-features'] },
            ];
            const activeRule = permissionByPathPrefix.find((rule) => {
                return rule.prefixes.some((prefix) => {
                    if (prefix === '/store') return pathname === '/store';
                    return pathname?.startsWith(prefix);
                });
            });
            return Boolean(activeRule && !permissions[activeRule.key]);
        })()
        : false;

    return (loading || sellerLoading) ? (
        <Loading />
    ) : !user ? (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">Authentication Required</h1>
            <p className="text-slate-500 mt-4 mb-8">Please sign in to access the store dashboard</p>
            <Link href="/store/login" className="bg-blue-600 text-white flex items-center gap-2 p-3 px-8 rounded-full hover:bg-blue-700 transition">
                Sign In
            </Link>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-4 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    ) : isSeller ? (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50/40">
            <SellerNavbar
                storeInfo={storeInfo}
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />
            <div className="flex flex-1 min-h-0 items-stretch overflow-hidden">
                <SellerSidebar
                    storeInfo={storeInfo}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 lg:pl-12 lg:pt-12">
                    <div className="relative min-h-full">
                        <div className={lockedNoAccess ? "pointer-events-none select-none blur-[1px]" : ""}>
                            {children}
                        </div>

                        {(lockedNoAccess || lockedCurrentRoute) && (
                            <div className="absolute inset-0 z-20 rounded-2xl bg-white/65 backdrop-blur-md flex items-center justify-center p-4">
                                <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-8 text-slate-800 shadow-xl">
                                    <div className="mb-4 flex justify-center">
                                        <Image src={padlockImage} alt="Locked" width={56} height={56} className="h-14 w-14 object-contain" />
                                    </div>
                                    <div className="mb-5">
                                        <h2 className="text-2xl font-bold">Dashboard Locked</h2>
                                        <p className="text-slate-600 text-sm mt-1">You currently do not have access to any store dashboard sections.</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm leading-6 text-slate-700">
                                        Ask your store admin to grant at least one permission from <span className="font-semibold">Dashboard Access</span>.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">You are not authorized to access this page</h1>
            <p className="text-slate-500 mt-4 mb-6">Your account does not have seller access</p>
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>Signed in as: {user?.email || user?.uid || 'Unknown user'}</p>
                {sellerReason && <p className="mt-1">Access check: {sellerReason}</p>}
            </div>
            <Link href="/create-store" className="bg-blue-600 text-white flex items-center gap-2 p-2 px-6 max-sm:text-sm rounded-full hover:bg-blue-700 transition">
                Request Store Access
            </Link>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-4 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout