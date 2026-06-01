'use client'
import Loading from "@/components/Loading"


import axios from "axios"
import { CircleDollarSignIcon, ShoppingBasketIcon, StarIcon, TagsIcon, UsersIcon, ShoppingCartIcon, UserPlusIcon } from "lucide-react"
import ContactMessagesSeller from "./ContactMessagesSeller.jsx";
import dynamic from "next/dynamic";
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useAuth } from '@/lib/useAuth'
import CustomerLocationAnalytics from "@/components/CustomerLocationAnalytics"
import ProductSelect from "@/components/ProductSelect"


// Dynamically import CarouselProducts to avoid SSR issues
const CarouselProducts = dynamic(() => import("@/components/admin/CarouselProducts"), { ssr: false });

// Rename export to avoid conflict with import
export const dynamicSetting = 'force-dynamic'

const formatDateTimeLocalValue = (date) => {
    const source = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(source.getTime())) return ''

    const localDate = new Date(source.getTime() - source.getTimezoneOffset() * 60000)
    return localDate.toISOString().slice(0, 16)
}

const formatRangeDateTime = (value) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const getNetSoldQuantity = (order, item) => {
    const orderedQty = Number(item?.quantity) || 0
    if (orderedQty <= 0) return 0

    // Fully cancelled orders should not count as sold units.
    if (String(order?.status || '').toUpperCase() === 'CANCELLED') {
        return 0
    }

    // Support partial-cancel fields if present.
    const cancelledQty = Number(item?.cancelledQuantity ?? item?.canceledQuantity ?? 0)
    return Math.max(0, orderedQty - Math.max(0, cancelledQty))
}

const COUNTABLE_SALES_STATUSES = new Set([
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'IN_TRANSIT',
    'DELIVERED',
])

const shouldIncludeOrderInProductSales = (order) => {
    const status = String(order?.status || '').toUpperCase()

    // Deleted/voided-like records should never contribute to sold counts.
    if (order?.deletedAt || order?.isDeleted || status === 'DELETED') return false

    // Only count units once orders are at least shipped.
    return COUNTABLE_SALES_STATUSES.has(status)
}

const getProductImageSrc = (item) => {
    const isInvalidStringImage = (value) => {
        const normalized = String(value || '').trim().toLowerCase()
        return !normalized || normalized === '[object object]' || normalized === 'null' || normalized === 'undefined'
    }

    const candidates = [
        item?.image,
        item?.productImage,
        item?.productId?.image,
        item?.product?.image,
        item?.productId?.images?.[0],
        item?.product?.images?.[0],
    ]

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && !isInvalidStringImage(candidate)) return candidate.trim()
        if (candidate && typeof candidate === 'object') {
            const resolved = candidate.url || candidate.src || candidate.secure_url || candidate.image || ''
            if (!isInvalidStringImage(resolved)) return String(resolved).trim()
        }
    }

    return '/placeholder.png'
}

