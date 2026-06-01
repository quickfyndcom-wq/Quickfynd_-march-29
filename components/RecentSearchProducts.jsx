'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function RecentSearchProducts() {
  const products = useSelector(state => state.product.list);
  const { user, getToken } = useAuth();
  const [recentProducts, setRecentProducts] = useState([]);
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
      let viewedProductIds = [];

      // If logged in, fetch from database
      if (user) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        try {
          const token = await getToken();
          if (token) {
            const response = await axios.get('/api/browse-history', {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            // API returns history with products already populated
            if (response.data?.success && response.data?.history && response.data.history.length > 0) {
              const viewed = response.data.history
                .map(h => h.product)
                .filter(Boolean)
                .slice(0, 8);
              if (viewed.length > 0) {
                setRecentProducts(viewed);
                setIsNewCustomer(false);
                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Don't log if it's just an abort (expected timeout)
          if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
            // Only log if it's a real error, not a timeout
            if (error.message && error.message !== 'The user aborted a request.') {
              console.warn('[RecentSearchProducts] Browse history fetch warning:', error.message);
            }
          }
          
          // Fallback to localStorage if API fails
          const localViewed = localStorage.getItem('recentlyViewed');
          if (localViewed) {
            try {
              viewedProductIds = JSON.parse(localViewed);
            } catch (e) {
              console.error('[RecentSearchProducts] Error parsing localStorage viewed:', e);
            }
          }
        }
      } else {
        // Not logged in - use localStorage
        const localViewed = localStorage.getItem('recentlyViewed');
        if (localViewed) {
          try {
            viewedProductIds = JSON.parse(localViewed);
          } catch (error) {
            console.error('[RecentSearchProducts] Error parsing recently viewed:', error);
          }
        }
      }

      // Map IDs to products from Redux
      if (viewedProductIds.length > 0 && products.length > 0) {
        const viewed = viewedProductIds
          .map(id => products.find(p => (p._id || p.id) === id))
          .filter(Boolean)
          .slice(0, 8);
        
        if (viewed.length > 0) {
          setIsNewCustomer(false);
          setRecentProducts(viewed);
        }
      }
      
      setLoading(false);
    };

    // Only fetch if products are loaded
    if (products && products.length > 0) {
      fetchRecentlyViewed();
    } else {
      setLoading(false);
    }
  }, [products, user, getToken]);

  // Show skeleton while loading
  if (loading) {
    return (
      <section className="w-full bg-white py-8 mb-6">
        <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex items-center justify-between mb-6 px-4">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse">
                <div className="w-full aspect-square bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't show if customer is new
  if (isNewCustomer || recentProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-8 mb-6">
      <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Your History</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Recently Viewed Products</h2>
            <p className="text-sm text-gray-500 mt-1">Products you've recently checked out</p>
          </div>
          <Link
            href="/recently-viewed"
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition"
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
          {recentProducts.map(product => (
            <div key={product._id || product.id} className="w-[220px] sm:w-[230px] flex-shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
