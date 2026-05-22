'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';

const MAX_ITEMS = 12;
const SKELETON_ITEMS = Array.from({ length: 8 });

export default function NavbarMenuBar() {
  const pathname = usePathname();
  const menuContainerClass = 'max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 py-2.5';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollContainerRef = useRef(null);

  const handleScrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({
      left: Math.max(container.clientWidth * 0.7, 180),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    const updateScrollHint = () => {
      const remainingScroll = container.scrollWidth - container.clientWidth - container.scrollLeft;
      setShowScrollHint(remainingScroll > 16);
    };

    updateScrollHint();
    container.addEventListener('scroll', updateScrollHint, { passive: true });
    window.addEventListener('resize', updateScrollHint);

    return () => {
      container.removeEventListener('scroll', updateScrollHint);
      window.removeEventListener('resize', updateScrollHint);
    };
  }, [items, loading]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch('/api/store/navbar-menu', { cache: 'no-store' });
        if (!response.ok) {
          setItems([]);
          setLoading(false);
          return;
        }
        const data = await response.json();
        const nextItems = Array.isArray(data.items) ? data.items.slice(0, MAX_ITEMS) : [];
        setItems(nextItems);
      } catch (error) {
        console.error('Navbar menu fetch error:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  if (!loading && items.length === 0) return null;

  const normalizeUrl = (item) => {
    if (item?.url) return item.url;
    if (item?.categoryId) return `/shop?category=${item.categoryId}`;
    return '/shop';
  };

  return (
    <div className="w-full bg-white text-gray-800 border-b border-gray-200">
      <div className={menuContainerClass}>
        <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-center justify-start gap-3 overflow-x-auto whitespace-nowrap"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          <Link
            href="/shop"
            className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.02em] uppercase text-gray-800 hover:text-orange-500 transition whitespace-nowrap"
          >
          <Menu size={18} />
          <span>All</span>
          </Link>
          {loading && (
            <div className="flex items-center gap-3">
              {SKELETON_ITEMS.map((_, idx) => (
                <div key={`skeleton-${idx}`} className="flex items-center flex-shrink-0">
                  <span className="mx-2 text-gray-200">|</span>
                  <div className="h-4 w-20 rounded-full bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {!loading && items.map((item, index) => (
            <div key={`${item.label || item.name || 'menu'}-${index}`} className="flex items-center flex-shrink-0">
              <span className="mx-2 text-gray-300">|</span>
              <Link
                href={normalizeUrl(item)}
                className="text-[13px] font-semibold tracking-[0.01em] text-gray-700 hover:text-orange-500 transition whitespace-nowrap"
              >
                {item.label || item.name || 'Menu'}
              </Link>
            </div>
          ))}
        </div>
        {showScrollHint && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <div className="flex h-full items-center bg-gradient-to-r from-white/0 via-white/90 to-white pl-8">
              <button
                type="button"
                onClick={handleScrollRight}
                aria-label="Scroll menu right"
                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-white/95 text-orange-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
              >
                <ChevronRight size={15} className="animate-[pulse_1.4s_ease-in-out_infinite]" />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
