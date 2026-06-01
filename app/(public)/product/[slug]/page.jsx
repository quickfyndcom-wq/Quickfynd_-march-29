"use client"
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import ProductCard from "@/components/ProductCard";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Skeleton Loader Components
const ProductDetailsSkeleton = ({ isFashionLayout = false }) => (
    <div className="bg-gray-50 animate-pulse">
        {/* Breadcrumb bar */}
        <div className="bg-white border-b border-gray-200">
            <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="h-4 bg-slate-200 rounded w-10"></div>
                    <div className="h-3 bg-slate-200 rounded w-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-16"></div>
                    <div className="h-3 bg-slate-200 rounded w-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-48"></div>
                </div>
            </div>
        </div>

        <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 py-6 pb-8">
            <div className={`grid grid-cols-1 ${isFashionLayout ? 'md:grid-cols-2 items-start md:items-stretch' : 'lg:grid-cols-2 items-start lg:items-stretch'} gap-0 lg:gap-8`}>

                {/* LEFT: Thumbnail strip + Main image (desktop) */}
                <div className="space-y-4">
                    {/* Desktop layout */}
                    <div className={isFashionLayout ? 'hidden md:flex gap-2' : 'hidden lg:flex gap-2'}>
                        {/* Vertical thumbnail strip */}
                        <div className="flex flex-col gap-2 w-14 flex-shrink-0">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-14 h-14 bg-slate-200 rounded"></div>
                            ))}
                        </div>
                        {/* Main image */}
                        <div className={`flex-1 bg-slate-200 ${isFashionLayout ? 'rounded-lg aspect-[4/5]' : 'rounded aspect-square'}`}></div>
                    </div>

                    {/* Mobile layout: just the main image */}
                    <div className={isFashionLayout ? 'md:hidden bg-slate-200 rounded-lg aspect-[4/5] w-full' : 'lg:hidden bg-slate-200 rounded-none sm:rounded-lg aspect-square w-full'}></div>
                    {/* Mobile thumbnails */}
                    <div className={isFashionLayout ? 'md:hidden flex gap-2 px-2 sm:px-0' : 'lg:hidden flex gap-2 px-2 sm:px-0'}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-14 h-14 bg-slate-200 rounded flex-shrink-0"></div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Product details */}
                <div className={isFashionLayout ? 'bg-white -mx-4 sm:mx-0 rounded-t-3xl sm:rounded-lg p-4 lg:p-6 space-y-3 mt-2 lg:mt-0 border border-gray-200' : 'bg-white -mx-4 sm:mx-0 rounded-t-3xl sm:rounded-lg p-4 lg:p-6 space-y-5 mt-2 lg:mt-0 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]'}>
                    {/* Title */}
                    <div className="h-7 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                    {/* Rating row */}
                    <div className="flex items-center gap-2">
                        <div className="h-4 bg-slate-200 rounded w-28"></div>
                        <div className="h-4 bg-slate-200 rounded w-10"></div>
                    </div>
                    {/* Price */}
                    <div className="h-8 bg-slate-200 rounded w-32"></div>
                    <div className="flex gap-2">
                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                    {/* Details lines */}
                    <div className="space-y-2 pt-2">
                        <div className="h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                    </div>
                    <div className="h-28 bg-slate-200 rounded-lg w-full"></div>
                    {/* Action buttons */}
                    <div className="h-12 bg-slate-200 rounded-lg w-full mt-2"></div>
                    {isFashionLayout && <div className="h-12 bg-slate-200 rounded-lg w-full"></div>}
                </div>
            </div>
        </div>
    </div>
);

const ProductDescriptionSkeleton = () => (
    <div className="animate-pulse max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 space-y-4 mt-8 pb-8">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </div>
    </div>
);

const RelatedProductsSkeleton = () => (
    <div className="px-4 mt-12 mb-16">
        <div className="h-8 bg-slate-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                    <div className="bg-slate-200 rounded-lg h-48 mb-3"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
            ))}
        </div>
    </div>
);

