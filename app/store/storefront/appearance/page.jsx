"use client"
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";

export default function AppearancePage() {
    const { user, getToken } = useAuth();
    const [activeSection, setActiveSection] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Section states
    const [categorySliders, setCategorySliders] = useState({
        enabled: true,
        title: "Featured Collections",
        description: "Browse our curated collections"
    });

    const [carouselSlider, setCarouselSlider] = useState({
        enabled: true,
        autoPlay: true,
        interval: 5,
        showControls: true
    });

    const [dealsOfTheDay, setDealsOfTheDay] = useState({
        enabled: true,
        title: "Deals of the Day",
        discount: 50
    });

    const [sitemapCategories, setSitemapCategories] = useState({
        enabled: true,
        columnsPerRow: 4
    });

    const [homeMenuCategories, setHomeMenuCategories] = useState({
        enabled: true,
        style: "grid",
        itemsPerRow: 5
    });

    const [navbarMenu, setNavbarMenu] = useState({
        enabled: true,
        position: "top",
        style: "horizontal"
    });

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const token = await getToken();
            const dataToSave = {
                categorySliders,
                carouselSlider,
                dealsOfTheDay,
                sitemapCategories,
                homeMenuCategories,
                navbarMenu
            };
            
            await axios.post("/api/store/appearance/sections", dataToSave, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage("Appearance settings saved successfully!");
        } catch (err) {
            setMessage(err?.response?.data?.error || "Failed to save settings");
        }
        setSaving(false);
    };

    return (
        <div className="flex flex-col gap-0 h-screen max-h-screen overflow-hidden bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4 bg-white">
                <h2 className="text-2xl font-semibold text-slate-900">Appearance</h2>
                <p className="text-sm text-slate-500">Manage home page sections and layouts</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 p-6">

                    {/* Category Sliders */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Category Sliders</h3>
                                <p className="text-sm text-slate-500">Display product categories in a slider</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={categorySliders.enabled}
                                    onChange={e => setCategorySliders({...categorySliders, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {categorySliders.enabled && (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={categorySliders.title}
                                    onChange={e => setCategorySliders({...categorySliders, title: e.target.value})}
                                    placeholder="Title"
                                    className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                />
                                <input
                                    type="text"
                                    value={categorySliders.description}
                                    onChange={e => setCategorySliders({...categorySliders, description: e.target.value})}
                                    placeholder="Description"
                                    className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Carousel Slider */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Carousel Slider</h3>
                                <p className="text-sm text-slate-500">Main banner carousel on homepage</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={carouselSlider.enabled}
                                    onChange={e => setCarouselSlider({...carouselSlider, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {carouselSlider.enabled && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700">Auto Play</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={carouselSlider.autoPlay}
                                            onChange={e => setCarouselSlider({...carouselSlider, autoPlay: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-700 block mb-1">Interval (seconds)</label>
                                    <input
                                        type="number"
                                        value={carouselSlider.interval}
                                        onChange={e => setCarouselSlider({...carouselSlider, interval: parseInt(e.target.value)})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                        min="1"
                                        max="10"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700">Show Controls</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={carouselSlider.showControls}
                                            onChange={e => setCarouselSlider({...carouselSlider, showControls: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deals of the Day */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Deals of the Day</h3>
                                <p className="text-sm text-slate-500">Show daily deals section</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={dealsOfTheDay.enabled}
                                    onChange={e => setDealsOfTheDay({...dealsOfTheDay, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {dealsOfTheDay.enabled && (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={dealsOfTheDay.title}
                                    onChange={e => setDealsOfTheDay({...dealsOfTheDay, title: e.target.value})}
                                    placeholder="Section Title"
                                    className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                />
                                <div>
                                    <label className="text-sm text-slate-700 block mb-1">Max Discount %</label>
                                    <input
                                        type="number"
                                        value={dealsOfTheDay.discount}
                                        onChange={e => setDealsOfTheDay({...dealsOfTheDay, discount: parseInt(e.target.value)})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sitemap Categories */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Sitemap Categories</h3>
                                <p className="text-sm text-slate-500">Display all categories in footer sitemap</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sitemapCategories.enabled}
                                    onChange={e => setSitemapCategories({...sitemapCategories, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {sitemapCategories.enabled && (
                            <div>
                                <label className="text-sm text-slate-700 block mb-2">Columns per Row</label>
                                <select
                                    value={sitemapCategories.columnsPerRow}
                                    onChange={e => setSitemapCategories({...sitemapCategories, columnsPerRow: parseInt(e.target.value)})}
                                    className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                >
                                    <option value="2">2 Columns</option>
                                    <option value="3">3 Columns</option>
                                    <option value="4">4 Columns</option>
                                    <option value="5">5 Columns</option>
                                    <option value="6">6 Columns</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Home Menu Categories */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Home Menu Categories</h3>
                                <p className="text-sm text-slate-500">Featured categories on homepage</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={homeMenuCategories.enabled}
                                    onChange={e => setHomeMenuCategories({...homeMenuCategories, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {homeMenuCategories.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-slate-700 block mb-2">Display Style</label>
                                    <select
                                        value={homeMenuCategories.style}
                                        onChange={e => setHomeMenuCategories({...homeMenuCategories, style: e.target.value})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                    >
                                        <option value="grid">Grid</option>
                                        <option value="carousel">Carousel</option>
                                        <option value="horizontal">Horizontal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-700 block mb-2">Items per Row</label>
                                    <input
                                        type="number"
                                        value={homeMenuCategories.itemsPerRow}
                                        onChange={e => setHomeMenuCategories({...homeMenuCategories, itemsPerRow: parseInt(e.target.value)})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                        min="1"
                                        max="10"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navbar Menu */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Navbar Menu</h3>
                                <p className="text-sm text-slate-500">Top navigation menu configuration</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={navbarMenu.enabled}
                                    onChange={e => setNavbarMenu({...navbarMenu, enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        {navbarMenu.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-slate-700 block mb-2">Position</label>
                                    <select
                                        value={navbarMenu.position}
                                        onChange={e => setNavbarMenu({...navbarMenu, position: e.target.value})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                    >
                                        <option value="top">Top</option>
                                        <option value="bottom">Bottom</option>
                                        <option value="sticky">Sticky</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-700 block mb-2">Style</label>
                                    <select
                                        value={navbarMenu.style}
                                        onChange={e => setNavbarMenu({...navbarMenu, style: e.target.value})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                                    >
                                        <option value="horizontal">Horizontal</option>
                                        <option value="vertical">Vertical</option>
                                        <option value="dropdown">Dropdown</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Appearance Settings"}
                        </button>
                        {message && (
                            <div className={`text-center text-sm p-2 rounded ${
                                message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
