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
    const pendingPaymentOrders = orders.filter(o => !o.isPaid && (o.status !== 'CANCELLED'));
    const canceledOrders = orders.filter(o => o.status === 'CANCELLED');
    const todayOrders = orders.filter(o => isToday(o.createdAt));
    const deliveredEarnings = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return (
        <div className=" text-slate-500 mb-28">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>
                <Link 
                    href="/store/settings/users" 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-sm"
                >
                    <UserPlusIcon size={18} />
                    <span>Invite Team Members</span>
                </Link>
            </div>

            {/* Detailed Order/Earnings Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 my-8">
                <SummaryCard label="Today's Orders" value={todayOrders.length} />
                <SummaryCard label="Total Delivered" value={deliveredOrders.length} />
                <SummaryCard label="Paid by Card" value={cardOrders.length} />
                <SummaryCard label="COD Orders" value={codOrders.length} />
                <SummaryCard label="In Transit" value={inTransitOrders.length} />
                <SummaryCard label="Pending Payment" value={pendingPaymentOrders.length} />
                <SummaryCard label="Canceled" value={canceledOrders.length} />
                <SummaryCard label="Earnings (Delivered)" value={currency + deliveredEarnings} />
            </div>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                            <div className="flex flex-col gap-3 text-xs">
                                <p>{card.title}</p>
                                <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                            </div>
                            <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
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
        <div className="flex flex-col gap-2 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xl font-bold text-slate-700">{value}</span>
        </div>
    );
}
}