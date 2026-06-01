"use client"
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";

export default function CategorySlidersPage() {
    const { user, getToken } = useAuth();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    
    const [enabled, setEnabled] = useState(true);
    const [title, setTitle] = useState("Featured Collections");
    const [description, setDescription] = useState("Browse our curated collections");
    const [autoPlay, setAutoPlay] = useState(true);
    const [slidesToShow, setSlidesToShow] = useState(5);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        
        try {
            const token = await getToken();
            await axios.post("/api/store/storefront/category-sliders", {
                enabled,
                title,
                description,
                autoPlay,
                slidesToShow
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage("Category sliders settings saved successfully!");
        } catch (err) {
            setMessage(err?.response?.data?.error || "Failed to save settings");
        }
        
        setSaving(false);
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-2xl font-semibold text-slate-900">Category Sliders</h2>
                <p className="text-sm text-slate-500">Display product categories in a slider</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSave} className="max-w-3xl space-y-6">
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Enable Category Sliders</h3>
                                <p className="text-sm text-slate-500">Show category slider on homepage</p>
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
                                        placeholder="Featured Collections"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Browse our curated collections"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Slides to Show</label>
                                    <select
                                        value={slidesToShow}
                                        onChange={e => setSlidesToShow(parseInt(e.target.value))}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="3">3 Slides</option>
                                        <option value="4">4 Slides</option>
                                        <option value="5">5 Slides</option>
                                        <option value="6">6 Slides</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-900">Auto Play</h3>
                                        <p className="text-sm text-slate-500">Automatically cycle through slides</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoPlay}
                                            onChange={e => setAutoPlay(e.target.checked)}
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
