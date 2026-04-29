"use client"
import { usePathname } from "next/navigation"
import { HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, StarIcon, FolderIcon, TicketIcon, TruckIcon, RefreshCw, User as UserIcon, Users as UsersIcon, MessageSquare, Sparkles, BellIcon, MailIcon, Image as ImageIcon, ShoppingCart, Wallet, BarChart3, Target, Gift, X, Activity, Smartphone } from "lucide-react"
import Link from "next/link"

const StoreSidebar = ({ storeInfo, isOpen = false, onClose }) => {
    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Most Selling Products', href: '/store/most-selling-products', icon: BarChart3 },
        { name: 'Dashboard', href: '/store', icon: HomeIcon },
        { name: 'Categories', href: '/store/categories', icon: FolderIcon },
        { name: 'Add Product', href: '/store/add-product', icon: SquarePlusIcon },
        { name: 'Manage Product', href: '/store/manage-product', icon: SquarePenIcon },
        { name: 'Home Preferences', href: '/store/home-preferences', icon: Sparkles },
        { name: 'Featured Sections', href: '/store/category-slider', icon: Sparkles },
        { name: 'Navbar Menu', href: '/store/navbar-menu', icon: LayoutListIcon },
        { name: 'Home Categories', href: '/store/storefront/home-menu-categories', icon: FolderIcon },
        { name: 'Hero Slider', href: '/store/storefront/hero-slider', icon: Sparkles },
        { name: 'Carousel Slider', href: '/store/storefront/carousel-slider', icon: Sparkles },
        { name: 'Deals of the Day', href: '/store/storefront/deals', icon: StarIcon },
        { name: 'Promotional Offers', href: '/store/personalized-offers', icon: Gift },
        { name: 'Media', href: '/store/media', icon: ImageIcon },
        { name: 'Mobile Features', href: '/store/mobile-features', icon: Smartphone },
        { name: 'Abandoned Checkout', href: '/store/abandoned-checkout', icon: ShoppingCart },
        { name: 'Customer Tracking', href: '/store/customer-tracking', icon: Activity },
        { name: 'Coupons', href: '/store/coupons', icon: TicketIcon },
        { name: 'Shipping', href: '/store/shipping', icon: TruckIcon },
        { name: 'Customers', href: '/store/customers', icon: UsersIcon },
        { name: 'Manage Users', href: '/store/settings/users', icon: UserIcon },
        { name: 'Orders', href: '/store/orders', icon: LayoutListIcon },
        { name: 'Balance', href: '/store/balance', icon: Wallet },
        { name: 'Sales Report', href: '/store/sales-report', icon: BarChart3 },
        { name: 'Marketing Expenses', href: '/store/marketing-expenses', icon: Target },
        { name: 'Return Requests', href: '/store/return-requests', icon: RefreshCw },
        { name: 'Reviews', href: '/store/reviews', icon: StarIcon },
        { name: 'Support Tickets', href: '/store/tickets', icon: MessageSquare },
        { name: 'Contact Us Messages', href: '/store#contact-messages', icon: StarIcon },
        { name: 'Product Notifications', href: '/store/product-notifications', icon: BellIcon },
        { name: 'Promotional Emails', href: '/store/promotional-emails', icon: MailIcon },
        { name: 'Ad Tracking', href: '/store/ads-tracking', icon: BarChart3 },
    ]

    const sidebarSections = [
        {
            name: 'Core',
            links: [
                '/store',
                '/store/categories',
                '/store/add-product',
                '/store/manage-product',
            ]
        },
        {
            name: 'Storefront',
            links: [
                '/store/home-preferences',
                '/store/category-slider',
                '/store/navbar-menu',
                '/store/storefront/home-menu-categories',
                '/store/storefront/hero-slider',
                '/store/storefront/carousel-slider',
                '/store/storefront/deals',
                '/store/media',
                '/store/mobile-features',
            ]
        },
        {
            name: 'Marketing',
            links: [
                '/store/personalized-offers',
                '/store/coupons',
                '/store/promotional-emails',
                '/store/ads-tracking',
                '/store/marketing-expenses',
            ]
        },
        {
            name: 'Sales & Operations',
            links: [
                '/store/orders',
                '/store/abandoned-checkout',
                '/store/customer-tracking',
                '/store/shipping',
                '/store/return-requests',
                '/store/balance',
                '/store/sales-report',
                '/store/most-selling-products',
            ]
        },
        {
            name: 'Customers & Support',
            links: [
                '/store/customers',
                '/store/settings/users',
                '/store/reviews',
                '/store/tickets',
                '/store/product-notifications',
                '/store#contact-messages',
            ]
        },
    ]

    const linkByHref = sidebarLinks.reduce((acc, link) => {
        acc[link.href] = link;
        return acc;
    }, {});

    const resolveActive = (href) => {
        if (href.includes('#')) {
            return pathname === href.split('#')[0];
        }
        return pathname === href;
    }

    const getSectionTheme = (sectionName) => {
        switch (sectionName) {
            case 'Core':
                return {
                    headerText: 'text-sky-700',
                    headerIconBg: 'bg-sky-100',
                    headerIconText: 'text-sky-700',
                    activeLink: 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-sky-100',
                    activeIconText: 'text-sky-700',
                    hoverLink: 'hover:bg-sky-50/60 hover:text-sky-700',
                    hoverIconBg: 'group-hover:bg-sky-100',
                    hoverIconText: 'group-hover:text-sky-700',
                    dot: 'bg-sky-600'
                }
            case 'Storefront':
                return {
                    headerText: 'text-emerald-700',
                    headerIconBg: 'bg-emerald-100',
                    headerIconText: 'text-emerald-700',
                    activeLink: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-emerald-100',
                    activeIconText: 'text-emerald-700',
                    hoverLink: 'hover:bg-emerald-50/60 hover:text-emerald-700',
                    hoverIconBg: 'group-hover:bg-emerald-100',
                    hoverIconText: 'group-hover:text-emerald-700',
                    dot: 'bg-emerald-600'
                }
            case 'Marketing':
                return {
                    headerText: 'text-violet-700',
                    headerIconBg: 'bg-violet-100',
                    headerIconText: 'text-violet-700',
                    activeLink: 'bg-violet-50 text-violet-700 border border-violet-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-violet-100',
                    activeIconText: 'text-violet-700',
                    hoverLink: 'hover:bg-violet-50/60 hover:text-violet-700',
                    hoverIconBg: 'group-hover:bg-violet-100',
                    hoverIconText: 'group-hover:text-violet-700',
                    dot: 'bg-violet-600'
                }
            case 'Sales & Operations':
                return {
                    headerText: 'text-amber-700',
                    headerIconBg: 'bg-amber-100',
                    headerIconText: 'text-amber-700',
                    activeLink: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-amber-100',
                    activeIconText: 'text-amber-700',
                    hoverLink: 'hover:bg-amber-50/60 hover:text-amber-700',
                    hoverIconBg: 'group-hover:bg-amber-100',
                    hoverIconText: 'group-hover:text-amber-700',
                    dot: 'bg-amber-600'
                }
            case 'Customers & Support':
                return {
                    headerText: 'text-rose-700',
                    headerIconBg: 'bg-rose-100',
                    headerIconText: 'text-rose-700',
                    activeLink: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-rose-100',
                    activeIconText: 'text-rose-700',
                    hoverLink: 'hover:bg-rose-50/60 hover:text-rose-700',
                    hoverIconBg: 'group-hover:bg-rose-100',
                    hoverIconText: 'group-hover:text-rose-700',
                    dot: 'bg-rose-600'
                }
            default:
                return {
                    headerText: 'text-slate-600',
                    headerIconBg: 'bg-slate-100',
                    headerIconText: 'text-slate-700',
                    activeLink: 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold',
                    activeIconBg: 'bg-slate-200',
                    activeIconText: 'text-slate-800',
                    hoverLink: 'hover:bg-slate-100 hover:text-slate-700',
                    hoverIconBg: 'group-hover:bg-slate-200',
                    hoverIconText: 'group-hover:text-slate-700',
                    dot: 'bg-slate-600'
                }
        }
    }

    // Helper to get section icon by section name
    function getSectionIcon(sectionName) {
        switch (sectionName) {
            case 'Core':
                return HomeIcon;
            case 'Storefront':
                return LayoutListIcon;
            case 'Orders':
                return ShoppingCart;
            case 'Customers':
                return UsersIcon;
            case 'Promotions':
                return Gift;
            case 'Support':
                return MessageSquare;
            case 'Notifications':
                return BellIcon;
            case 'Media':
                return ImageIcon;
            default:
                return StarIcon;
        }
    }

    return (
        <>
            <div
                className={`fixed inset-x-0 bottom-0 top-[61px] z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 sm:top-[69px] lg:hidden ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            <aside
                className={`fixed bottom-0 left-0 top-[61px] z-50 w-[18rem] max-w-[85vw] bg-gradient-to-br from-slate-50 via-white to-slate-50 border-r border-slate-200 flex min-h-0 flex-col overflow-hidden shadow-xl transition-transform duration-300 sm:top-[69px] lg:static lg:z-0 lg:h-full lg:w-72 lg:max-w-none lg:self-stretch lg:translate-x-0 lg:shadow-lg ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:hidden">
                    <p className="text-sm font-semibold text-slate-700">Menu</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
                        aria-label="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                </div>
                
           
          
           
                {/* Navigation Links */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 pb-8 touch-auto lg:pb-4 scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {/* Sectioned Navigation */}
                    {sidebarSections.map((section) => {
                        const SectionIcon = getSectionIcon(section.name)
                        const theme = getSectionTheme(section.name)

                        return (
                            <div key={section.name} className="mt-6">
                                <div className={`px-3 pb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>
                                    <span className={`p-1 rounded-md ${theme.headerIconBg}`}>
                                        <SectionIcon size={12} className={theme.headerIconText} />
                                    </span>
                                    <span>{section.name}</span>
                                </div>

                                <div className="space-y-1">
                                    {section.links.map((href) => {
                                        const link = linkByHref[href];
                                        if (!link) return null;
                                        const Icon = link.icon;
                                        const isActive = resolveActive(link.href);
                                        return (
                                            <Link
                                                key={`${section.name}-${link.href}`}
                                                href={link.href}
                                                onClick={() => onClose?.()}
                                                className={`group flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                                                    isActive
                                                        ? `${theme.activeLink} scale-[1.01]`
                                                        : `text-slate-700 ${theme.hoverLink} hover:shadow-sm`
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-lg transition-colors ${
                                                    isActive
                                                        ? `${theme.activeIconBg}`
                                                        : `bg-slate-100 ${theme.hoverIconBg}`
                                                }`}>
                                                    <Icon size={18} className={isActive ? theme.activeIconText : theme.hoverIconText} />
                                                </div>
                                                <span className="truncate">{link.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Settings Button */}
                <div className="border-t border-slate-200 px-3 py-4 bg-slate-50/90 shrink-0 lg:bg-slate-50/50">
                    <Link
                        href="/store/settings"
                        onClick={() => onClose?.()}
                        className="group flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-500 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}

export default StoreSidebar
