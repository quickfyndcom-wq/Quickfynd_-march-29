"use client"
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { useSearchParams } from "next/navigation";

const SIDEBAR_PERMISSION_GROUPS = [
    {
        title: "Core",
        items: [
            { id: "/store", label: "Dashboard" },
            { id: "/store/categories", label: "Categories" },
            { id: "/store/add-product", label: "Add Product" },
            { id: "/store/manage-product", label: "Manage Product" },
        ],
    },
    {
        title: "Storefront",
        items: [
            { id: "/store/home-preferences", label: "Home Preferences" },
            { id: "/store/category-slider", label: "Featured Sections" },
            { id: "/store/navbar-menu", label: "Navbar Menu" },
            { id: "/store/storefront/home-menu-categories", label: "Home Categories" },
            { id: "/store/storefront/hero-slider", label: "Hero Slider" },
            { id: "/store/storefront/carousel-slider", label: "Carousel Slider" },
            { id: "/store/storefront/deals", label: "Deals of the Day" },
            { id: "/store/media", label: "Media" },
            { id: "/store/mobile-features", label: "Mobile Features" },
        ],
    },
    {
        title: "Marketing",
        items: [
            { id: "/store/personalized-offers", label: "Promotional Offers" },
            { id: "/store/coupons", label: "Coupons" },
            { id: "/store/promotional-emails", label: "Promotional Emails" },
            { id: "/store/ads-tracking", label: "Ad Tracking" },
            { id: "/store/marketing-expenses", label: "Marketing Expenses" },
        ],
    },
    {
        title: "Sales & Operations",
        items: [
            { id: "/store/orders", label: "Orders" },
            { id: "/store/abandoned-checkout", label: "Abandoned Checkout" },
            { id: "/store/customer-tracking", label: "Customer Tracking" },
            { id: "/store/shipping", label: "Shipping" },
            { id: "/store/return-requests", label: "Return Requests" },
            { id: "/store/balance", label: "Balance" },
            { id: "/store/sales-report", label: "Sales Report" },
            { id: "/store/most-selling-products", label: "Most Selling Products" },
        ],
    },
    {
        title: "Customers & Support",
        items: [
            { id: "/store/customers", label: "Customers" },
            { id: "/store/settings/users", label: "Manage Users" },
            { id: "/store/reviews", label: "Reviews" },
            { id: "/store/tickets", label: "Support Tickets" },
            { id: "/store/product-notifications", label: "Product Notifications" },
            { id: "/store#contact-messages", label: "Contact Us Messages" },
        ],
    },
    {
        title: "Settings",
        items: [
            { id: "/store/settings", label: "Settings" },
        ],
    },
];

const LEGACY_GROUP_LINKS = {
    overview: ["/store", "/store#contact-messages", "/store/settings"],
    catalog: ["/store/categories", "/store/add-product", "/store/manage-product"],
    orders: ["/store/orders", "/store/abandoned-checkout", "/store/customer-tracking", "/store/shipping", "/store/return-requests", "/store/balance", "/store/sales-report", "/store/most-selling-products"],
    customers: ["/store/customers", "/store/settings/users", "/store/reviews", "/store/tickets", "/store/product-notifications"],
    marketing: ["/store/personalized-offers", "/store/coupons", "/store/promotional-emails", "/store/ads-tracking", "/store/marketing-expenses"],
    storefront: ["/store/home-preferences", "/store/category-slider", "/store/navbar-menu", "/store/storefront/home-menu-categories", "/store/storefront/hero-slider", "/store/storefront/carousel-slider", "/store/storefront/deals", "/store/media", "/store/mobile-features"],
};

const ALL_PERMISSION_IDS = SIDEBAR_PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.id));

const GROUP_PERMISSION_IDS = SIDEBAR_PERMISSION_GROUPS.reduce((acc, group) => {
    acc[group.title] = group.items.map((item) => item.id);
    return acc;
}, {});

