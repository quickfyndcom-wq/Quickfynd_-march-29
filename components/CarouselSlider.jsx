'use client';

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";

const MIN_ITEMS_FOR_SLIDE = 6;

export default function CarouselSlider() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const dragRafRef = useRef(null);
  const dragTargetScrollRef = useRef(0);
  const [showNextArrow, setShowNextArrow] = useState(false);
  const [showPrevArrow, setShowPrevArrow] = useState(false);
  const [isCursorDragging, setIsCursorDragging] = useState(false);

  const getCardStride = () => {
    const slider = scrollRef.current;
    if (!slider) return 232;

    const firstCard = slider.querySelector('.carousel-product-card');
    if (!firstCard) return 232;

    const styles = window.getComputedStyle(slider);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const scrollNext = () => {
    if (scrollRef.current) {
      const scrollAmount = getCardStride();
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    if (scrollRef.current) {
      const scrollAmount = getCardStride();
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const checkScroll = () => {
    if (scrollRef.current) {
      if (products.length <= MIN_ITEMS_FOR_SLIDE) {
        setShowPrevArrow(false);
        setShowNextArrow(false);
        return;
      }
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowPrevArrow(scrollLeft > 0);
      setShowNextArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  /* ---------------- FETCH PRODUCTS ---------------- */
  useEffect(() => {
    async function fetchCarouselProducts() {
      try {
        const { data: carousel } = await axios.get("/api/store/carousel-products");
        const productIds = carousel.productIds || [];

        if (!productIds.length) {
          setProducts([]);
          return;
        }

        const { data } = await axios.post("/api/products/batch", { productIds });

        const validProducts = (data.products || []).filter(
          (p) => p.slug && p.slug.length > 0
        );

        setProducts(validProducts);
        setShowNextArrow(validProducts.length > MIN_ITEMS_FOR_SLIDE);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCarouselProducts();
  }, [products.length]);

  /* Check scroll position on mount and after scroll */
  useEffect(() => {
    const slider = scrollRef.current;
    if (!slider) return;
    
    checkScroll();
    slider.addEventListener('scroll', checkScroll);
    
    return () => slider.removeEventListener('scroll', checkScroll);
  }, []);

  /* ---------------- DRAG TO SCROLL ---------------- */
  useEffect(() => {
    const slider = scrollRef.current;
    if (!slider) return;
    
    let isPointerDown = false;
    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;

    const commitDragScroll = () => {
      slider.scrollLeft = dragTargetScrollRef.current;
      dragRafRef.current = null;
    };

    const snapToNearestCard = () => {
      const stride = getCardStride();
      if (!stride) return;
      const target = Math.round(slider.scrollLeft / stride) * stride;
      slider.scrollTo({ left: target, behavior: 'smooth' });
    };

    const queueDragScroll = (nextScrollLeft) => {
      dragTargetScrollRef.current = nextScrollLeft;
      if (dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(commitDragScroll);
      }
    };

    const stopDrag = (shouldSnap = true) => {
      isPointerDown = false;
      pointerId = null;
      slider.classList.remove('active');
      document.body.classList.remove('carousel-noselect');
      setIsCursorDragging(false);
      if (shouldSnap && products.length > MIN_ITEMS_FOR_SLIDE) {
        snapToNearestCard();
      }
    };

    const onPointerDown = (e) => {
      if (products.length <= MIN_ITEMS_FOR_SLIDE) return;
      isPointerDown = true;
      pointerId = e.pointerId;
      slider.classList.add('active');
      setIsCursorDragging(true);
      startX = e.clientX;
      startScrollLeft = slider.scrollLeft;
      document.body.classList.add('carousel-noselect');
      slider.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;
      e.preventDefault();
      const walk = (e.clientX - startX) * 1.1;
      queueDragScroll(startScrollLeft - walk);
    };

    const onPointerUp = (e) => {
      if (pointerId !== null && e.pointerId === pointerId) {
        try {
          slider.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore when capture is already released.
        }
      }
      stopDrag();
    };

    const onPointerCancel = () => {
      stopDrag();
    };

    const onDragStart = (e) => {
      e.preventDefault();
    };

    slider.addEventListener('pointerdown', onPointerDown);
    slider.addEventListener('pointermove', onPointerMove);
    slider.addEventListener('pointerup', onPointerUp);
    slider.addEventListener('pointercancel', onPointerCancel);
    slider.addEventListener('dragstart', onDragStart);
    
    return () => {
      slider.removeEventListener('pointerdown', onPointerDown);
      slider.removeEventListener('pointermove', onPointerMove);
      slider.removeEventListener('pointerup', onPointerUp);
      slider.removeEventListener('pointercancel', onPointerCancel);
      slider.removeEventListener('dragstart', onDragStart);
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      document.body.classList.remove('carousel-noselect');
      stopDrag(false);
      setIsCursorDragging(false);
    };
  }, [products.length]);

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#f5f5f5',
      padding: '40px 0',
      marginTop: 0,
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Container for carousel and banner */}
      <div ref={containerRef} className="carousel-container max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4" style={{
        position: 'relative',
        display: 'flex',
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Left Side - Carousel */}
        <div className="carousel-wrapper" style={{ flex: 1, minWidth: 0, position: 'relative', minHeight: 400 }}>
          {/* Title and subtitle */}
          <div style={{
            marginBottom: 24,
            paddingRight: 10,
          }}>
            <h4 className="carousel-title" style={{
              fontSize: 28,
              fontWeight: 500,
              color: '#000000',
              margin: 0,
              marginBottom: 8,
              letterSpacing: '-0.5px',
              fontFamily: 'Poppins, sans-serif',
            }}>Women’s Dress Collection</h4>
          </div>

          {/* Carousel */}
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              gap: 8,
              overflowX: loading || products.length > MIN_ITEMS_FOR_SLIDE ? 'auto' : 'hidden',
              paddingBottom: 16,
              scrollBehavior: 'smooth',
              paddingRight: 20,
              alignItems: 'flex-start',
              cursor: products.length > MIN_ITEMS_FOR_SLIDE ? (isCursorDragging ? 'grabbing' : 'grab') : 'default',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              maxWidth: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'pan-y',
              scrollSnapType: 'x mandatory',
            }}
            className="carousel-scroll"
          >
            {loading ? (
              // Skeleton Loaders
              [...Array(6)].map((_, index) => (
                <div
                  className="carousel-product-card"
                  key={`skeleton-${index}`}
                  style={{
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    background: '#fff',
                    borderRadius: 8,
                    padding: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    border: '1px solid #f0f0f0',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Skeleton Image */}
                  <div style={{
                    width: '100%',
                    height: 236,
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  
                  {/* Skeleton Info */}
                  <div style={{
                    width: '100%',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    {/* Title skeleton */}
                    <div style={{
                      width: '90%',
                      height: 14,
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: 4,
                    }} />
                    <div style={{
                      width: '70%',
                      height: 14,
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: 4,
                    }} />
                    {/* Price skeleton */}
                    <div style={{
                      width: '50%',
                      height: 16,
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: 4,
                      marginTop: 4,
                    }} />
                  </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((product) => {
                const rawImage = product.images?.[0];
                const imageSrc =
                  (typeof rawImage === 'string' && rawImage) ||
                  (rawImage && typeof rawImage === 'object' && (rawImage.url || rawImage.src)) ||
                  product.image ||
                  'https://ik.imagekit.io/jrstupuke/placeholder.png';
                const ratingValue = Math.round(product.averageRating || product.rating || 0);
                const reviewCount = product.ratingCount || product.reviewCount || product.reviews || 0;
                return (
                  <Link
                    className="carousel-product-card"
                    key={product.slug || product.id || product.name}
                    href={`/product/${product.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'block' }}
                  >
                  <div
                    style={{
                      width: '100%',
                      background: '#fff',
                      borderRadius: 8,
                      padding: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      border: '1px solid #f0f0f0',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Next Day Delivery Badge */}
                    {product.nextDayDelivery && (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 20,
                        background: '#ff6b35',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}>
                        Next Day
                      </span>
                    )}

                    {/* Product Image */}
                    <div style={{
                      width: '100%',
                      height: 236,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      borderBottom: '1px solid #ffffff',
                      overflow: 'hidden',
                      position: 'relative',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}>
                      <Image
                        src={imageSrc}
                        alt={product.name}
                        width={180}
                        height={180}
                        unoptimized
                        style={{ 
                          objectFit: 'contain', 
                          maxHeight: '100%', 
                          maxWidth: '100%',
                          pointerEvents: 'none', 
                          userSelect: 'none',
                          padding: '8px',
                        }}
                        onError={(e) => {
                          if (e.currentTarget.src !== 'https://ik.imagekit.io/jrstupuke/placeholder.png') {
                            e.currentTarget.src = 'https://ik.imagekit.io/jrstupuke/placeholder.png';
                          }
                        }}
                        draggable={false}
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div style={{
                      width: '100%',
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 94,
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#222',
                        marginBottom: 6,
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3,
                      }}>
                        {product.name}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        width: '100%',
                        marginBottom: 6,
                      }}>
                        {[...Array(5)].map((_, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: 10,
                              color: index < ratingValue ? '#facc15' : '#d1d5db',
                              lineHeight: 1,
                            }}
                          >
                            ★
                          </span>
                        ))}
                        <span style={{
                          fontSize: 10,
                          color: '#7a7a7a',
                          marginLeft: 4,
                        }}>
                          ({reviewCount})
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: '#666',
                        fontWeight: 600,
                        marginTop: 4,
                      }}>
                        From <span style={{fontWeight: 700, color: '#a51010ff'}}>₹{product.price}</span>
                      </div>
                    </div>
                  </div>
                  </Link>
                );
              })
            ) : (
              <div style={{
                width: '100%',
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999',
              }}>
                No products available
              </div>
            )}
          </div>

          {/* Left Arrow Button */}
          {showPrevArrow && (
            <button
              className="prev-arrow-button"
              onClick={scrollPrev}
              style={{
                position: 'absolute',
                left: -30,
                top: '45%',
                transform: 'translateY(-50%)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 10,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
              }}
            >
              <ChevronRight size={20} color="#666" strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}

          {/* Next Arrow Button */}
          {showNextArrow && (
            <button
              className="next-arrow-button"
              onClick={scrollNext}
              style={{
                position: 'absolute',
                right: -30,
                top: '45%',
                transform: 'translateY(-50%)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 10,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
              }}
            >
              <ChevronRight size={20} color="#666" strokeWidth={2.5} />
            </button>
          )}
        </div>

      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .carousel-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .carousel-scroll::-webkit-scrollbar {
          display: none;
        }

        .carousel-product-card {
          min-width: 220px;
          max-width: 220px;
          width: 220px;
          flex: 0 0 auto;
        }

        @media (min-width: 1280px) {
          .carousel-product-card {
            min-width: calc((100% - 40px) / 6) !important;
            max-width: calc((100% - 40px) / 6) !important;
            width: calc((100% - 40px) / 6) !important;
          }
        }

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .carousel-container {
            flex-direction: column !important;
            padding: 0 16px !important;
          }
          
          .carousel-wrapper {
            min-height: auto !important;
          }
          
          .carousel-title {
            font-size: 22px !important;
            margin-bottom: 16px !important;
          }
          
          .carousel-scroll {
            max-width: 100% !important;
            gap: 12px !important;
          }
          
          .banner-container {
            display: none !important;
          }
          
          .prev-arrow-button,
          .next-arrow-button {
            display: none !important;
          }
        }

        @media (max-width: 1366px) {
          .carousel-container {
            max-width: 1400px !important;
            gap: 10px !important;
          }

          .carousel-product-card {
            min-width: 200px !important;
            max-width: 200px !important;
            width: 200px !important;
          }

        }

        @media (max-width: 1100px) {
          .carousel-product-card {
            min-width: 180px !important;
            max-width: 180px !important;
            width: 180px !important;
          }
        }

        @media (max-width: 480px) {
          .carousel-title {
            font-size: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrapperStyle = {
  position: "relative",
  width: "100%",
  marginTop: 30,
  maxWidth: 1440,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: 0,
  paddingRight: 0,
  paddingBottom: 40,
};

const carousel = {
  display: "flex",
  gap: 0,
  overflowX: "auto",
  paddingBottom: 10,
  alignItems: "flex-start",
};
