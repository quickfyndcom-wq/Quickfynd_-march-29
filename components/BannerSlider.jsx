'use client';
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Banner1 from '../assets/bannersection3/Wide Banner 1.webp';
import Banner2 from '../assets/bannersection3/Banner C.webp';

// Banner data
const banners = [
  { image: Banner2, link: "/category/sofas" },
  { image: Banner1, link: "/category/beds" },
];

const BannerSlider = () => {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  // Auto-slide (responsive speed)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, isMobile ? 3000 : 4000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (i) => setIndex(i);
  const handleClick = (link) => link && router.push(link);

  return (
  <div className="relative w-full overflow-hidden max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 flex justify-center bg-transparent rounded-none m-0 mt-8 mb-10">
      {/* Slider wrapper */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{
          transform: `translateX(-${index * 100}%)`,
          width: `${banners.length * 100}%`,
        }}
      >
        {banners.map((banner, i) => (
          <div
            key={i}
            // onClick={() => handleClick(banner.link)}
            className="relative cursor-pointer flex-[0_0_100%] overflow-hidden aspect-[4/1] sm:aspect-[16/5] md:aspect-[16/4] lg:aspect-[16/3]"
            style={{
              flex: `0 0 ${100 / banners.length}%`,
              width: `${100 / banners.length}%`,
            }}
          >
            <Image
              src={banner.image}
              alt={`Banner ${i + 1}`}
              fill
              sizes="100vw"
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
              priority
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {banners.map((_, i) => (
          <div
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
              i === index ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerSlider;



