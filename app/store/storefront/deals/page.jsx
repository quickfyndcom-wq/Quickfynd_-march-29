"use client"
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";

export default function DealsPage() {
    const { user, getToken } = useAuth();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    
    const [enabled, setEnabled] = useState(true);
    const [title, setTitle] = useState("Deals of the Day");
    const [description, setDescription] = useState("Limited time offers on selected products");
    const [minDiscount, setMinDiscount] = useState(20);
    const [maxProducts, setMaxProducts] = useState(8);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        
        try {
            const token = await getToken();
            await axios.post("/api/store/storefront/deals", {
                enabled,
                title,
                description,
                minDiscount,
                maxProducts
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage("Deals settings saved successfully!");
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
                        <h2 className="text-2xl font-semibold text-slate-900">Deals of the Day</h2>
                        <p className="text-sm text-slate-500">Configure daily deals section on homepage</p>
                    </div>
                    <a 
                        href="/store/deals"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        Manage Deals
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSave} className="max-w-3xl space-y-6">
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Enable Deals Section</h3>
                                <p className="text-sm text-slate-500">Show deals of the day on homepage</p>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Section Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Deals of the Day"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Limited time offers on selected products"
                                        rows="2"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Discount %</label>
                                    <input
                                        type="number"
                                        value={minDiscount}
                                        onChange={e => setMinDiscount(parseInt(e.target.value))}
                                        min="0"
                                        max="100"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <p className="text-sm text-slate-500 mt-1">Only show products with at least this discount</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Max Products to Show</label>
                                    <select
                                        value={maxProducts}
                                        onChange={e => setMaxProducts(parseInt(e.target.value))}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="4">4 Products</option>
                                        <option value="6">6 Products</option>
                                        <option value="8">8 Products</option>
                                        <option value="10">10 Products</option>
                                        <option value="12">12 Products</option>
                                    </select>
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
