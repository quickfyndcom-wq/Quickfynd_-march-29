"use client"
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";

export default function HomeMenuCategoriesPage() {
    const { user, getToken } = useAuth();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    
    const [enabled, setEnabled] = useState(true);
    const [style, setStyle] = useState("grid");
    const [itemsPerRow, setItemsPerRow] = useState(4);
    const [showIcons, setShowIcons] = useState(true);
    const [showCount, setShowCount] = useState(true);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        
        try {
            const token = await getToken();
            await axios.post("/api/store/storefront/home-menu-categories", {
                enabled,
                style,
                itemsPerRow,
                showIcons,
                showCount
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage("Home menu categories settings saved successfully!");
        } catch (err) {
            setMessage(err?.response?.data?.error || "Failed to save settings");
        }
        
        setSaving(false);
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Home Menu Categories</h2>
                        <p className="text-sm text-slate-500">Category menu displayed on homepage</p>
                    </div>
                    <a 
                        href="/store/home-menu-categories"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Manage Items
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSave} className="max-w-3xl space-y-6">
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Enable Home Menu</h3>
                                <p className="text-sm text-slate-500">Show category menu on homepage</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={e => setEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {enabled && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Display Style</label>
                                    <select
                                        value={style}
                                        onChange={e => setStyle(e.target.value)}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="grid">Grid Layout</option>
                                        <option value="carousel">Carousel Slider</option>
                                        <option value="horizontal">Horizontal Scroll</option>
                                        <option value="list">Vertical List</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Items Per Row</label>
                                    <select
                                        value={itemsPerRow}
                                        onChange={e => setItemsPerRow(parseInt(e.target.value))}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="3">3 Items</option>
                                        <option value="4">4 Items</option>
                                        <option value="5">5 Items</option>
                                        <option value="6">6 Items</option>
                                        <option value="8">8 Items</option>
                                    </select>
                                    <p className="text-sm text-slate-500 mt-1">For grid and horizontal layouts</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-900">Show Category Icons</h3>
                                        <p className="text-sm text-slate-500">Display icons with category names</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showIcons}
                                            onChange={e => setShowIcons(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-900">Show Product Count</h3>
                                        <p className="text-sm text-slate-500">Display number of products in each category</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showCount}
                                            onChange={e => setShowCount(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                        
                        {message && (
                            <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