export default function ProductBySlug() {
    const { slug } = useParams();
    const [isHydrated, setIsHydrated] = useState(false);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const products = useSelector(state => state.product.list);
    const cachedProduct = products.find((item) => item?.slug === slug);
    const skeletonIsFashionLayout = Boolean(
        product?.fashionLayoutEnabled ?? (isHydrated ? cachedProduct?.fashionLayoutEnabled : false)
    );

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const getCategoryCandidates = (baseProduct) => {
        const values = [];

        const addValue = (value) => {
            if (!value) return;
            if (typeof value === 'string') {
                values.push(value.trim());
                return;
            }
            if (typeof value === 'object') {
                if (value.slug) values.push(String(value.slug).trim());
                if (value.name) values.push(String(value.name).trim());
            }
        };

        addValue(baseProduct?.category);
        if (Array.isArray(baseProduct?.categories)) {
            baseProduct.categories.forEach(addValue);
        }

        return [...new Set(values.filter(Boolean))];
    };

    const getProductSearchText = (item) => {
        if (!item) return '';

        const parts = [];
        if (item?.name) parts.push(String(item.name));
        if (item?.category) parts.push(String(item.category));
        if (Array.isArray(item?.categories)) {
            item.categories.forEach((value) => {
                if (!value) return;
                if (typeof value === 'string') {
                    parts.push(value);
                    return;
                }
                if (typeof value === 'object') {
                    if (value.name) parts.push(String(value.name));
                    if (value.slug) parts.push(String(value.slug));
                }
            });
        }
        if (Array.isArray(item?.tags)) {
            item.tags.forEach((tag) => {
                if (tag) parts.push(String(tag));
            });
        }

        return parts.join(' ').toLowerCase();
    };

    const detectFashionGender = (item) => {
        const text = getProductSearchText(item);

        const isWomen = /\bwomen\b|\bwomens\b|\bwomen's\b|\bfemale\b|\bgirls\b|\bladies\b/.test(text);
        const isMen = /\bmen\b|\bmens\b|\bmen's\b|\bmale\b|\bboys\b|\bgents\b/.test(text);

        if (isWomen && !isMen) return 'women';
        if (isMen && !isWomen) return 'men';
        return null;
    };

    const pickRelatedProducts = (list, baseProduct, limit = 5) => {
        if (!Array.isArray(list) || !baseProduct) return [];

        const baseSlug = baseProduct.slug;
        const baseId = String(baseProduct._id || baseProduct.id || '');
        const baseCategories = new Set(getCategoryCandidates(baseProduct).map((v) => v.toLowerCase()));
        const baseIsFashion = Boolean(baseProduct?.fashionLayoutEnabled);
        const baseFashionGender = baseIsFashion ? detectFashionGender(baseProduct) : null;

        const scored = list
            .filter((item) => {
                const itemSlug = item?.slug;
                const itemId = String(item?._id || item?.id || '');
                const inStock = item?.inStock !== false;
                if (!inStock || itemSlug === baseSlug || itemId === baseId) return false;

                // On fashion PDP, recommendations must stay in fashion catalog only.
                if (baseIsFashion && !item?.fashionLayoutEnabled) return false;

                return true;
            })
            .map((item) => {
                const itemCategories = new Set(getCategoryCandidates(item).map((v) => v.toLowerCase()));
                const hasCategoryMatch = [...itemCategories].some((cat) => baseCategories.has(cat));
                const itemGender = detectFashionGender(item);
                const sameGenderPriority = baseFashionGender && itemGender === baseFashionGender ? 1 : 0;

                // Keep category relevance strongest, then prioritize same gender in fashion pages.
                return { item, score: (hasCategoryMatch ? 10 : 0) + sameGenderPriority };
            })
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.item);

        return scored.slice(0, limit);
    };

    const fetchRelatedProducts = async (baseProduct) => {
        if (!baseProduct) {
            setRelatedProducts([]);
            return;
        }

        setLoadingRelated(true);
        try {
            let related = [];

            if (products.length > 0) {
                related = pickRelatedProducts(products, baseProduct, 5);
            }

            if (related.length === 0) {
                const categoryCandidates = getCategoryCandidates(baseProduct);
                for (const category of categoryCandidates) {
                    const { data } = await axios.get(`/api/products?category=${encodeURIComponent(category)}&limit=20`);
                    const apiProducts = data?.products || [];
                    related = pickRelatedProducts(apiProducts, baseProduct, 5);
                    if (related.length > 0) break;
                }
            }

            if (related.length === 0) {
                const { data } = await axios.get('/api/products?limit=20');
                related = pickRelatedProducts(data?.products || [], baseProduct, 5);
            }

            setRelatedProducts(related);
        } catch (error) {
            console.error('Error fetching related products:', error);
            setRelatedProducts([]);
        } finally {
            setLoadingRelated(false);
        }
    };

    const fetchProduct = async () => {
        setLoading(true);
        try {
            let found = products.find((product) => product.slug === slug);
            
            // If the Redux product is missing variants or newer layout flags, refetch from backend to get full data
            const needsFresh =
                !found ||
                !Array.isArray(found.variants) || found.variants.length === 0 ||
                typeof found.fashionLayoutEnabled === 'undefined';
            
            if (needsFresh) {
                try {
                    const { data } = await axios.get(`/api/products/by-slug?slug=${encodeURIComponent(slug)}`);
                    found = data.product || found || null;
                } catch (refreshError) {
                    // Keep Redux-cached product when backend slug lookup returns 404.
                    if (axios.isAxiosError(refreshError) && refreshError.response?.status === 404) {
                        found = found || null;
                    } else {
                        throw refreshError;
                    }
                }
            }
            
            setProduct(found);
            await fetchRelatedProducts(found);
        } catch (error) {
            console.error('Error fetching product:', error);
            setProduct(null);
        } finally {
            setLoading(false);
        }
    }

    const fetchReviews = async (productId) => {
        if (!productId) return;
        setLoadingReviews(true);
        try {
            const { data } = await axios.get(`/api/review?productId=${productId}`);
            setReviews(data.reviews || []);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => {
        if (slug) {
            fetchProduct();
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [slug]);

    useEffect(() => {
        const productId = product?._id || product?.id;
        if (productId) {
            fetchReviews(productId);
        }
    }, [product?._id, product?.id]);

    useEffect(() => {
        if (!product || products.length === 0) return;
        const related = pickRelatedProducts(products, product, 5);
        if (related.length > 0) {
            setRelatedProducts(related);
        }
    }, [products, product?._id, product?.slug, product?.fashionLayoutEnabled]);

    // Track browse history for signed-in users and localStorage for guests
    useEffect(() => {
        const productId = product?._id || product?.id;
        if (!productId) return;

        let unsubscribe;

        const trackView = async (user) => {
            if (user) {
                // Logged in - save to database
                try {
                    const token = await user.getIdToken();
                    await axios.post('/api/browse-history', 
                        { productId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (error) {
                    // Silent fail - don't interrupt user experience
                }
            } else {
                // Guest - save to localStorage
                try {
                    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                    // Remove if already exists and add to front
                    const filtered = viewed.filter(id => id !== productId);
                    filtered.unshift(productId);
                    // Keep only 20 most recent
                    localStorage.setItem('recentlyViewed', JSON.stringify(filtered.slice(0, 20)));
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                }
            }
        };

        unsubscribe = onAuthStateChanged(auth, trackView);

        return () => unsubscribe?.();
    }, [product?._id, product?.id]);

    return (
        <div className="w-full">
            <div className={product?.fashionLayoutEnabled ? 'max-w-[1700px] mx-auto px-1 sm:px-2 lg:px-3 pb-8 sm:pb-24 lg:pb-0' : 'max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 pb-8 sm:pb-24 lg:pb-0'}>
                {/* Product Details */}
                {loading ? (
                    <>
                        <ProductDetailsSkeleton isFashionLayout={skeletonIsFashionLayout} />
                        {!skeletonIsFashionLayout && <ProductDescriptionSkeleton />}
                        <RelatedProductsSkeleton />
                    </>
                ) : product ? (
                    <>
                        <ProductDetails
                            product={product}
                            reviews={reviews}
                            loadingReviews={loadingReviews}
                            rightColumnContent={
                                product?.fashionLayoutEnabled ? (
                                    <ProductDescription
                                        product={product}
                                        reviews={reviews || []}
                                        loadingReviews={loadingReviews}
                                        onReviewAdded={() => fetchReviews(product._id || product.id)}
                                        embedded={true}
                                    />
                                ) : null
                            }
                        />
                        {!product?.fashionLayoutEnabled && (
                            <ProductDescription
                                product={product}
                                reviews={reviews || []}
                                loadingReviews={loadingReviews}
                                onReviewAdded={() => fetchReviews(product._id || product.id)}
                            />
                        )}
                        {/* Related Products */}
                        {loadingRelated ? (
                            <RelatedProductsSkeleton />
                        ) : relatedProducts.length > 0 && (
                            <div className="px-4 mt-12 mb-4 sm:mb-16">
                                <h2 className="text-2xl font-semibold text-slate-800 mb-6">Recommended Products</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                    {relatedProducts.map((prod) => (
                                        <ProductCard key={prod._id || prod.id || prod.slug} product={prod} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="text-slate-400 text-lg">Product not found.</div>
                        <p className="text-slate-500 text-sm mt-2">The product you're looking for doesn't exist or has been removed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