export default function Dashboard() {
    const { user, loading: authLoading, getToken } = useAuth();
    console.log('[page.jsx] user:', user, 'authLoading:', authLoading);
    // --- Create Order Modal State ---
    const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
    const [newOrder, setNewOrder] = useState({
        customer: { name: '', email: '', phone: '', street: '', city: '', state: '', country: '', zip: '' },
        items: [{ productId: '', name: '', price: '', quantity: 1 }],
        paymentMethod: 'COD',
        notes: '',
        isPaid: false,
        status: 'ORDER_PLACED',
        orderDate: (() => {
            const now = new Date();
            return now.toISOString().slice(0, 16);
        })(),
    });
    const [creatingOrder, setCreatingOrder] = useState(false);
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        totalCustomers: 0,
        abandonedCarts: 0,
        ratings: [],
    })
    // Orders for detailed stats
    const [orders, setOrders] = useState([]);
    const [productsList, setProductsList] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [rangeFrom, setRangeFrom] = useState(() => {
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        return formatDateTimeLocalValue(startOfDay)
    })
    const [rangeTo, setRangeTo] = useState(() => {
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        return formatDateTimeLocalValue(endOfDay)
    })
    
    // Invitation states
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [teamUsers, setTeamUsers] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(true)
    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: currency + dashboardData.totalEarnings, icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Customers', value: dashboardData.totalCustomers, icon: UsersIcon },
        { title: 'Abandoned Carts', value: dashboardData.abandonedCarts, icon: ShoppingCartIcon },
        { title: 'Total Ratings', value: dashboardData.ratings?.length || 0, icon: StarIcon },
    ]

    // Fetch team users
    const fetchTeamUsers = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/store/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allUsers = [...(data.users || []), ...(data.pending || [])];
            setTeamUsers(allUsers);
        } catch (error) {
            console.error('Failed to fetch team users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchProductsForOrder = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/store/product', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProductsList(data?.products || []);
        } catch (error) {
            console.error('Failed to fetch products for order:', error);
            setProductsList([]);
        }
    }

    useEffect(() => {
        const fetchDashboard = async () => {
            if (!user) {
                setLoading(false);
                setLoadingUsers(false);
                setOrdersLoading(false);
                return;
            }

            try {
                const token = await getToken();
                const { data } = await axios.get('/api/store/dashboard', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDashboardData(data.dashboardData);

                // Fetch all orders for detailed stats
                const ordersRes = await axios.get('/api/store/orders', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrders(ordersRes.data.orders || []);

                await fetchProductsForOrder();

                // Fetch team users
                await fetchTeamUsers();
            } catch (error) {
                console.error('Dashboard fetch error:', error);
                toast.error(error?.response?.data?.error || 'Failed to load dashboard');
            } finally {
                setLoading(false);
                setOrdersLoading(false);
            }
        };

        if (!authLoading) {
            fetchDashboard();
        }
    }, [authLoading, user]);

    const handleInviteUser = async (e) => {
        e.preventDefault();
        
        if (teamUsers.length >= 5) {
            toast.error('Maximum 5 team members allowed');
            return;
        }
        
        setInviteLoading(true);
        try {
            const token = await getToken();
            const { data } = await axios.post('/api/store/users/invite', 
                { email: inviteEmail }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success(data.message || 'Invitation sent successfully!');
            setInviteEmail('');
            await fetchTeamUsers(); // Refresh the list
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    if (authLoading || loading || ordersLoading) return <Loading />

    if (!user) {
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">Please <span className="text-slate-500">Login</span> to view your dashboard</h1>
            </div>
        );
    }

    // --- Detailed order/earnings summary ---
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const isToday = (date) => date && date.startsWith(todayStr);
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const codOrders = orders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cod');
    const cardOrders = orders.filter(o => (o.paymentMethod || '').toLowerCase() !== 'cod');
    const inTransitOrders = orders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(o.status));
    const pendingPaymentOrders = orders.filter(o => !o.isPaid && o.status !== 'CANCELLED');
    const canceledOrders = orders.filter(o => o.status === 'CANCELLED');
    const todayOrders = orders.filter(o => isToday(o.createdAt));
    const deliveredEarnings = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const fromDate = rangeFrom ? new Date(rangeFrom) : null
    const toDate = rangeTo ? new Date(rangeTo) : null
    const hasValidRange = Boolean(
        fromDate &&
        toDate &&
        !Number.isNaN(fromDate.getTime()) &&
        !Number.isNaN(toDate.getTime()) &&
        fromDate <= toDate
    )

    const rangeOrders = hasValidRange
        ? orders.filter((order) => {
            const createdAt = new Date(order?.createdAt)
            if (Number.isNaN(createdAt.getTime())) return false
            return createdAt >= fromDate && createdAt <= toDate
        })
        : []

    const rangeCountableOrders = rangeOrders.filter(shouldIncludeOrderInProductSales)

    const productCountMap = rangeCountableOrders.reduce((accumulator, order) => {
        for (const item of order?.orderItems || []) {
            const rawName = item?.productId?.name || item?.name || item?.productId?.title || 'Product'
            const productName = String(rawName).trim() || 'Product'
            const quantity = getNetSoldQuantity(order, item)
            if (quantity <= 0) continue

            if (!accumulator[productName]) {
                accumulator[productName] = {
                    quantity: 0,
                    image: getProductImageSrc(item)
                }
            }

            accumulator[productName].quantity += quantity
            if (!accumulator[productName].image || accumulator[productName].image === '/placeholder.png') {
                accumulator[productName].image = getProductImageSrc(item)
            }
        }
        return accumulator
    }, {})

    const rangeProductCounts = Object.entries(productCountMap)
        .map(([name, details]) => ({ name, quantity: details.quantity, image: details.image }))
        .sort((left, right) => {
            if (right.quantity !== left.quantity) return right.quantity - left.quantity
            return left.name.localeCompare(right.name)
        })

    const totalUnitsInRange = rangeProductCounts.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <div className="text-slate-500 mb-20 sm:mb-24 lg:mb-28 max-w-7xl mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (!productsList.length) {
                                await fetchProductsForOrder();
                            }
                            setShowCreateOrderModal(true);
                        }}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm text-sm sm:text-base"
                    >
                        <ShoppingCartIcon size={18} />
                        <span>Create Order</span>
                    </button>
                    <Link 
                        href="/store/settings/users" 
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm text-sm sm:text-base"
                    >
                        <UserPlusIcon size={18} />
                        <span>Invite Team Members</span>
                    </Link>
                </div>
            </div>

            {/* Create Order Modal */}
            {showCreateOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-3 sm:p-6">
                    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-4 sm:px-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-white">Create New Order</h2>
                                    <p className="mt-1 text-xs sm:text-sm text-emerald-100">Add customer details, choose products, and confirm payment setup.</p>
                                </div>
                                <button
                                    className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
                                    onClick={() => setShowCreateOrderModal(false)}
                                >
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6 space-y-5">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-800">Customer Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.name} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, name: e.target.value } }))} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.email} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, email: e.target.value } }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.phone} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, phone: e.target.value } }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Street</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.street} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, street: e.target.value } }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.city} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, city: e.target.value } }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.state} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, state: e.target.value } }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.country} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, country: e.target.value } }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" value={newOrder.customer.zip} onChange={e => setNewOrder(o => ({ ...o, customer: { ...o.customer, zip: e.target.value } }))} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-800">Order Items</h3>
                                {newOrder.items.map((item, idx) => {
                                    const selectedProduct = productsList.find((product) => String(product?._id || product?.id || '') === String(item?.productId || '')) || null
                                    const selectedImage = selectedProduct?.image || selectedProduct?.images?.[0] || ''
                                    const selectedName = item?.name || selectedProduct?.name || ''

                                    return (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-white p-2">
                                            <div className="col-span-12 sm:col-span-7">
                                                <ProductSelect
                                                    value={item.productId}
                                                    products={productsList}
                                                    onChange={(val, pickedProduct) => setNewOrder(o => {
                                                        const items = [...o.items];
                                                        const resolvedProduct = pickedProduct || productsList.find((product) => String(product?._id || product?.id || '') === String(val || ''));
                                                        items[idx].productId = val;
                                                        items[idx].name = resolvedProduct?.name || items[idx].name || '';
                                                        items[idx].price = resolvedProduct?.price ?? items[idx].price;
                                                        return { ...o, items };
                                                    })}
                                                    selectedIds={newOrder.items.map(i => i.productId).filter(Boolean)}
                                                />
                                            </div>
                                            <input type="number" placeholder="Price" className="col-span-5 sm:col-span-2 border border-slate-300 rounded-lg px-2 py-2" value={item.price} onChange={e => setNewOrder(o => { const items = [...o.items]; items[idx].price = e.target.value; return { ...o, items }; })} />
                                            <input type="number" placeholder="Qty" className="col-span-4 sm:col-span-2 border border-slate-300 rounded-lg px-2 py-2" value={item.quantity} min={1} onChange={e => setNewOrder(o => { const items = [...o.items]; items[idx].quantity = e.target.value; return { ...o, items }; })} />
                                            <button type="button" className="col-span-3 sm:col-span-1 text-red-500 font-semibold" onClick={() => setNewOrder(o => ({ ...o, items: o.items.filter((_, i) => i !== idx) }))}>×</button>

                                            {(selectedName || selectedImage) && (
                                                <div className="col-span-12 mt-1 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                                                    {selectedImage ? (
                                                        <img
                                                            src={selectedImage}
                                                            alt={selectedName || 'Selected product'}
                                                            className="h-10 w-10 rounded object-cover border border-slate-200"
                                                            onError={(event) => {
                                                                event.currentTarget.style.display = 'none'
                                                            }}
                                                        />
                                                    ) : null}
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={selectedName}
                                                        placeholder="Selected product name"
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                <button type="button" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800" onClick={() => setNewOrder(o => ({ ...o, items: [...o.items, { productId: '', name: '', price: '', quantity: 1 }] }))}>+ Add Item</button>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-800">Payment and Status</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                                        <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5" value={newOrder.paymentMethod} onChange={e => setNewOrder(o => ({ ...o, paymentMethod: e.target.value }))}>
                                            <option value="COD">COD</option>
                                            <option value="CARD">Card</option>
                                            <option value="WALLET">Wallet</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Order Notes</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2.5" value={newOrder.notes} onChange={e => setNewOrder(o => ({ ...o, notes: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Paid?</label>
                                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={newOrder.isPaid}
                                                onChange={e => setNewOrder(o => {
                                                    const checked = e.target.checked;
                                                    return {
                                                        ...o,
                                                        isPaid: checked,
                                                        status: checked && o.status === 'ORDER_PLACED' ? 'PAID' : o.status,
                                                    };
                                                })}
                                            />
                                            <span className="text-sm text-slate-700">{newOrder.isPaid ? 'Yes' : 'No'}</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                                            value={newOrder.status}
                                            onChange={e => setNewOrder(o => {
                                                const nextStatus = e.target.value;
                                                return {
                                                    ...o,
                                                    status: nextStatus,
                                                    isPaid: nextStatus === 'PAID' ? true : o.isPaid,
                                                };
                                            })}
                                        >
                                            <option value="ORDER_PLACED">Order Placed</option>
                                            <option value="PAID">Paid</option>
                                            <option value="PROCESSING">Processing</option>
                                            <option value="SHIPPED">Shipped</option>
                                            <option value="DELIVERED">Delivered</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Order Date/Time</label>
                                        <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2.5" value={newOrder.orderDate} onChange={e => setNewOrder(o => ({ ...o, orderDate: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white pt-2">
                                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                                    <button type="button" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setShowCreateOrderModal(false)}>Cancel</button>
                                    <button
                                        type="button"
                                        className={`px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold ${creatingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        disabled={creatingOrder}
                                        onClick={async () => {
                                            setCreatingOrder(true);
                                            try {
                                                const token = await getToken();
                                                const payload = {
                                                    ...newOrder,
                                                    items: newOrder.items.map(i => ({
                                                        productId: i.productId,
                                                        name: i.name,
                                                        price: Number(i.price),
                                                        quantity: Number(i.quantity)
                                                    })),
                                                    orderDate: newOrder.orderDate ? new Date(newOrder.orderDate).toISOString() : undefined
                                                };
                                                await axios.post('/api/store/orders/create', payload, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                toast.success('Order created!');
                                                setShowCreateOrderModal(false);
                                                const refreshedOrders = await axios.get('/api/store/orders', {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                setOrders(refreshedOrders.data.orders || []);
                                                setNewOrder({
                                                    customer: { name: '', email: '', phone: '', street: '', city: '', state: '', country: '', zip: '' },
                                                    items: [{ productId: '', name: '', price: '', quantity: 1 }],
                                                    paymentMethod: 'COD',
                                                    notes: '',
                                                    isPaid: false,
                                                    status: 'ORDER_PLACED',
                                                    orderDate: (() => {
                                                        const now = new Date();
                                                        return now.toISOString().slice(0, 16);
                                                    })(),
                                                });
                                            } catch (err) {
                                                toast.error(err?.response?.data?.error || 'Failed to create order');
                                            } finally {
                                                setCreatingOrder(false);
                                            }
                                        }}
                                    >
                                        {creatingOrder ? 'Creating...' : 'Create Order'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Order/Earnings Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 my-6 sm:my-8">
                <SummaryCard label="Today's Orders" value={dashboardData.todaysOrdersCount ?? todayOrders.length} />
                <SummaryCard label="Total Delivered" value={deliveredOrders.length} />
                <SummaryCard label="Paid by Card" value={cardOrders.length} />
                <SummaryCard label="COD Orders" value={codOrders.length} />
                <SummaryCard label="In Transit" value={inTransitOrders.length} />
                <SummaryCard label="Pending Payment" value={pendingPaymentOrders.length} />
                <SummaryCard label="Canceled" value={canceledOrders.length} />
                <SummaryCard label="Earnings (Delivered)" value={currency + deliveredEarnings} />
            </div>

            <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-4 sm:p-5 mb-8">
                <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-lg font-semibold text-slate-800">Product Count By Date Range</h2>
                    <p className="text-sm text-slate-500">Select a start and end date-time to see net sold units in that period (cancelled units are excluded).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                    <label className="flex flex-col gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">From Date & Time</span>
                        <input
                            type="datetime-local"
                            value={rangeFrom}
                            onChange={(event) => setRangeFrom(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">To Date & Time</span>
                        <input
                            type="datetime-local"
                            value={rangeTo}
                            onChange={(event) => setRangeTo(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>

                    <SummaryCard label="Orders In Range" value={hasValidRange ? rangeCountableOrders.length : 0} />
                    <SummaryCard label="Units Sold In Range" value={hasValidRange ? totalUnitsInRange : 0} />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-slate-500">
                    <span>From: <span className="font-medium text-slate-700">{formatRangeDateTime(rangeFrom)}</span></span>
                    <span>To: <span className="font-medium text-slate-700">{formatRangeDateTime(rangeTo)}</span></span>
                </div>

                {!hasValidRange ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        Please select a valid range where the from date-time is earlier than the to date-time.
                    </div>
                ) : rangeProductCounts.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No ordered products found in the selected date-time range.
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <table className="w-full min-w-[320px] sm:min-w-[420px] border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-50 text-left text-sm text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-center">Units Sold</th>
                                    <th className="px-4 py-3 font-medium text-center">Image</th>
                                    <th className="px-4 py-3 font-medium">Product</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rangeProductCounts.map((item) => (
                                    <tr key={item.name} className="border-t border-slate-200 text-sm text-slate-700">
                                        <td className="px-4 py-3 text-center font-semibold align-middle">{item.quantity}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                                                <Image
                                                    src={item.image || '/placeholder.png'}
                                                    alt={item.name}
                                                    fill
                                                    sizes="96px"
                                                    className="object-contain object-center"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="block min-w-0 text-[13px] leading-5">{item.name}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 my-8 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 border border-slate-200 bg-white shadow-sm p-4 sm:px-6 rounded-lg min-w-0">
                            <div className="flex min-w-0 flex-col gap-2 text-xs">
                                <p className="text-slate-500 break-words">{card.title}</p>
                                <b className="text-xl sm:text-2xl font-medium text-slate-700 break-all sm:break-normal">{card.value}</b>
                            </div>
                            <card.icon size={44} className="shrink-0 w-10 h-10 p-2 text-slate-400 bg-slate-100 rounded-full" />
                        </div>
                    ))
                }
            </div>

            {/* Contact Us Messages Section */}
            <ContactMessagesSeller />
        </div>
    )
// --- SummaryCard component ---
function SummaryCard({ label, value }) {
    return (
        <div className="flex min-h-24 flex-col gap-2 border border-slate-200 p-4 sm:p-5 rounded-lg bg-white shadow-sm">
            <span className="text-xs sm:text-sm text-slate-400">{label}</span>
            <span className="text-2xl sm:text-xl font-bold text-slate-700 break-words">{value}</span>
        </div>
    );
}
}