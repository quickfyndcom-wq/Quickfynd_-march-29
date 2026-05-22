"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import Dummy from '../assets/sp.webp';

export default function TopDeals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const PRODUCTS_PER_PAGE = 12;

  const sortLatestFirst = (items) => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();

      if (aTime !== bTime) return bTime - aTime;

      const aId = String(a?._id || a?.id || "");
      const bId = String(b?._id || b?.id || "");
      return bId.localeCompare(aId);
    });
  };

  const isVideoUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return /(\.mp4|\.webm|\.mov|\.m4v|\.avi|\.mkv)(\?|$)/.test(lower) || lower.includes('/video/upload/');
  };

  const resolveMediaUrl = (media) => {
    if (typeof media === "string" && media.trim()) return media;
    if (media && typeof media === "object") {
      const resolved = media.url || media.src;
      if (typeof resolved === "string" && resolved.trim()) return resolved;
    }
    return "";
  };

  const getImageSrc = (images, fallbackImage) => {
    const mediaList = Array.isArray(images) ? images : [];

    // If first media is video, choose a non-video image from the end.
    for (let index = mediaList.length - 1; index >= 0; index -= 1) {
      const mediaUrl = resolveMediaUrl(mediaList[index]);
      if (mediaUrl && !isVideoUrl(mediaUrl)) {
        return mediaUrl;
      }
    }

    const fallbackUrl = resolveMediaUrl(fallbackImage);
    if (fallbackUrl && !isVideoUrl(fallbackUrl)) return fallbackUrl;

    return "https://ik.imagekit.io/jrstupuke/placeholder.png";
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: sectionData }, { data: productData }] = await Promise.all([
          axios.get("/api/admin/home-sections"),
          axios.get("/api/products")
        ]);

        const adminSections = sectionData.sections || [];
        const allProducts = Array.isArray(productData.products || productData)
          ? (productData.products || productData)
          : [];

        const section = adminSections.find((s) => s.category);
        let result = allProducts;

        if (section && section.category) {
          result = allProducts.filter((p) => p.category === section.category);
        }

        setProducts(sortLatestFirst(result));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (products.length <= PRODUCTS_PER_PAGE) {
      setPageIndex(0);
      return;
    }

    const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
    const timer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [products.length]);

  const visibleProducts = useMemo(() => {
    if (products.length <= PRODUCTS_PER_PAGE) return products.slice(0, PRODUCTS_PER_PAGE);

    const start = pageIndex * PRODUCTS_PER_PAGE;
    const page = products.slice(start, start + PRODUCTS_PER_PAGE);

    // Wrap to beginning so each minute still renders a full set.
    if (page.length < PRODUCTS_PER_PAGE) {
      return [...page, ...products.slice(0, PRODUCTS_PER_PAGE - page.length)];
    }

    return page;
  }, [products, pageIndex]);

  return (
    <div className="w-full flex justify-center px-2 sm:px-3 lg:px-4 mt-6 sm:mt-8">
      <div className="w-full max-w-[1700px] flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* LEFT GRID PRODUCTS */}
        <div className="flex-1 w-full">
          <h2 className="text-base sm:text-lg md:text-[28px] font-semibold mb-4 sm:mb-5">Top Deals</h2>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {[...Array(12)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="cursor-pointer text-center flex flex-col items-center"
                >
                  {/* Skeleton Image */}
                  <div
                    className="w-full aspect-square rounded-md"
                    style={{
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                  {/* Skeleton Title */}
                  <div
                    className="h-2 sm:h-3 mx-auto mt-2 sm:mt-3 rounded"
                    style={{
                      width: '80%',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                  {/* Skeleton Price */}
                  <div
                    className="h-2 sm:h-3 mx-auto mt-1.5 sm:mt-2 rounded"
                    style={{
                      width: '60%',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-gray-500 py-8 text-center text-sm sm:text-base">No Deals Found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {visibleProducts.map((item, i) => {
                const img = getImageSrc(item.images, item.image);

                return (
                  <a
                    key={i}
                    href={`/product/${item.slug}`}
                    className="cursor-pointer text-center block group flex flex-col items-center"
                  >
                    <div className="w-full aspect-square bg-gray-50 rounded-md overflow-hidden flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                      <img
                        src={img}
                        alt={item.name}
                        className="h-full w-full object-contain p-2 sm:p-3 group-hover:scale-110 transition-transform duration-200"
                        onError={e => { e.currentTarget.src = "https://ik.imagekit.io/jrstupuke/placeholder.png"; }}
                      />
                    </div>
                    <p className="text-[11px] sm:text-[13px] md:text-[15px] font-medium mt-2 sm:mt-2.5 line-clamp-2 w-full px-1">
                      {item.name}
                    </p>
                    <p className="font-bold text-[10px] sm:text-[12px] md:text-[16px] mt-1 sm:mt-1.5 text-[#E6003E]">
                      From ₹{item.price}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT FIXED BANNER - HIDDEN ON MOBILE */}
        <div className="w-full sm:w-[250px] md:w-[300px] hidden lg:block lg:mt-[56px]">
          {loading ? (
            <div
              className="w-full rounded-lg overflow-hidden"
              style={{
                height: 512,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ) : (
            <div className="w-full h-[512px] rounded-lg shadow overflow-hidden">
              <Image
                src={Dummy}
                alt="Offer Banner"
                className="w-full h-full object-cover"
              />
            </div>
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
      `}</style>
    </div>
  );
}
