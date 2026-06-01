'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from '@/components/ProductCard';
import PageTitle from '@/components/PageTitle';
import Loading from '@/components/Loading';
import { TruckIcon, ZapIcon } from 'lucide-react';

const HERO_THEMES = [
  {
    shell: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700',
    leftGlow: 'bg-white/10',
    rightGlow: 'bg-cyan-200/20',
    card: 'border-white/20 bg-white/10',
    badge: 'border-white/30 bg-white/10',
    subtitle: 'text-teal-50/95',
    accentIcon: 'text-amber-300',
    badgeLabel: 'FAST LANE',
  },
  {
    shell: 'bg-gradient-to-r from-rose-700 via-fuchsia-700 to-indigo-700',
    leftGlow: 'bg-pink-200/20',
    rightGlow: 'bg-indigo-200/20',
    card: 'border-white/20 bg-black/20',
    badge: 'border-rose-100/30 bg-rose-100/15',
    subtitle: 'text-rose-50/95',
    accentIcon: 'text-yellow-300',
    badgeLabel: 'RAPID SHIP',
  },
  {
    shell: 'bg-gradient-to-r from-slate-900 via-blue-900 to-sky-800',
    leftGlow: 'bg-sky-200/15',
    rightGlow: 'bg-blue-200/20',
    card: 'border-sky-100/20 bg-slate-950/30',
    badge: 'border-sky-100/30 bg-sky-100/10',
    subtitle: 'text-sky-100/95',
    accentIcon: 'text-lime-300',
    badgeLabel: 'SPEED MODE',
  },
];

const HERO_ROTATE_MS = 5 * 60 * 1000;

export default function FastDeliveryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroThemeIndex, setHeroThemeIndex] = useState(0);

  useEffect(() => {
    fetchFastDeliveryProducts();
  }, []);

  useEffect(() => {
    const initialTheme = Math.floor(Date.now() / HERO_ROTATE_MS) % HERO_THEMES.length;
    setHeroThemeIndex(initialTheme);

    const rotateTimer = setInterval(() => {
      setHeroThemeIndex((prev) => (prev + 1) % HERO_THEMES.length);
    }, HERO_ROTATE_MS);

    return () => clearInterval(rotateTimer);
  }, []);

  const fetchFastDeliveryProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/products?fastDelivery=true&limit=300');
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching fast delivery products:', error);
      setError('Failed to load fast delivery products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  const activeTheme = HERO_THEMES[heroThemeIndex];

  return (
    <>
      <PageTitle title="Fast Delivery Products" />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white -mt-12">
        {/* Header Section */}
        <div className={`relative overflow-hidden py-12 sm:py-14 text-white transition-colors duration-700 ${activeTheme.shell}`}>
          <div className={`pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full blur-2xl transition-colors duration-700 ${activeTheme.leftGlow}`} />
          <div className={`pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rounded-full blur-3xl transition-colors duration-700 ${activeTheme.rightGlow}`} />

          <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 relative">
            <div className={`mx-auto max-w-3xl rounded-2xl border px-5 py-6 sm:px-8 sm:py-8 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-colors duration-700 ${activeTheme.card}`}>
              <div className="mb-4 flex items-center justify-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-700 ${activeTheme.badge}`}>
                  <TruckIcon size={14} />
                  {activeTheme.badgeLabel}
                </span>
                <ZapIcon size={20} className={activeTheme.accentIcon} />
              </div>

              <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                Fast Delivery Products
              </h1>

              <p className={`text-center text-sm sm:text-base md:text-lg max-w-2xl mx-auto transition-colors duration-700 ${activeTheme.subtitle}`}>
                Get these products delivered quickly. Priority shipping is available on all items below.
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 py-12">
          {error ? (
            <div className="text-center py-16">
              <div className="text-red-500 text-lg mb-4">{error}</div>
              <button
                onClick={fetchFastDeliveryProducts}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <TruckIcon size={80} className="mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                No Fast Delivery Products Available
              </h2>
              <p className="text-gray-600 mb-6">
                Check back soon for products with fast delivery options!
              </p>
              <a
                href="/products"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Browse All Products
              </a>
            </div>
          ) : (
            <>
              {/* Fast Delivery Badge Info */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-8 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <ZapIcon className="text-blue-600" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Express Shipping Available
                    </h3>
                    <p className="text-sm text-gray-600">
                      All products on this page qualify for our fastest delivery service. 
                      Order now and get it delivered in record time!
                    </p>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