const createDefaultPermissions = () => {
    return ALL_PERMISSION_IDS.reduce((acc, id) => {
        acc[id] = true;
        return acc;
    }, {});
};

const createLockedPermissions = () => {
    return ALL_PERMISSION_IDS.reduce((acc, id) => {
        acc[id] = false;
        return acc;
    }, {});
};

const mapLegacyPermissionsToMenuPermissions = (legacyPermissions = {}) => {
    const mapped = createLockedPermissions();
    Object.entries(LEGACY_GROUP_LINKS).forEach(([group, links]) => {
        if (legacyPermissions[group] === true) {
            links.forEach((link) => {
                mapped[link] = true;
            });
        }
    });
    return mapped;
};

const applyGroupPermissionState = (basePermissions, groupTitle, allowed) => {
    const next = { ...(basePermissions || {}) };
    const ids = GROUP_PERMISSION_IDS[groupTitle] || [];
    ids.forEach((id) => {
        next[id] = allowed;
    });
    return next;
};

const normalizeStoredMenuPermissions = (member) => {
    const defaults = createLockedPermissions();
    if (member?.permissionsConfigured === true && Array.isArray(member?.allowedPaths)) {
        const mapped = { ...defaults };
        member.allowedPaths.forEach((path) => {
            if (typeof path === "string" && path.startsWith("/store")) {
                mapped[path] = true;
            }
        });
        return mapped;
    }
    const rawMenu = member?.menuPermissions;
    if (rawMenu && typeof rawMenu === "object" && Object.keys(rawMenu).length > 0) {
        return { ...defaults, ...rawMenu };
    }
    if (member?.permissions && typeof member.permissions === "object") {
        return mapLegacyPermissionsToMenuPermissions(member.permissions);
    }
    if (member?.role === "admin" && member?.permissionsConfigured !== true) {
        return createDefaultPermissions();
    }
    return defaults;
};

