"use client"

import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useSelector } from "react-redux";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";

const AUTOPLAY_MS = 3000;
const COLOR_ROTATE_MS = 10 * 10 * 1000;
const HOURLY_BG_COLORS = ["#691223", "#262626", "#E6003E"];
const SWIPE_THRESHOLD = 40;
const BRAND_COLORS = {
  red: "#E6003E",
  darkRed: "#691223",
  lightPeach: "#E8DDD9",
  darkGrey: "#262626",
  white: "#FFFFFF",
};

const getHourlyBgColor = () => HOURLY_BG_COLORS[new Date().getHours() % HOURLY_BG_COLORS.length];

const parseAmount = (value) => {
  const num = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isNaN(num) ? 0 : num;
};

const getSalePrice = (product) =>
  parseAmount(
    product.price ??
      product.salePrice ??
      product.sale_price ??
      product.discountedPrice ??
      product.discounted_price
  );

const getMrpPrice = (product) =>
  parseAmount(
    product.mrp ??
      product.compareAtPrice ??
      product.compare_at_price ??
      product.originalPrice ??
      product.original_price ??
      product.listPrice ??
      product.list_price
  );

const getImageSrc = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }
  return "https://ik.imagekit.io/jrstupuke/placeholder.png";
};

export default function HighDiscountCarousel() {
  const products = useSelector((state) => state.product.list || []);
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);
  const [apiProducts, setApiProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hourlyBgColor, setHourlyBgColor] = useState(HOURLY_BG_COLORS[0]);
  const [dragStartX, setDragStartX] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const { data } = await axios.get("/api/products?limit=200");
        setApiProducts(Array.isArray(data?.products) ? data.products : []);
      } catch (error) {
        console.error("Failed to fetch products for high discount carousel:", error);
        setApiProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const updateBg = () => setHourlyBgColor(getHourlyBgColor());
    updateBg();

    const timer = setInterval(updateBg, COLOR_ROTATE_MS);
    return () => clearInterval(timer);
  }, [mounted]);

  const sourceProducts = apiProducts.length > 0 ? apiProducts : products;

  const discountProducts = useMemo(() => {
    return sourceProducts
      .map((product) => {
        const salePrice = getSalePrice(product);
        const mrpPrice = getMrpPrice(product);
        const discount =
          mrpPrice > salePrice && salePrice > 0
            ? Math.round(((mrpPrice - salePrice) / mrpPrice) * 100)
            : 0;
        return { ...product, salePrice, mrpPrice, discount };
      })
      .filter(
        (product) =>
          product.inStock !== false &&
          product.salePrice > 0 &&
          product.mrpPrice > product.salePrice &&
          product.discount > 55
      )
      .slice(0, 20);
  }, [sourceProducts]);

  const shouldSlide = discountProducts.length > visibleCount;
  const cardWidth = `${100 / visibleCount}%`;
  const maxIndex = Math.max(discountProducts.length - visibleCount, 0);

  const goNext = () => {
    if (!shouldSlide) return;
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const goPrev = () => {
    if (!shouldSlide) return;
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleDragStart = (clientX) => {
    if (!shouldSlide || typeof clientX !== "number") return;
    setDragStartX(clientX);
  };

  const handleDragEnd = (clientX) => {
    if (!shouldSlide || dragStartX === null || typeof clientX !== "number") return;

    const deltaX = clientX - dragStartX;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) goNext();
      if (deltaX > 0) goPrev();
    }

    setDragStartX(null);
  };

  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 640) {
        setVisibleCount(2);
      } else if (window.innerWidth < 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(5);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);

    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  useEffect(() => {
    if (discountProducts.length <= visibleCount) {
      setCurrentIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, AUTOPLAY_MS);

    return () => clearInterval(timer);
  }, [discountProducts.length, visibleCount, maxIndex]);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [visibleCount, discountProducts.length, currentIndex, maxIndex]);

  const renderSkeleton = () => (
    <section className="max-w-[1250px] mx-auto px-3 sm:px-6 mt-2 mb-8">
      <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: hourlyBgColor }}>
        <div className="mb-3 h-7 w-48 rounded-md animate-pulse" style={{ backgroundColor: BRAND_COLORS.lightPeach }} />
        <div className="overflow-hidden rounded-xl p-2 sm:p-3" style={{ backgroundColor: BRAND_COLORS.lightPeach }}>
          <div className="flex">
            {Array.from({ length: visibleCount }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="block shrink-0"
                style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
              >
                <div className="px-1.5 sm:px-2 h-full">
                  <div className="h-full rounded-xl overflow-hidden border shadow-sm flex flex-col animate-pulse" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.lightPeach }}>
                    <div className="w-full aspect-[4/3]" style={{ backgroundColor: BRAND_COLORS.lightPeach }} />
                    <div className="p-2 sm:p-3 space-y-2">
                      <div className="h-4 rounded" style={{ backgroundColor: BRAND_COLORS.lightPeach }} />
                      <div className="h-4 w-3/4 rounded" style={{ backgroundColor: BRAND_COLORS.lightPeach }} />
                      <div className="h-5 w-1/2 rounded" style={{ backgroundColor: BRAND_COLORS.lightPeach }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  if (!mounted) return null;

  if (loadingProducts) {
    return renderSkeleton();
  }

  if (!loadingProducts && discountProducts.length === 0) {
    return (
      <section className="max-w-[1250px] mx-auto px-3 sm:px-6 mt-6">
        <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: hourlyBgColor }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: BRAND_COLORS.white }}>Mega 50% OFF Sale</h2>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: BRAND_COLORS.lightPeach, color: BRAND_COLORS.darkGrey }}>
            No products above 50% OFF right now.
          </div>
        </div>
      </section>
    );
  }

  if (discountProducts.length === 0) return null;

  return (
    <section className="max-w-[1250px] mx-auto px-3 sm:px-6 mt-2 mb-8">
      <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: hourlyBgColor }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold" style={{ color: BRAND_COLORS.white }}>Mega 75% OFF Sale</h2>
          {shouldSlide && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="h-12 w-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-md border-2 border-white hover:scale-105 transition"
                style={{ backgroundColor: BRAND_COLORS.white, color: BRAND_COLORS.darkRed, padding: 0 }}
                aria-label="Previous products"
              >
                <span className="flex items-center justify-center w-full h-full" style={{ fontSize: '2rem', lineHeight: 1 }}>
                  <FaChevronLeft />
                </span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="h-12 w-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-md border-2 border-white hover:scale-105 transition"
                style={{ backgroundColor: BRAND_COLORS.white, color: BRAND_COLORS.darkRed, padding: 0 }}
                aria-label="Next products"
              >
                <span className="flex items-center justify-center w-full h-full" style={{ fontSize: '2rem', lineHeight: 1 }}>
                  <FaChevronRight />
                </span>
              </button>
            </div>
          )}
        </div>
        <div
          className="overflow-hidden rounded-xl p-2 sm:p-3"
          style={{ backgroundColor: BRAND_COLORS.lightPeach }}
          onTouchStart={(event) => handleDragStart(event.touches[0]?.clientX)}
          onTouchEnd={(event) => handleDragEnd(event.changedTouches[0]?.clientX)}
          onMouseDown={(event) => handleDragStart(event.clientX)}
          onMouseUp={(event) => handleDragEnd(event.clientX)}
          onMouseLeave={(event) => {
            if (dragStartX !== null) handleDragEnd(event.clientX);
          }}
        >
          <div
            className={`flex ${shouldSlide ? "transition-transform duration-500 ease-in-out" : "justify-start"}`}
            style={{ transform: `translateX(-${(currentIndex * 100) / visibleCount}%)` }}
          >
            {discountProducts.map((product) => (
              <Link
                key={product._id || product.id || product.slug}
                href={`/product/${product.slug || product._id || ""}`}
                className="block shrink-0"
                style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
              >
                <div className="px-1.5 sm:px-2 h-full">
                  <div className="h-full rounded-xl overflow-hidden border shadow-sm flex flex-col" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.lightPeach }}>
                    <div className="relative w-full aspect-[4/3] bg-slate-100">
                      <Image
                        src={getImageSrc(product)}
                        alt={product.name || "Product"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: BRAND_COLORS.red, color: BRAND_COLORS.white }}>
                        {product.discount}% OFF
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-sm sm:text-[15px] font-medium line-clamp-2 min-h-[2.5rem]" style={{ color: BRAND_COLORS.darkGrey }}>
                        {product.name || "Product"}
                      </p>
                      <p className="text-base sm:text-lg font-bold" style={{ color: BRAND_COLORS.darkRed }}>Up to {product.discount}% OFF</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
