'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const HEIGHT = 320;
const SLIDE_INTERVAL = 5000;

const defaultSlides = [];

const getFullQualityHeroImage = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return url;

  if (!url.includes('ik.imagekit.io')) return url;

  let cleaned = url;

  if (cleaned.includes('/tr:')) {
    cleaned = cleaned.replace(/\/tr:[^/]+\//, '/');
  }

  if (cleaned.includes('?tr=')) {
    cleaned = cleaned.replace(/\?tr=[^&]*/i, '').replace(/^([^?]+)&/, '$1?');
    if (cleaned.endsWith('?')) cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
};

export default function HeroBannerSlider() {
  const [slides, setSlides] = useState(defaultSlides);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => Array(defaultSlides.length).fill(false));
  const router = useRouter();
  const intervalRef = useRef(null);

  // Memoized click handler
  const handleSlideClick = useCallback((link) => {
    router.push(link);
  }, [router]);

  // Memoized image load handler
  const handleImageLoad = useCallback((i) => {
    setLoaded((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHeroSlides = async () => {
      try {
        const response = await fetch('/api/store/hero-slider', { cache: 'no-store' });
        const data = await response.json();

        if (!isMounted) return;

        const apiSlides = Array.isArray(data?.slides)
          ? data.slides
              .filter((slide) => slide?.image)
              .map((slide) => ({
                image: getFullQualityHeroImage(slide.image),
                link: slide.link || '/offers',
                bg: slide.bg || '#7A0A11',
              }))
          : [];

        if (data?.enabled && apiSlides.length > 0) {
          setSlides(apiSlides);
          setLoaded(Array(apiSlides.length).fill(false));
          setIndex(0);
        }
      } catch (error) {
        console.error('Failed to load dynamic hero slider settings:', error);
      }
    };

    loadHeroSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length]);

  const renderSkeleton = () => (
    <>
      <div className="hero-banner-skeleton">
        <div className="hero-banner-skeleton__inner"></div>
      </div>
      <style jsx>{`
        .hero-banner-skeleton {
          width: 100%;
          height: ${HEIGHT}px;
          background-color: #f3f4f6;
          position: relative;
          overflow: hidden;
          contain: layout style paint;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .hero-banner-skeleton__inner {
          width: 100%;
          max-width: 1250px;
          height: 100%;
          background: #f3f4f6;
        }
        
        @media (max-width: 640px) {
          .hero-banner-skeleton {
            height: auto;
            aspect-ratio: 1250 / 320;
            min-height: 100px;
          }
          
          .hero-banner-skeleton__inner {
            width: 100%;
            max-width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
          }
        }
      `}</style>
    </>
  );

  if (slides.length === 0) {
    return renderSkeleton();
  }

  return (
    <div
      className="hero-banner"
      style={{
        background: slides[index]?.bg || '#7A0A11',
        contain: 'layout style paint',
      }}
    >
      <div className="hero-banner__viewport">
        {slides.map((slide, i) => {
          const isActive = i === index;
          const isAdjacent = i === (index + 1) % slides.length || i === (index - 1 + slides.length) % slides.length;
          
          if (!isActive && !isAdjacent && !loaded[i]) return null;
          
          return (
            <div
              key={i}
              onClick={() => handleSlideClick(slide.link)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1) translateZ(0)' : 'scale(1.05) translateZ(0)',
                transition: 'opacity 0.7s ease-in-out, transform 0.7s ease-in-out',
                pointerEvents: isActive ? 'auto' : 'none',
                willChange: isActive ? 'opacity, transform' : 'auto',
                backfaceVisibility: 'hidden',
                zIndex: isActive ? 2 : 1,
                background: slide.bg,
              }}
            >
              <Image
                src={slide.image}
                alt={`Banner ${i + 1}`}
                width={1250}
                height={HEIGHT}
                unoptimized
                priority={i === 0}
                loading={i === 0 ? 'eager' : 'lazy'}
                placeholder="empty"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
                onLoad={() => handleImageLoad(i)}
                onError={() => handleImageLoad(i)}
              />
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .hero-banner {
          width: 100vw;
          height: ${HEIGHT}px;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-left: calc(-50vw + 50%);
          transition: none;
        }

        .hero-banner__viewport {
          position: relative;
          height: 100%;
          width: 100%;
          max-width: 1250px;
          overflow: hidden;
          contain: layout style paint;
        }

        @media (max-width: 640px) {
          .hero-banner {
            height: auto;
            aspect-ratio: 1250 / 320;
          }
          .hero-banner__viewport {
            height: 100%;
          }
        }
      `}</style>

      {/* Navigation Pills */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%) translateZ(0)',
          display: 'flex',
          gap: 8,
          padding: '3px 5px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIndex(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === index ? 40 : 30,
              height: 6,
              borderRadius: 999,
              background: i === index ? 'rgba(255, 255, 255, 0.56)' : 'rgba(0,0,0,0.2)',
              boxShadow: i === index ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              cursor: 'pointer',
              border: 'none',
              padding: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