export default function SettingsPage() {
    const { user, getToken } = useAuth();
    const searchParams = useSearchParams();
    const requestedTab = searchParams?.get("tab");
    const permissionsOnly = searchParams?.get("permissionsOnly") === "1";
    const [activeTab, setActiveTab] = useState("profile");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteStatus, setInviteStatus] = useState("");
    const [invitePermissions, setInvitePermissions] = useState(() => createDefaultPermissions());
    
    // Profile fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [image, setImage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    
    // Store fields
    const [storeName, setStoreName] = useState("");
    const [storePhone, setStorePhone] = useState("");
    const [storeWebsite, setStoreWebsite] = useState("");
    const [storeAddress, setStoreAddress] = useState("");
    const [storeCity, setStoreCity] = useState("");
    const [storeState, setStoreState] = useState("");
    const [storeZip, setStoreZip] = useState("");
    const [storeDescription, setStoreDescription] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [seventeenTrackBaseUrl, setSeventeenTrackBaseUrl] = useState("");
    const [seventeenTrackApiKey, setSeventeenTrackApiKey] = useState("");
    const [seventeenTrackPublicKey, setSeventeenTrackPublicKey] = useState("");
    const [seventeenTrackSecretKey, setSeventeenTrackSecretKey] = useState("");
    const [seventeenTrackConfigured, setSeventeenTrackConfigured] = useState(false);
    const [seventeenTrackMaskedApiKey, setSeventeenTrackMaskedApiKey] = useState("");
    const [seventeenTrackMaskedPublicKey, setSeventeenTrackMaskedPublicKey] = useState("");
    const [seventeenTrackMaskedSecretKey, setSeventeenTrackMaskedSecretKey] = useState("");
    const [savingCourierKeys, setSavingCourierKeys] = useState(false);
    
    // Settings fields
    const [emailNotifications, setEmailNotifications] = useState(true);
    
    // Dashboard Access fields
    const [teamMembers, setTeamMembers] = useState([]);
    const [memberPermissions, setMemberPermissions] = useState({});
    const [memberRoles, setMemberRoles] = useState({});
    const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState(null);
    const [savingMemberPermissions, setSavingMemberPermissions] = useState(false);
    
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [currencyPreference, setCurrencyPreference] = useState("INR");
    
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [loadingTeam, setLoadingTeam] = useState(false);

    useEffect(() => {
        if (requestedTab === "dashboardAccess") {
            setActiveTab("dashboardAccess");
        }
    }, [requestedTab]);

    // Populate fields when user is loaded or changes
    useEffect(() => {
        setName(user?.displayName || user?.name || "");
        setEmail(user?.email || "");
        setImage(user?.photoURL || user?.image || "");
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const loadCourierKeys = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const res = await axios.get('/api/store/integrations/seventeentrack', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.success) {
                    setSeventeenTrackBaseUrl(res.data.baseUrl || '');
                    setSeventeenTrackConfigured(!!res.data.configured);
                    setSeventeenTrackMaskedApiKey(res.data.maskedApiKey || '');
                    setSeventeenTrackMaskedPublicKey(res.data.maskedPublicKey || '');
                    setSeventeenTrackMaskedSecretKey(res.data.maskedSecretKey || '');
                }
            } catch {
                // Keep settings page functional even if integration status fetch fails
            }
        };
        loadCourierKeys();
    }, [user, getToken]);

    const handleSaveCourierKeys = async () => {
        setSavingCourierKeys(true);
        setMessage('');
        try {
            const token = await getToken();
            if (!token) {
                setMessage('Authentication failed. Please sign in again.');
                return;
            }
            const res = await axios.post('/api/store/integrations/seventeentrack', {
                baseUrl: seventeenTrackBaseUrl.trim(),
                apiKey: seventeenTrackApiKey.trim(),
                publicKey: seventeenTrackPublicKey.trim(),
                secretKey: seventeenTrackSecretKey.trim(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.success) {
                setSeventeenTrackBaseUrl('');
                setSeventeenTrackApiKey('');
                setSeventeenTrackPublicKey('');
                setSeventeenTrackSecretKey('');
                setSeventeenTrackConfigured(!!res.data.configured);
                setMessage('Courier API key saved successfully!');
                const statusRes = await axios.get('/api/store/integrations/seventeentrack', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (statusRes.data?.success) {
                    setSeventeenTrackBaseUrl(statusRes.data.baseUrl || '');
                    setSeventeenTrackConfigured(!!statusRes.data.configured);
                    setSeventeenTrackMaskedApiKey(statusRes.data.maskedApiKey || '');
                    setSeventeenTrackMaskedPublicKey(statusRes.data.maskedPublicKey || '');
                    setSeventeenTrackMaskedSecretKey(statusRes.data.maskedSecretKey || '');
                }
            }
        } catch (err) {
            setMessage(err?.response?.data?.error || 'Failed to save courier API key');
        } finally {
            setSavingCourierKeys(false);
        }
    };
    
    // Fetch team members when Dashboard Access tab is active
    useEffect(() => {
        if (activeTab === "dashboardAccess") {
            const fetchTeamMembers = async () => {
                setLoadingTeam(true);
                try {
                    const token = await getToken();
                    const res = await axios.get("/api/store/users", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log("Team members fetched:", res.data);
                    setTeamMembers(res.data.users || []);
                    // Initialize permissions for each member
                    const permissions = {};
                    const roles = {};
                    res.data.users?.forEach(member => {
                        permissions[member.id] = normalizeStoredMenuPermissions(member);
                        roles[member.id] = member.role === 'admin' ? 'admin' : 'member';
                    });
                    setMemberPermissions(permissions);
                    setMemberRoles(roles);
                } catch (err) {
                    console.error('Failed to fetch team members:', err);
                    setMessage('Failed to load team members');
                } finally {
                    setLoadingTeam(false);
                }
            };
            fetchTeamMembers();
        }
    }, [activeTab, getToken]);

    // Live preview for uploaded image, fallback to current or first letter avatar
    let imagePreview = null;
    if (imageFile) {
        imagePreview = URL.createObjectURL(imageFile);
    } else if (image) {
        imagePreview = image;
    }

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const token = await getToken();
            let imageUrl = image;
            if (imageFile) {
                const formData = new FormData();
                formData.append("image", imageFile);
                const res = await axios.post("/api/store/profile/upload-image", formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                imageUrl = res.data.url;
            }
            
            const dataToSave = {
                name, 
                image: imageUrl, 
                email,
                storeName,
                storePhone,
                storeWebsite,
                storeAddress,
                storeCity,
                storeState,
                storeZip,
                storeDescription,
                businessType,
                emailNotifications,
                twoFactorEnabled,
                currencyPreference
            };
            
            await axios.post("/api/store/profile/update", dataToSave, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage("Settings saved successfully!");
            setImage(imageUrl);
            setImageFile(null);
        } catch (err) {
            setMessage(err?.response?.data?.error || err.message);
        }
        setSaving(false);
    };

    return (
        <div className="flex flex-col gap-0 h-screen max-h-screen overflow-hidden bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4 bg-white">
                <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
                <p className="text-sm text-slate-500">Manage your store and account preferences</p>
            </div>
            
            {!permissionsOnly && (
                <div className="flex gap-0 border-b border-slate-200 px-6 bg-slate-50 overflow-x-auto">
                    {["profile", "store", "preferences", "dashboardAccess"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 font-medium text-sm transition border-b-2 whitespace-nowrap ${
                                activeTab === tab 
                                    ? 'text-blue-600 border-blue-600' 
                                    : 'text-slate-600 border-transparent hover:text-slate-800'
                            }`}
                        >
                            {tab === "dashboardAccess" ? "Dashboard Access" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSaveChanges} className="flex flex-col gap-6 p-6">
                    
                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center gap-3 mb-4">
                                <div className="relative w-20 h-20">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                                    ) : (
                                        <span className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-2xl border-2 border-blue-200">
                                            {(name?.[0] || email?.[0] || 'U').toUpperCase()}
                                        </span>
                                    )}
                                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 cursor-pointer shadow-lg hover:bg-blue-700">
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                                        }} />
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16"/></svg>
                                    </label>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-slate-900">{name || "Your Name"}</div>
                                    <div className="text-slate-500 text-sm">{email || "your@email.com"}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="font-medium text-slate-700">Full Name</span>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="font-medium text-slate-700">Email Address</span>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* Store Tab */}
                    {activeTab === "store" && (
                        <div className="space-y-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Store Name</span>
                                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Your store name" />
                            </label>
                            
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Business Type</span>
                                <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">Select business type</option>
                                    <option value="retail">Retail</option>
                                    <option value="wholesale">Wholesale</option>
                                    <option value="service">Service</option>
                                    <option value="digital">Digital Products</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                            
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Phone Number</span>
                                <input type="tel" value={storePhone} onChange={e => setStorePhone(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+91 XXXXX XXXXX" />
                            </label>
                            
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Website URL</span>
                                <input type="url" value={storeWebsite} onChange={e => setStoreWebsite(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://example.com" />
                            </label>
                            
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Description</span>
                                <textarea value={storeDescription} onChange={e => setStoreDescription(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows="3" placeholder="Tell customers about your store..." />
                            </label>
                            
                            <div className="border-t border-slate-200 pt-4">
                                <h3 className="font-medium text-slate-700 mb-3">Address</h3>
                                <div className="space-y-3">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm text-slate-700">Street Address</span>
                                        <input type="text" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="123 Main Street" />
                                    </label>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-sm text-slate-700">City</span>
                                            <input type="text" value={storeCity} onChange={e => setStoreCity(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="City" />
                                        </label>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-sm text-slate-700">State</span>
                                            <input type="text" value={storeState} onChange={e => setStoreState(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="State" />
                                        </label>
                                    </div>
                                    
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm text-slate-700">ZIP Code</span>
                                        <input type="text" value={storeZip} onChange={e => setStoreZip(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="123456" />
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <h3 className="font-medium text-slate-700 mb-3">Courier Tracking API Keys</h3>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                                    <p className="text-sm text-orange-900">
                                        Add courier API keys here. This works from Store Settings, no need to edit .env.
                                    </p>

                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm text-slate-700">Tracking API Base URL</span>
                                        <input
                                            type="url"
                                            value={seventeenTrackBaseUrl}
                                            onChange={e => setSeventeenTrackBaseUrl(e.target.value)}
                                            className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="https://api.17track.net/track/v2.2"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm text-slate-700">India Post Tracking (17track API Key)</span>
                                        <input
                                            type="password"
                                            value={seventeenTrackApiKey}
                                            onChange={e => setSeventeenTrackApiKey(e.target.value)}
                                            className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Paste 17track API key"
                                        />
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-sm text-slate-700">Public Key</span>
                                            <input
                                                type="password"
                                                value={seventeenTrackPublicKey}
                                                onChange={e => setSeventeenTrackPublicKey(e.target.value)}
                                                className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                placeholder="Public key"
                                            />
                                        </label>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-sm text-slate-700">Secret Key</span>
                                            <input
                                                type="password"
                                                value={seventeenTrackSecretKey}
                                                onChange={e => setSeventeenTrackSecretKey(e.target.value)}
                                                className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                placeholder="Secret key"
                                            />
                                        </label>
                                    </div>

                                    {seventeenTrackConfigured && (
                                        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-2 space-y-1">
                                            {seventeenTrackMaskedApiKey && <p>Saved API key: <span className="font-mono">{seventeenTrackMaskedApiKey}</span></p>}
                                            {seventeenTrackMaskedPublicKey && <p>Saved public key: <span className="font-mono">{seventeenTrackMaskedPublicKey}</span></p>}
                                            {seventeenTrackMaskedSecretKey && <p>Saved secret key: <span className="font-mono">{seventeenTrackMaskedSecretKey}</span></p>}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleSaveCourierKeys}
                                        disabled={savingCourierKeys}
                                        className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                                    >
                                        {savingCourierKeys ? 'Saving credentials...' : 'Save Courier Credentials'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Preferences Tab */}
                    {activeTab === "preferences" && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-700">Email Notifications</p>
                                        <p className="text-sm text-slate-500">Receive updates about orders and promotions</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-700">Two-Factor Authentication</p>
                                        <p className="text-sm text-slate-500">Add extra security to your account</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={twoFactorEnabled} onChange={e => setTwoFactorEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700">Currency Preference</span>
                                <select value={currencyPreference} onChange={e => setCurrencyPreference(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="INR">Indian Rupee (₹)</option>
                                    <option value="USD">US Dollar ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                    <option value="GBP">British Pound (£)</option>
                                    <option value="AED">UAE Dirham (د.إ)</option>
                                </select>
                            </label>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900">
                                    <span className="font-semibold">Account Status:</span> Active ✓
                                </p>
                                <p className="text-xs text-blue-700 mt-1">Last login: Today at 2:30 PM</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Dashboard Access Tab */}
                    {activeTab === "dashboardAccess" && (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-5">
                                <h3 className="font-semibold text-slate-900">Page-Level Access Control</h3>
                                <p className="text-sm text-slate-600 mt-1">Choose exactly which sidebar pages each invited member can open. All unchecked pages are locked automatically.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInvitePermissions(createDefaultPermissions())}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Default Template: Allow All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const locked = createDefaultPermissions();
                                            ALL_PERMISSION_IDS.forEach((id) => { locked[id] = false; });
                                            setInvitePermissions(locked);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Default Template: Lock All
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Team Member Access</h3>
                                {loadingTeam ? (
                                    <div className="bg-slate-100 rounded-lg p-6 text-center text-slate-600">
                                        <p className="text-sm">Loading team members...</p>
                                    </div>
                                ) : teamMembers.length === 0 ? (
                                    <div className="bg-slate-100 rounded-lg p-6 text-center text-slate-600">
                                        <p className="text-sm">No team members yet. Invite users to manage their access.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {teamMembers.map((member) => (
                                            <div key={member.id} className="border border-slate-200 rounded-xl bg-white p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{member.name || member.email}</p>
                                                        <p className="text-xs text-slate-500">{member.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {member.role === 'admin' ? 'admin' : 'staff'}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                                            {Object.values(memberPermissions[member.id] || createDefaultPermissions()).filter(Boolean).length} allowed
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMemberForPermissions(member);
                                                                setMemberPermissions((prev) => ({
                                                                    ...prev,
                                                                    [member.id]: prev[member.id] || normalizeStoredMenuPermissions(member),
                                                                }));
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                                                        >
                                                            Manage Specific Permissions
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                <h3 className="font-semibold text-slate-900 mb-1">Default Permissions for New Team Members</h3>
                                <p className="text-xs text-slate-600 mb-3">This template is used when you invite a new user.</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {SIDEBAR_PERMISSION_GROUPS.map((group) => (
                                        <div key={`default-${group.title}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="text-xs uppercase tracking-wide font-semibold text-slate-600">{group.title}</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setInvitePermissions((prev) => applyGroupPermissionState(prev, group.title, true));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Allow All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setInvitePermissions((prev) => applyGroupPermissionState(prev, group.title, false));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Lock All
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {group.items.map((item) => (
                                                    <label key={`default-${item.id}`} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={invitePermissions[item.id] ?? true}
                                                            onChange={(e) => {
                                                                setInvitePermissions((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: e.target.checked,
                                                                }));
                                                            }}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-sm text-slate-700">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {(!permissionsOnly || activeTab === "dashboardAccess") && (
                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                            {activeTab !== "dashboardAccess" && !permissionsOnly && (
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            )}
                            <button 
                                type="button" 
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition"
                                onClick={() => setInviteOpen(!inviteOpen)}
                            >
                                {inviteOpen ? "Cancel Invite" : "Invite User"}
                            </button>
                            {message && <div className={`text-center text-sm p-2 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>}
                        </div>
                    )}
                </form>
                
                {/* Invite Section */}
                {inviteOpen && (
                    <div className="border-t border-slate-200 p-6 bg-slate-50">
                        <h3 className="font-semibold text-slate-900 mb-4">Invite Team Member</h3>
                        <form
                            onSubmit={async e => {
                                e.preventDefault();
                                setInviteStatus("");
                                try {
                                    const token = await getToken();
                                    await axios.post("/api/store/users/invite", { 
                                        email: inviteEmail,
                                        permissions: invitePermissions
                                    }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setInviteStatus("Invitation sent!");
                                    setInviteEmail("");
                                    setTimeout(() => setInviteOpen(false), 1500);
                                } catch (err) {
                                    setInviteStatus(err?.response?.data?.error || err.message);
                                }
                            }}
                            className="flex flex-col gap-4"
                        >
                            <label className="flex flex-col gap-1.5">
                                <span className="font-medium text-slate-700 text-sm">Email Address</span>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </label>
                            
                            <div>
                                <p className="font-medium text-slate-700 text-sm mb-2">Sidebar Page Permissions:</p>
                                <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                                    {SIDEBAR_PERMISSION_GROUPS.map((group) => (
                                        <div key={`invite-${group.title}`}>
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{group.title}</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setInvitePermissions((prev) => applyGroupPermissionState(prev, group.title, true));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Allow All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setInvitePermissions((prev) => applyGroupPermissionState(prev, group.title, false));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Lock All
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {group.items.map((item) => (
                                                    <label key={`invite-${item.id}`} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={invitePermissions[item.id] ?? true}
                                                            onChange={(e) => {
                                                                setInvitePermissions((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: e.target.checked,
                                                                }));
                                                            }}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-xs text-slate-700">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition">
                                Send Invitation
                            </button>
                            {inviteStatus && <div className={`text-center text-sm p-2 rounded ${inviteStatus.includes('sent') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{inviteStatus}</div>}
                        </form>
                    </div>
                )}

                {selectedMemberForPermissions && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900">Sidebar Permissions</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{selectedMemberForPermissions.name || selectedMemberForPermissions.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={memberRoles[selectedMemberForPermissions.id] || 'member'}
                                        onChange={(e) => {
                                            setMemberRoles((prev) => ({
                                                ...prev,
                                                [selectedMemberForPermissions.id]: e.target.value,
                                            }));
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="member">Staff</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMemberForPermissions(null)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 overflow-y-auto max-h-[65vh]">
                                <div className="flex gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberPermissions((prev) => ({
                                                ...prev,
                                                [selectedMemberForPermissions.id]: createDefaultPermissions(),
                                            }));
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                        Allow All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const locked = createDefaultPermissions();
                                            ALL_PERMISSION_IDS.forEach((id) => { locked[id] = false; });
                                            setMemberPermissions((prev) => ({
                                                ...prev,
                                                [selectedMemberForPermissions.id]: locked,
                                            }));
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                        Lock All
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {SIDEBAR_PERMISSION_GROUPS.map((group) => (
                                        <div key={`modal-${group.title}`} className="rounded-lg border border-slate-200 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="text-xs uppercase tracking-wide font-semibold text-slate-600">{group.title}</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMemberPermissions((prev) => ({
                                                                ...prev,
                                                                [selectedMemberForPermissions.id]: applyGroupPermissionState(
                                                                    {
                                                                        ...createDefaultPermissions(),
                                                                        ...prev[selectedMemberForPermissions.id],
                                                                    },
                                                                    group.title,
                                                                    true
                                                                ),
                                                            }));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Allow All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMemberPermissions((prev) => ({
                                                                ...prev,
                                                                [selectedMemberForPermissions.id]: applyGroupPermissionState(
                                                                    {
                                                                        ...createDefaultPermissions(),
                                                                        ...prev[selectedMemberForPermissions.id],
                                                                    },
                                                                    group.title,
                                                                    false
                                                                ),
                                                            }));
                                                        }}
                                                        className="px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Lock All
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {group.items.map((item) => (
                                                    <label key={`modal-${item.id}`} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={memberPermissions[selectedMemberForPermissions.id]?.[item.id] ?? true}
                                                            onChange={(e) => {
                                                                setMemberPermissions((prev) => ({
                                                                    ...prev,
                                                                    [selectedMemberForPermissions.id]: {
                                                                        ...createDefaultPermissions(),
                                                                        ...prev[selectedMemberForPermissions.id],
                                                                        [item.id]: e.target.checked,
                                                                    },
                                                                }));
                                                            }}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-sm text-slate-700">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMemberForPermissions(null)}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={savingMemberPermissions}
                                    onClick={async () => {
                                        try {
                                            setSavingMemberPermissions(true);
                                            const token = await getToken();
                                            await axios.post('/api/store/users/make-admin', {
                                                userEmail: selectedMemberForPermissions.email,
                                                role: memberRoles[selectedMemberForPermissions.id] || 'member',
                                            }, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });

                                            await axios.post('/api/store/users/update-permissions', {
                                                userId: selectedMemberForPermissions.id,
                                                userEmail: selectedMemberForPermissions.email,
                                                permissions: memberPermissions[selectedMemberForPermissions.id] || createDefaultPermissions(),
                                            }, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });

                                            setTeamMembers((prev) => prev.map((member) => (
                                                member.id === selectedMemberForPermissions.id
                                                    ? { ...member, role: memberRoles[selectedMemberForPermissions.id] || 'member' }
                                                    : member
                                            )));
                                            setMessage('Permissions updated successfully!');
                                            setSelectedMemberForPermissions(null);
                                        } catch (err) {
                                            setMessage(err?.response?.data?.error || 'Failed to update permissions');
                                        } finally {
                                            setSavingMemberPermissions(false);
                                        }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                                >
                                    {savingMemberPermissions ? 'Saving...' : 'Save Permissions'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
