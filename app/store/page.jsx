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

export default function Dashboard() {
    const { user, loading: authLoading, getToken } = useAuth();
    console.log('[page.jsx] user:', user, 'authLoading:', authLoading);
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

    const productCountMap = rangeOrders.reduce((accumulator, order) => {
        for (const item of order?.orderItems || []) {
            const rawName = item?.productId?.name || item?.name || item?.productId?.title || 'Product'
            const productName = String(rawName).trim() || 'Product'
            const quantity = Number(item?.quantity) || 0
            if (quantity <= 0) continue

            accumulator[productName] = (accumulator[productName] || 0) + quantity
        }
        return accumulator
    }, {})

    const rangeProductCounts = Object.entries(productCountMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((left, right) => {
            if (right.quantity !== left.quantity) return right.quantity - left.quantity
            return left.name.localeCompare(right.name)
        })

    const totalUnitsInRange = rangeProductCounts.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <div className="text-slate-500 mb-20 sm:mb-24 lg:mb-28 max-w-7xl mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>
                <Link 
                    href="/store/settings/users" 
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm text-sm sm:text-base"
                >
                    <UserPlusIcon size={18} />
                    <span>Invite Team Members</span>
                </Link>
            </div>

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
                    <p className="text-sm text-slate-500">Select a start and end date-time to see how many units of each product were ordered in that period.</p>
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

                    <SummaryCard label="Orders In Range" value={hasValidRange ? rangeOrders.length : 0} />
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
                                    <th className="px-4 py-3 font-medium">Product</th>
                                    <th className="px-4 py-3 font-medium">Units Ordered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rangeProductCounts.map((item) => (
                                    <tr key={item.name} className="border-t border-slate-200 text-sm text-slate-700">
                                        <td className="px-4 py-3">{item.name}</td>
                                        <td className="px-4 py-3 font-semibold">{item.quantity}</td>
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