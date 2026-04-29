'use client'
import { useSelector } from "react-redux";
import { useMemo, useEffect, useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useLocationTracking } from "@/lib/useLocationTracking";

// Critical above-the-fold components - load immediately
import Hero from "@/components/Hero";
import HomeCategories from "@/components/HomeCategories";
import LatestProducts from "@/components/LatestProducts";
import HeroBannerSlider from "@/components/HeroBannerSlider";
import MobileBannerSlider from "@/components/MobileBannerSlider";
import RecentSearchProducts from "@/components/RecentSearchProducts";
import RecommendedProducts from "@/components/RecommendedProducts";
import HighDiscountCarousel from "@/components/HighDiscountCarousel";

const MobileDesktopBannerWrapper = () => {
  const [showFallback, setShowFallback] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);

  const handleMobileBannerNoData = () => {
    console.log('[Banner] Mobile banner has no data, showing desktop banner as fallback on mobile');
    setShowFallback(true);
  };

  const handleMobileBannerLoaded = () => {
    setMobileLoaded(true);
  };

  return (
    <>
      {/* Mobile Banner with Fallback - Only show desktop banner if mobile banner has NO data */}
      <div className="md:hidden">
        <MobileBannerSlider 
          onNoData={handleMobileBannerNoData} 
          onLoaded={handleMobileBannerLoaded}
        />
        {/* Desktop banner fallback - only show if mobile banner loaded but has no data */}
        {showFallback && mobileLoaded && (
          <HeroBannerSlider />
        )}
      </div>

      {/* Desktop Banner - Always show on desktop only */}
      <div className="hidden md:block">
        <HeroBannerSlider />
      </div>
    </>
  );
};

const BannerSliderSkeleton = () => (
    <div className="max-w-[1280px] mx-auto w-full px-4 py-4">
        <div className="w-full h-[120px] sm:h-[150px] md:h-[180px] rounded-lg bg-gray-200 animate-pulse" />
    </div>
);

const CarouselSliderSkeleton = () => (
    <div className="max-w-[1280px] mx-auto w-full px-4 py-6">
        <div className="mb-4 h-8 w-80 max-w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, index) => (
                <div key={`carousel-skeleton-${index}`} className="rounded-2xl border border-gray-100 overflow-hidden bg-white animate-pulse">
                    <div className="w-full aspect-square bg-gray-200" />
                    <div className="p-3 space-y-2">
                        <div className="h-4 w-5/6 rounded bg-gray-200" />
                        <div className="h-5 w-1/2 rounded bg-gray-200" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const BannerSlider = dynamic(() => import("@/components/BannerSlider"), {
    ssr: true,
    loading: () => <BannerSliderSkeleton />,
});
const CarouselSlider = dynamic(() => import("@/components/CarouselSlider"), {
    ssr: false,
    loading: () => <CarouselSliderSkeleton />,
});
const Section3 = dynamic(() => import("@/components/section3"), { ssr: false });
const Section4 = dynamic(() => import("@/components/section4"), { ssr: false });
// const OriginalBrands = dynamic(() => import("@/components/OriginalBrands"), { ssr: false });
const QuickFyndCategoryDirectory = dynamic(() => import("@/components/QuickFyndCategoryDirectory"), { ssr: false });
const KeywordPills = dynamic(() => import("@/components/KeywordPills"), { ssr: false });

export default function Home() {
    const products = useSelector(state => state.product.list);
    const [section4Data, setSection4Data] = useState([]);
    const [section4Loading, setSection4Loading] = useState(true);

    // Track customer location
    useLocationTracking();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setSection4Loading(true);
                const featuredRes = await axios.get('/api/public/featured-sections').catch(() => ({ data: { sections: [] } }));
                setSection4Data(featuredRes.data.sections || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                setSection4Data([]);
            } finally {
                setSection4Loading(false);
            }
        };
        fetchData();
    }, []);

    const categorySections = useMemo(() => {
        const categories = [...new Set(products.map(p => (p.category || '').toLowerCase()))];

        return categories.slice(0, 4).map(category => ({
            title: `Top Deals on ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            products: products.filter(p => (p.category || '').toLowerCase() === category),
            viewAllLink: `/shop?category=${category}`
        }));
    }, [products]);

    return (
        <>
                {/* <HomeCategories /> */}
                <MobileDesktopBannerWrapper />
                {/* <Hero /> */}
                <LatestProducts />
                                     <HighDiscountCarousel />

                <CarouselSlider/>
                <BannerSlider/>
            
                <Section3/>
   
            {/* Featured Sections - Display all created sliders from category-slider */}
            {section4Loading ? (
                <div className="max-w-[1280px] mx-auto w-full px-4 py-8">
                    <div className="mb-6 h-7 w-64 rounded-md bg-gray-200 animate-pulse" />
                    <div className="flex gap-3 sm:gap-4 overflow-hidden">
                        {[...Array(5)].map((_, idx) => (
                            <div
                                key={`section4-skeleton-${idx}`}
                                className="flex-shrink-0 w-56 sm:w-64 bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse"
                            >
                                <div className="w-full h-56 sm:h-64 bg-gray-100" />
                                <div className="p-4 space-y-2.5">
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                    <div className="h-4 bg-gray-100 rounded w-5/6" />
                                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : section4Data.length > 0 ? (
                <div className="max-w-[1280px] mx-auto w-full">
                    <Section4 sections={section4Data} />
                </div>
            ) : null}

                {/* Personalized sections for returning customers */}
                <RecentSearchProducts />
                <RecommendedProducts />

            {/* <OriginalBrands/> */}
            {/* <QuickFyndCategoryDirectory/>
            <KeywordPills /> */}
        </>
    );

}
