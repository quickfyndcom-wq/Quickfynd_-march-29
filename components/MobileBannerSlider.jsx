'use client';

import { useEffect, useMemo, useState } from 'react';

const AUTO_PLAY_MS = 3500;

export default function MobileBannerSlider({ onNoData = null, onLoaded = null }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadSlides = async () => {
      try {
        console.log('[MobileBannerSlider] Fetching mobile banner data...');
        const res = await fetch('/api/store/mobile-banner-slider', { cache: 'no-store' });
        const data = await res.json().catch(() => {
          console.warn('[MobileBannerSlider] Failed to parse JSON response');
          return {};
        });

        if (!mounted) return;

        const serverSlides = Array.isArray(data?.slides) ? data.slides : [];
        const validSlides = serverSlides.filter((s) => s?.image);
        
        console.log('[MobileBannerSlider] Loaded slides:', validSlides.length, 'Enabled:', data?.enabled);
        
        setEnabled(Boolean(data?.enabled));
        setSlides(validSlides);

        // Callback when no data
        if (validSlides.length === 0 && onNoData) {
          onNoData();
        }
      } catch (error) {
        console.error('[MobileBannerSlider] Fetch error:', error);
        if (mounted) {
          setEnabled(false);
          setSlides([]);
          if (onNoData) {
            onNoData();
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          // Call onLoaded when loading is complete
          if (onLoaded) {
            onLoaded();
          }
        }
      }
    };

    loadSlides();
    return () => {
      mounted = false;
    };
  }, [onNoData, onLoaded]);

  useEffect(() => {
    if (!enabled || slides.length <= 1) return;

    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);

    return () => clearInterval(interval);
  }, [enabled, slides.length]);

  const hasSlides = useMemo(() => enabled && slides.length > 0, [enabled, slides.length]);

  if (loading || !hasSlides) return null;

  return (
    <div className="md:hidden w-full px-3 pt-3">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative w-full aspect-[16/7]">
          <a href={slides[active]?.link || '/offers'} className="block h-full w-full" aria-label={slides[active]?.title || 'Mobile banner'}>
            <img
              src={slides[active]?.image}
              alt={slides[active]?.title || `Mobile banner ${active + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </a>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-2 py-1">
            {slides.map((_, idx) => (
              <button
                key={`mobile-banner-dot-${idx}`}
                type="button"
                onClick={() => setActive(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === active ? 'w-4 bg-white' : 'w-1.5 bg-white/70'}`}
                aria-label={`Go to mobile banner ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
