'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function RecommendedProducts() {
  const products = useSelector(state => state.product.list);
  const { user, getToken } = useAuth();
  const [viewedProducts, setViewedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const handleMouseDown = event => {
    if (!sliderRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = event.pageX - sliderRef.current.offsetLeft;
    startScrollLeftRef.current = sliderRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = event => {
    if (!isDraggingRef.current || !sliderRef.current) return;
    event.preventDefault();
    const x = event.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 0.9;
    sliderRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleDragStart = event => {
    event.preventDefault();
  };

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      setLoading(true);
      let viewed = [];

      // If logged in, fetch from database
      if (user && user.uid) {
        try {
          const token = await getToken();
          if (token) {
            const response = await axios.get('/api/browse-history', {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000, // 5 second timeout
            });
            // API returns history with products already populated
            if (response.data?.history && response.data.history.length > 0) {
              viewed = response.data.history
                .map(h => h.product)
                .filter(Boolean);
            }
          } else {
            // No token available, use localStorage
            const localViewed = localStorage.getItem('recentlyViewed');
            if (localViewed) {
              try {
                const viewedIds = JSON.parse(localViewed);
                viewed = viewedIds
                  .map(id => products.find(p => (p._id || p.id) === id))
                  .filter(Boolean);
              } catch (e) {
                // Silent - localStorage parse errors are not critical
              }
            }
          }
        } catch (error) {
          // Silently fall back to localStorage - this is expected behavior for new users
          
          // Fallback to localStorage if API fails
          const localViewed = localStorage.getItem('recentlyViewed');
          if (localViewed) {
            try {
              const viewedIds = JSON.parse(localViewed);
              viewed = viewedIds
                .map(id => products.find(p => (p._id || p.id) === id))
                .filter(Boolean);
            } catch (e) {
              // Silent - localStorage parse errors are not critical
            }
          }
        }
      } else {
        // Not logged in - use localStorage
        const localViewed = localStorage.getItem('recentlyViewed');
        if (localViewed) {
          try {
            const viewedIds = JSON.parse(localViewed);
            viewed = viewedIds
              .map(id => products.find(p => (p._id || p.id) === id))
              .filter(Boolean);
          } catch (error) {
            // Silent - localStorage parse errors are not critical
          }
        }
      }

      if (viewed.length > 0) {
        setIsNewCustomer(false);
        setViewedProducts(viewed);

        // Get categories from viewed products
        const viewedCategories = new Set();
        viewed.forEach(product => {
          if (product.category) viewedCategories.add(product.category.toLowerCase());
        });

        // Get recommended products from similar categories
        const viewedIds = new Set(viewed.map(p => p._id || p.id));
        const recommended = products
          .filter(product => {
            const categoryMatch = product.category && 
              [...viewedCategories].some(cat => 
                product.category.toLowerCase().includes(cat) ||
                cat.includes(product.category.toLowerCase())
              );
            // Don't include products already viewed
            const notViewed = !viewedIds.has(product._id || product.id);
            return categoryMatch && notViewed;
          })
          .slice(0, 10);

        setRecommendedProducts(recommended);
      }

      setLoading(false);
    };

    fetchRecentlyViewed();
  }, [products, user, getToken]);

  if (loading) {
    return (
      <section className="w-full bg-white py-8 mb-6">
        <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex items-center justify-between mb-6 px-4">
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-6 w-52 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
            {[...Array(5)].map((_, i) => (
              <div key={`recommended-skeleton-${i}`} className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse">
                <div className="w-full aspect-square bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  
  if (isNewCustomer || recommendedProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-8 mb-6">
      <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Personalized</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Recommended for You</h2>
            <p className="text-sm text-gray-500 mt-1">Based on products you've viewed</p>
          </div>
          <Link
            href="/recommended"
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition"
          >
            View All
            <ChevronRight size={18} />
          </Link>
        </div>

        {/* Product Row */}
        <div
          ref={sliderRef}
          className="flex flex-nowrap gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-4 pb-2 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onDragStart={handleDragStart}
        >
          {recommendedProducts.map(product => (
            <div key={product._id || product.id} className="w-[220px] sm:w-[230px] flex-shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
