'use client'

import { StarIcon, Share2Icon, HeartIcon, MinusIcon, PlusIcon, ShoppingCartIcon, ZoomInIcon, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import { addToCart, uploadCart } from "@/lib/features/cart/cartSlice";
import MobileProductActions from "./MobileProductActions";
import { useAuth } from '@/lib/useAuth';
import { trackMetaEvent } from "@/lib/metaPixelClient";
import { trackCustomerBehaviorEvent } from "@/lib/customerBehaviorTracking";

const PLACEHOLDER_IMAGE = 'https://ik.imagekit.io/jrstupuke/placeholder.png';

const resolveMediaUrl = (media) => {
  if (typeof media === 'string' && media.trim()) return media;
  if (media && typeof media === 'object') {
    const direct = media.url || media.src || media.thumbnailUrl;
    if (typeof direct === 'string' && direct.trim()) return direct;
  }
  return '';
};

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
};

const ProductDetails = ({ product, reviews = [], hideTitle = false, offerData = null }) => {
  // Assume product loading state from redux if available
  const loading = useSelector(state => state.product?.status === 'loading');
  const currency = '₹';
  const [mainImage, setMainImage] = useState(resolveMediaUrl(product.images?.[0]) || PLACEHOLDER_IMAGE);
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showWishlistToast, setShowWishlistToast] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState('');
  const [showCartToast, setShowCartToast] = useState(false);
  const [isOrderingNow, setIsOrderingNow] = useState(false);
  const [selectedOfferKey, setSelectedOfferKey] = useState('cashback');
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [expandedOfferIndex, setExpandedOfferIndex] = useState(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewZoom, setQuickViewZoom] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [deliveryAddressLoading, setDeliveryAddressLoading] = useState(false);
  const { user, loading: authLoading, getToken } = useAuth();
  const isSignedIn = Boolean(user);
  const userId = user?.uid || null;
  const router = useRouter();
  const dispatch = useDispatch();
  const cartCount = useSelector((state) => state.cart.total);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const pageEnterAtRef = useRef(Date.now());
  const maxScrollDepthRef = useRef(0);
  const nextActionRef = useRef('viewing');
  const lastTrackedProductIdRef = useRef('');
  const exitSentRef = useRef(false);

  const emitBehaviorEvent = (eventType, extra = {}) => {
    const storeId = String(product?.storeId || '').trim();
    if (!storeId || !product?._id) return;

    const providerProfile = Array.isArray(user?.providerData) ? user.providerData.find(Boolean) : null;
    const customerName = String(user?.displayName || providerProfile?.displayName || '').trim();
    const customerEmail = String(user?.email || providerProfile?.email || '').trim().toLowerCase();
    const customerPhone = String(user?.phoneNumber || providerProfile?.phoneNumber || '').trim();

    trackCustomerBehaviorEvent({
      storeId,
      userId,
      customerType: userId ? 'logged_in' : 'guest',
      customerName,
      customerEmail,
      customerPhone,
      eventType,
      productId: String(product._id),
      productSlug: String(product.slug || ''),
      productName: String(product.name || ''),
      ...extra,
    });
  };

  const openQuickView = () => {
    setQuickViewZoom(1);
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewZoom(1);
  };

  // FBT (Frequently Bought Together) state
  const [fbtProducts, setFbtProducts] = useState([]);
  const [fbtEnabled, setFbtEnabled] = useState(false);
  const [fbtBundlePrice, setFbtBundlePrice] = useState(0);
  const [fbtBundleDiscount, setFbtBundleDiscount] = useState(0);
  const [selectedFbtProducts, setSelectedFbtProducts] = useState({});
  const [loadingFbt, setLoadingFbt] = useState(false);

  // Review state and fetching logic
  const [fetchedReviews, setFetchedReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [sameTagProducts, setSameTagProducts] = useState([]);
  const [loadingSameTagProducts, setLoadingSameTagProducts] = useState(false);

  // Use fetched reviews if available, else prop
  const reviewsToUse = fetchedReviews.length > 0 ? fetchedReviews : reviews;
  const averageRating = reviewsToUse.length > 0
    ? reviewsToUse.reduce((acc, item) => acc + (item.rating || 0), 0) / reviewsToUse.length
    : (typeof product.averageRating === 'number' ? product.averageRating : 0);

  const reviewCount = reviewsToUse.length > 0
    ? reviewsToUse.length
    : (typeof product.ratingCount === 'number' ? product.ratingCount : 0);

  const normalizedCurrentTags = Array.isArray(product?.tags)
    ? [...new Set(product.tags
        .map((tag) => String(tag || '').trim().toLowerCase())
        .filter(Boolean))].slice(0, 3)
    : [];

  useEffect(() => {
    if (!product?._id) return;
    if (typeof window === 'undefined') return;

    const eventKey = `meta_viewcontent_sent_${String(product._id)}`;
    if (sessionStorage.getItem(eventKey)) return;

    trackMetaEvent('ViewContent', {
      content_type: 'product',
      content_ids: [String(product._id)],
      content_name: product.name || product.title || 'Product',
      value: Number(product.price || 0),
      currency: 'INR',
    });

    sessionStorage.setItem(eventKey, '1');
  }, [product?._id, product?.name, product?.title, product?.price]);

  useEffect(() => {
    if (!product?._id || !product?.storeId) return;

    const currentProductId = String(product._id);
    pageEnterAtRef.current = Date.now();
    maxScrollDepthRef.current = 0;
    nextActionRef.current = 'viewing';
    exitSentRef.current = false;

    if (lastTrackedProductIdRef.current !== currentProductId) {
      lastTrackedProductIdRef.current = currentProductId;
      emitBehaviorEvent('product_view', {
        nextAction: 'viewing',
      });
    }

    const handleScroll = () => {
      const doc = document.documentElement;
      const total = Math.max((doc.scrollHeight || 0) - window.innerHeight, 1);
      const current = Math.max(window.scrollY || 0, 0);
      const depth = Math.min(100, Math.round((current / total) * 100));
      if (depth > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = depth;
      }
    };

    const sendExit = () => {
      if (exitSentRef.current) return;
      exitSentRef.current = true;
      const durationMs = Math.max(Date.now() - pageEnterAtRef.current, 0);
      emitBehaviorEvent('product_exit', {
        durationMs,
        scrollDepthPercent: maxScrollDepthRef.current,
        nextAction: nextActionRef.current,
        useBeacon: true,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', sendExit);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', sendExit);
      sendExit();
    };
  }, [product?._id, product?.storeId]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const { data } = await axios.get(`/api/review?productId=${product._id}`);
        setFetchedReviews(data.reviews || []);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [product._id]);

  useEffect(() => {
    const fetchSameTagProducts = async () => {
      if (!product?._id || normalizedCurrentTags.length === 0) {
        setSameTagProducts([]);
        return;
      }

      try {
        setLoadingSameTagProducts(true);
        const { data } = await axios.get('/api/products?limit=120&includeOutOfStock=true');
        const productsList = Array.isArray(data?.products) ? data.products : [];

        const related = productsList
          .filter((item) => String(item?._id) !== String(product._id))
          .map((item) => {
            const itemTags = Array.isArray(item?.tags)
              ? item.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)
              : [];
            const matchingCount = itemTags.filter((tag) => normalizedCurrentTags.includes(tag)).length;
            return { ...item, matchingCount };
          })
          .filter((item) => item.matchingCount > 0)
          .sort((a, b) => {
            if (b.matchingCount !== a.matchingCount) return b.matchingCount - a.matchingCount;
            return Number(b.createdAt ? new Date(b.createdAt).getTime() : 0) - Number(a.createdAt ? new Date(a.createdAt).getTime() : 0);
          })
          .slice(0, 6);

        setSameTagProducts(related);
      } catch (error) {
        console.error('Failed to fetch same-tag products:', error);
        setSameTagProducts([]);
      } finally {
        setLoadingSameTagProducts(false);
      }
    };

    fetchSameTagProducts();
  }, [product?._id, normalizedCurrentTags.join('|')]);

  useEffect(() => {
    let isMounted = true;

    const fetchDeliveryAddress = async () => {
      if (!isSignedIn) {
        if (isMounted) {
          setDeliveryAddress(null);
          setDeliveryAddressLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setDeliveryAddressLoading(true);
        const token = await getToken?.();
        if (!token) {
          if (isMounted) setDeliveryAddress(null);
          return;
        }

        const { data } = await axios.get('/api/address', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
        const primaryAddress =
          addresses.find((addr) => addr?.isDefault || addr?.default || addr?.primary || addr?.isPrimary) ||
          addresses[0] ||
          null;
        if (isMounted) setDeliveryAddress(primaryAddress);
      } catch {
        if (isMounted) setDeliveryAddress(null);
      } finally {
        if (isMounted) setDeliveryAddressLoading(false);
      }
    };

    fetchDeliveryAddress();

    return () => {
      isMounted = false;
    };
  }, [isSignedIn, userId, getToken]);

  // Fetch FBT products
  useEffect(() => {
    const fetchFbtProducts = async () => {
      // Only fetch if product has a valid ID
      if (!product?._id) {
        console.warn('No product ID available for FBT fetch');
        return;
      }
      
      try {
        setLoadingFbt(true);
        const { data } = await axios.get(`/api/products/${product._id}/fbt`);
        if (data.enableFBT && data.products && data.products.length > 0) {
          setFbtEnabled(true);
          setFbtProducts(data.products);
          setFbtBundlePrice(data.bundlePrice);
          setFbtBundleDiscount(data.bundleDiscount || 0);
          
          // Initially select all FBT products
          const initialSelection = {};
          data.products.forEach(p => {
            initialSelection[p._id] = true;
          });
          setSelectedFbtProducts(initialSelection);
        }
      } catch (error) {
        console.error('Failed to fetch FBT products:', error);
        // Silently fail - FBT is optional feature
      } finally {
        setLoadingFbt(false);
      }
    };
    
    fetchFbtProducts();
  }, [product._id]);

  // Variants support
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const bulkVariants = variants.filter(v => v?.options && (v.options.bundleQty || v.options.bundleQty === 0));
  const sortedBulkVariants = bulkVariants.slice().sort((a, b) => Number(a.options.bundleQty) - Number(b.options.bundleQty));
  const variantColors = [...new Set(variants.map(v => v.options?.color).filter(Boolean))];
  const variantSizes = [...new Set(variants.map(v => v.options?.size).filter(Boolean))];
  const [selectedColor, setSelectedColor] = useState(variantColors[0] || product.colors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(variantSizes[0] || product.sizes?.[0] || null);
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(sortedBulkVariants.length ? 0 : null);

  const selectedVariant = (bulkVariants.length
    ? (selectedBundleIndex !== null ? (sortedBulkVariants[selectedBundleIndex] || sortedBulkVariants[0] || null) : null)
    : variants.find(v => {
        const cOk = v.options?.color ? v.options.color === selectedColor : true;
        const sOk = v.options?.size ? v.options.size === selectedSize : true;
        return cOk && sOk;
      })
  ) || null;

  const basePrice = selectedVariant?.price ?? product.price;
  const baseMrp = selectedVariant?.mrp ?? product.mrp ?? basePrice;
  const isSpecialOffer = !!product.specialOffer?.isSpecialOffer;
  const specialDiscountPercent = Number(product.specialOffer?.discountPercent);
  const getEffectivePrice = (priceValue, mrpValue) => {
    const normalizedPrice = Number(priceValue);
    const normalizedMrp = Number(mrpValue);
    const safePrice = Number.isFinite(normalizedPrice) ? normalizedPrice : 0;
    const safeMrp = Number.isFinite(normalizedMrp) ? normalizedMrp : safePrice;

    if (isSpecialOffer && Number.isFinite(specialDiscountPercent) && specialDiscountPercent > 0) {
      const offerBase = safePrice > 0 ? safePrice : safeMrp;
      const discounted = offerBase * (1 - (specialDiscountPercent / 100));
      return Number.isFinite(discounted) ? Math.round(discounted * 100) / 100 : safePrice;
    }

    return safePrice;
  };
  let effPrice = basePrice;
  let effMrp = baseMrp;

  if (isSpecialOffer && Number.isFinite(specialDiscountPercent) && specialDiscountPercent > 0) {
    const offerBase = Number(basePrice) > 0 ? Number(basePrice) : Number(baseMrp) || 0;
    const discounted = offerBase * (1 - (specialDiscountPercent / 100));
    effMrp = offerBase || effMrp;
    effPrice = Number.isFinite(discounted) ? Math.round(discounted * 100) / 100 : effPrice;
  }
  
  // Debug logging for special offers
  if (product.specialOffer?.isSpecialOffer) {
    console.log('ProductDetails - Special Offer Prices:', {
      product_price: product.price,
      product_mrp: product.mrp,
      effPrice,
      effMrp,
      specialOffer: product.specialOffer
    });
  }
  
  const selectedBundleQty = Number(selectedVariant?.options?.bundleQty || 0);
  const nonBundleVariant = variants.find((variant) => {
    const options = variant?.options || {};
    const colorMatch = selectedColor ? options?.color === selectedColor : true;
    const sizeMatch = selectedSize ? options?.size === selectedSize : true;
    const optionBundleQty = Number(options?.bundleQty);
    const isBundleVariant = Number.isFinite(optionBundleQty) && optionBundleQty > 1;
    return colorMatch && sizeMatch && !isBundleVariant;
  }) || null;
  const nonBundleBasePrice = nonBundleVariant?.price ?? product?.salePrice ?? product?.price ?? basePrice;
  const nonBundleBaseMrp = nonBundleVariant?.mrp ?? product?.mrp ?? nonBundleBasePrice;
  const nonBundleEffPrice = getEffectivePrice(nonBundleBasePrice, nonBundleBaseMrp);
  const availableStock = (typeof selectedVariant?.stock === 'number')
    ? (selectedBundleQty > 1 ? selectedVariant.stock * selectedBundleQty : selectedVariant.stock)
    : (typeof product.stockQuantity === 'number' ? product.stockQuantity : 0);
  const maxOrderQty = Math.min(20, Math.max(0, availableStock));
  const hasAnyVariantStock = variants.length > 0
    ? variants.some(v => Number(v?.stock || 0) > 0)
    : false;
  const hasBaseStock = typeof product.stockQuantity === 'number' ? product.stockQuantity > 0 : true;
  const isGloballyOutOfStock = variants.length > 0
    ? !hasAnyVariantStock || product.inStock === false
    : product.inStock === false || !hasBaseStock;
  const discountPercent = effMrp > effPrice
    ? Math.round(((effMrp - effPrice) / effMrp) * 100)
    : 0;
  const displayPrice = (Number(effPrice) || 0) * Math.max(1, Number(quantity) || 1);
  const displayMrp = (Number(effMrp) || 0) * Math.max(1, Number(quantity) || 1);
  const displayDiscountPercent = displayMrp > displayPrice
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  const paymentOffers = [
    {
      key: 'cashback',
      title: 'Cashback',
      subtitle: 'Upto 5% cashback as wallet balance',
      countLabel: '1 offer',
      offers: [
        {
          title: 'Get upto 5% cashback on super.money UPI',
          terms: 'Get upto 5% cashback on super.money UPI • T&Cs'
        }
      ]
    },
    {
      key: 'bank',
      title: 'Bank Offer',
      subtitle: 'Upto ₹1,500 off on select cards',
      countLabel: '36 offers',
      offers: [
        {
          title: '10% instant discount up to ₹1,500 on HDFC Credit Cards',
          terms: 'Valid on min order ₹4,999 • T&Cs',
          details: [
            'Offer 1: 10% instant discount up to INR 1250 on BOBCARD Non-EMI transactions. Minimum purchase value INR 10,000.',
            'Offer period: 11th February 2026 00:00 HRS to 20th February 2026 23:59 HRS.',
            'EMI and Non-EMI both eligible on supported cards; bonus slabs may apply on 6 months+ EMI tenure.',
            'Exchange orders are eligible if net payable amount meets minimum threshold.',
            'COD, Net Banking and Amazon Pay Balance part-payment are not eligible for this bank offer.',
            'If order is cancelled or returned, instant discount benefit is adjusted in refund amount.',
            'Max cumulative benefit can be capped per card during offer period as per issuer terms.'
          ]
        },
        {
          title: 'Flat ₹750 off on ICICI Bank Debit Cards',
          terms: 'Valid on min order ₹2,999 • T&Cs',
          details: [
            'Offer 2: Flat INR 750 instant discount on eligible ICICI Debit Cards.',
            'Minimum cart value and card BIN eligibility checks apply at checkout.',
            'Valid on one or multiple transactions until campaign end or budget exhaustion.',
            'Cancelled/failed transactions do not qualify.'
          ]
        },
        {
          title: '5% cashback up to ₹1,000 on SBI Credit Cards',
          terms: 'Cashback credited in 5 working days • T&Cs',
          details: [
            'Offer 3: 5% cashback up to INR 1,000 on eligible SBI Credit Card spends.',
            'Cashback is posted to card statement within standard settlement timeline.',
            'Only successful card payment transactions qualify for cashback.'
          ]
        }
      ]
    },
    {
      key: 'partner',
      title: 'Partner Offers',
      subtitle: 'Get GST invoice and save more',
      countLabel: '1 offer',
      offers: [
        {
          title: 'Get GST invoice and claim input credit',
          terms: 'For eligible business purchases only • T&Cs'
        }
      ]
    }
  ];
  const activeOffer = paymentOffers.find((offer) => offer.key === selectedOfferKey) || paymentOffers[0];

  const deliveredByText = String(
    product?.attributes?.deliveredBy ??
    product?.deliveryInfo?.deliveredBy ??
    ''
  ).trim();

  const soldByText = String(
    product?.attributes?.soldBy ??
    product?.sellerName ??
    product?.store?.name ??
    ''
  ).trim();

  const paymentText = 'Secure transaction';

  const hasFastDelivery = Boolean(
    product?.fastDelivery || product?.fast_delivery ||
    product?.fastDeliveryAvailable || product?.fast_delivery_available ||
    product?.isFastDelivery || product?.is_fast_delivery ||
    product?.fast || product?.expressDelivery || product?.express_delivery ||
    product?.deliverySpeed === 'fast' || product?.delivery_speed === 'fast'
  );

  const getFastDeliveryDateLabel = () => {
    const now = new Date();
    const cutoffHour = 14; // 2pm
    let daysToAdd = 2;
    if (now.getHours() >= cutoffHour) {
      daysToAdd = 3;
    }
    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + daysToAdd);
    const calendarDate = deliveryDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
    const weekdayShort = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${calendarDate}, ${weekdayShort}`;
  };

  const fastDeliveryDateLabel = getFastDeliveryDateLabel();
  const deliveryAddressText = deliveryAddress
    ? [deliveryAddress.street, deliveryAddress.city, deliveryAddress.state, deliveryAddress.zip]
        .filter(Boolean)
        .join(', ')
    : '';

  const hasSellerMeta = Boolean(deliveredByText || soldByText || paymentText);
  const securityInfoRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (securityInfoRef.current && !securityInfoRef.current.contains(event.target)) {
        setShowSecurityInfo(false);
      }
    };

    if (showSecurityInfo) {
      document.addEventListener('mousedown', handleOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showSecurityInfo]);

  // Helper to check if a color+size combination has stock
  const isVariantInStock = (color, size) => {
    if (isGloballyOutOfStock) return false;

    const variant = variants.find(v => {
      const cOk = v.options?.color ? v.options.color === color : !color;
      const sOk = v.options?.size ? v.options.size === size : !size;
      return cOk && sOk;
    });
    if (variant) return variant.stock > 0;
    // For non-variant products, rely on base stock/inStock flags
    if (variants.length === 0) {
      const hasStockQty = typeof product.stockQuantity === 'number' ? product.stockQuantity > 0 : true;
      return product.inStock !== false && hasStockQty;
    }
    return false;
  };

  const isSelectionInStock = isVariantInStock(selectedColor, selectedSize);

  // Helper to check if color has any size in stock
  const isColorAvailable = (color) => {
    if (variantSizes.length === 0) {
      return isVariantInStock(color, null);
    }
    return variantSizes.some(size => isVariantInStock(color, size));
  };

  // Helper to check if size has any color in stock
  const isSizeAvailable = (size) => {
    if (variantColors.length === 0) {
      return isVariantInStock(null, size);
    }
    return variantColors.some(color => isVariantInStock(color, size));
  };

  useEffect(() => {
    const availableVariants = variants.filter(v => (v?.stock ?? 0) > 0);
    if (availableVariants.length === 1) {
      const v = availableVariants[0];
      if (v.options?.color) setSelectedColor(v.options.color);
      if (v.options?.size) setSelectedSize(v.options.size);
      return;
    }

    const availableColors = variantColors.filter(c => isColorAvailable(c));
    if (availableColors.length === 1) setSelectedColor(availableColors[0]);

    const availableSizes = variantSizes.filter(s => isSizeAvailable(s));
    if (availableSizes.length === 1) setSelectedSize(availableSizes[0]);
  }, []);

  const shareMenuRef = useRef(null);
  const mediaList = (Array.isArray(product.images) ? product.images : [])
    .map(resolveMediaUrl)
    .filter(Boolean);
  const getVideoThumbnailPreview = (index) => {
    const fallback = mediaList[0] || PLACEHOLDER_IMAGE;
    const candidate1 = mediaList[index + 1];
    const candidate2 = mediaList[index + 2];
    if (candidate1 && !isVideoUrl(candidate1)) return candidate1;
    if (candidate2 && !isVideoUrl(candidate2)) return candidate2;
    const firstImage = mediaList.find((item) => item && !isVideoUrl(item));
    return firstImage || fallback;
  };
  const activeMedia = mainImage || mediaList[0] || PLACEHOLDER_IMAGE;
  const isMainVideo = isVideoUrl(activeMedia);

  useEffect(() => {
    const initialMedia = mediaList[0] || PLACEHOLDER_IMAGE;
    setMainImage(initialMedia);
  }, [product?._id]);

  const aspectRatioClass = (() => {
    switch (product.imageAspectRatio) {
      case '4:5':
        return 'aspect-[4/5]';
      case '3:4':
        return 'aspect-[3/4]';
      case '16:9':
        return 'aspect-video';
      default:
        return 'aspect-square';
    }
  })();

  // Check wishlist status
  useEffect(() => {
    checkWishlistStatus();
  }, [isSignedIn, product._id]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const checkWishlistStatus = async () => {
    try {
      if (isSignedIn) {
        // Check server wishlist for signed-in users
        const token = await user?.getIdToken?.();
        if (!token) return;
        const { data } = await axios.get('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const isInList = data.wishlist?.some(item => item.productId === product._id);
        setIsInWishlist(isInList);
      } else {
        // Check localStorage for guests
        const guestWishlist = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
        const isInList = guestWishlist.some(item => item && item.productId === product._id);
        setIsInWishlist(isInList);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleWishlist = async () => {
    if (wishlistLoading) return;

    try {
      setWishlistLoading(true);

      if (isSignedIn) {
        // Handle server wishlist for signed-in users
        const action = isInWishlist ? 'remove' : 'add';
        const token = await user?.getIdToken?.();
        if (!token) throw new Error('No auth token');
        await axios.post('/api/wishlist', { 
          productId: product._id, 
          action 
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setIsInWishlist(!isInWishlist);
        setWishlistMessage(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist!');
        setShowWishlistToast(true);
        window.dispatchEvent(new Event('wishlistUpdated'));
        
        setTimeout(() => setShowWishlistToast(false), 3000);
      } else {
        // Handle localStorage wishlist for guests
        const guestWishlist = JSON.parse(localStorage.getItem('guestWishlist') || '[]');
        
        if (isInWishlist) {
          // Remove from wishlist
          const updatedWishlist = guestWishlist.filter(item => item && item.productId !== product._id);
          localStorage.setItem('guestWishlist', JSON.stringify(updatedWishlist));
          setIsInWishlist(false);
          setWishlistMessage('Removed from wishlist');
        } else {
          // Add to wishlist with product details
          const wishlistItem = {
            productId: product._id,
            slug: product.slug,
            name: product.name,
            price: effPrice,
            mrp: effMrp,
            images: product.images,
            discount: discountPercent,
            inStock: product.inStock,
            addedAt: new Date().toISOString()
          };
          guestWishlist.push(wishlistItem);
          localStorage.setItem('guestWishlist', JSON.stringify(guestWishlist));
          setIsInWishlist(true);
          setWishlistMessage('Added to wishlist!');
        }
        
        setShowWishlistToast(true);
        window.dispatchEvent(new Event('wishlistUpdated'));
        setTimeout(() => setShowWishlistToast(false), 3000);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      setWishlistMessage('Failed to update wishlist');
      setShowWishlistToast(true);
      setTimeout(() => setShowWishlistToast(false), 3000);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out ${product.name}`;
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      setShowShareMenu(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleOrderNow = () => {
    if (isOrderingNow || !isSelectionInStock || maxOrderQty <= 0) return;
    setIsOrderingNow(true);
    nextActionRef.current = 'go_to_checkout';
    emitBehaviorEvent('go_to_checkout', {
      nextAction: 'go_to_checkout',
      scrollDepthPercent: maxScrollDepthRef.current,
    });
    // Add to cart for both guests and signed-in users
    try {
      let qty = Math.min(quantity, maxOrderQty || 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        qty = 1;
      }
      const bundleQty = Number(selectedVariant?.options?.bundleQty || 0);
      const bundleUnits = bundleQty > 1 ? Math.min(qty, bundleQty) : 0;
      const normalUnits = Math.max(0, qty - bundleUnits);

      const buildPayload = (price, nextBundleQty) => {
        const payload = {
          productId: product._id,
          price,
          variantOptions: {
            color: selectedColor || null,
            size: selectedSize || null,
            bundleQty: nextBundleQty,
          },
        };

        if (product.specialOffer?.offerToken) {
          payload.offerToken = product.specialOffer.offerToken;
          payload.discountPercent = product.specialOffer.discountPercent;
        }

        return payload;
      };

      for (let i = 0; i < bundleUnits; i++) {
        dispatch(addToCart(buildPayload(effPrice, bundleQty)));
      }
      for (let i = 0; i < normalUnits; i++) {
        dispatch(addToCart(buildPayload(nonBundleEffPrice || effPrice, null)));
      }
      if (bundleUnits === 0 && normalUnits === 0) {
        dispatch(addToCart(buildPayload(nonBundleEffPrice || effPrice, null)));
      }
      // Go directly to checkout (guests can checkout there)
      router.push('/checkout');
    } catch (error) {
      console.error('Order now failed:', error);
      setIsOrderingNow(false);
      return;
    }

    setTimeout(() => setIsOrderingNow(false), 3000);
  };

  const handleAddToCart = async () => {
    if (!isSelectionInStock || maxOrderQty <= 0) return;
    nextActionRef.current = 'add_to_cart';
    emitBehaviorEvent('add_to_cart', {
      nextAction: 'add_to_cart',
      scrollDepthPercent: maxScrollDepthRef.current,
    });
    // Add to cart for both guests and signed-in users
    let qty = Math.min(quantity, maxOrderQty || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      qty = 1;
    }
    const bundleQty = Number(selectedVariant?.options?.bundleQty || 0);
    const bundleUnits = bundleQty > 1 ? Math.min(qty, bundleQty) : 0;
    const normalUnits = Math.max(0, qty - bundleUnits);

    const buildPayload = (price, nextBundleQty) => {
      const payload = {
        productId: product._id,
        price,
        variantOptions: {
          color: selectedColor || null,
          size: selectedSize || null,
          bundleQty: nextBundleQty,
        }
      };

      if (product.specialOffer?.offerToken) {
        payload.offerToken = product.specialOffer.offerToken;
        payload.discountPercent = product.specialOffer.discountPercent;
      }

      return payload;
    };

    for (let i = 0; i < bundleUnits; i++) {
      dispatch(addToCart(buildPayload(effPrice, bundleQty)));
    }
    for (let i = 0; i < normalUnits; i++) {
      dispatch(addToCart(buildPayload(nonBundleEffPrice || effPrice, null)));
    }
    if (bundleUnits === 0 && normalUnits === 0) {
      dispatch(addToCart(buildPayload(nonBundleEffPrice || effPrice, null)));
    }
    
    // Upload to server if signed in
    if (isSignedIn) {
      try {
        await dispatch(uploadCart()).unwrap();
      } catch (error) {
        console.error('Error uploading cart:', error);
      }
    }
    
    // Show cart toast
    setShowCartToast(true);
    setTimeout(() => setShowCartToast(false), 3000);
  };

  // Toggle FBT product selection
  const toggleFbtProduct = (productId) => {
    setSelectedFbtProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const fbtCarouselRef = useRef(null);

  const scrollFbtCarousel = (direction) => {
    if (!fbtCarouselRef.current) return;
    fbtCarouselRef.current.scrollBy({
      left: direction * 280,
      behavior: 'smooth',
    });
  };

  // Calculate FBT bundle total
  const calculateFbtTotal = () => {
    const mainProductPrice = effPrice;
    const selectedFbtTotal = fbtProducts
      .filter(p => selectedFbtProducts[p._id])
      .reduce((total, p) => total + (p.price || 0), 0);
    
    const bundleTotal = mainProductPrice + selectedFbtTotal;
    
    // Apply bundle discount if set
    if (fbtBundlePrice && fbtBundlePrice > 0) {
      return fbtBundlePrice;
    } else if (fbtBundleDiscount && fbtBundleDiscount > 0) {
      return bundleTotal * (1 - fbtBundleDiscount / 100);
    }
    
    return bundleTotal;
  };

  // Add selected bundle items then go directly to checkout
  const handleAddBundleToCart = async () => {
    nextActionRef.current = 'go_to_checkout';
    emitBehaviorEvent('go_to_checkout', {
      nextAction: 'go_to_checkout',
      scrollDepthPercent: maxScrollDepthRef.current,
      metadata: { bundle: true },
    });

    // Add main product
    dispatch(addToCart({ productId: product._id, price: effPrice }));

    // Add selected FBT products
    fbtProducts.forEach((p) => {
      if (selectedFbtProducts[p._id]) {
        dispatch(addToCart({ productId: p._id, price: p.price }));
      }
    });

    // Sync cart for signed-in users before checkout navigation
    if (isSignedIn) {
      try {
        await dispatch(uploadCart()).unwrap();
      } catch (error) {
        console.error('Error uploading cart:', error);
      }
    }

    router.push('/checkout');
  };

  const selectedAddonProducts = fbtProducts.filter(p => selectedFbtProducts[p._id]);
  const addonTotal = selectedAddonProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const baseBundleTotal = effPrice + addonTotal;
  const bundleTotal = calculateFbtTotal();
  const bundleSavings = Math.max(baseBundleTotal - bundleTotal, 0);
  const totalBundleItems = 1 + selectedAddonProducts.length;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-500 text-lg">Loading product…</div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-400 text-lg">Product not found.</div>
    );
  }
  return (
    <div className="bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
            <span className="text-gray-400">&gt;</span>
            <a href="/shop" className="text-gray-600 hover:text-gray-900">Products</a>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 items-start">
          
          {/* LEFT: Image Gallery */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Desktop: Thumbnails on left + Main Image */}
            <div className="hidden lg:flex gap-2">
              {/* Thumbnail Gallery - Vertical with Scroll */}
              <div className="flex flex-col gap-2 w-14 flex-shrink-0 overflow-y-auto h-[500px] xl:h-[560px] max-h-[calc(100vh-140px)] scrollbar-hide cursor-grab active:cursor-grabbing">
                {mediaList.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setMainImage(image)}
                    className={`w-14 h-14 border rounded overflow-hidden transition-all bg-white flex-shrink-0 cursor-pointer ${
                      mainImage === image 
                        ? 'border-orange-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {isVideoUrl(image) ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={getVideoThumbnailPreview(index)}
                          alt={`${product.name} ${index + 1}`}
                          width={56}
                          height={56}
                          unoptimized
                          className="object-cover w-full h-full"
                          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                        />
                        <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <span className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M7 5.5v9l7-4.5-7-4.5z" />
                            </svg>
                          </span>
                        </span>
                      </div>
                    ) : (
                      <Image
                        src={image || PLACEHOLDER_IMAGE}
                        alt={`${product.name} ${index + 1}`}
                        width={56}
                        height={56}
                        unoptimized
                        className="object-cover w-full h-full"
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Main Image */}
              <div className="flex-1 relative">
                <div className="relative bg-white border border-gray-200 rounded overflow-hidden w-full h-[500px] xl:h-[560px] max-h-[calc(100vh-140px)]">
                  {/* Used Badge */}
                  {product.attributes?.condition === 'used' && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Used
                      </span>
                    </div>
                  )}

                  {/* Wishlist - Top Right */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlist();
                      }}
                      disabled={wishlistLoading}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:border-gray-300 transition"
                    >
                      <HeartIcon 
                        size={18} 
                        fill={isInWishlist ? '#ef4444' : 'none'} 
                        className={isInWishlist ? 'text-red-500' : 'text-gray-600'}
                        strokeWidth={2} 
                      />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickView();
                      }}
                      className="h-9 px-3 rounded-full bg-white/95 border border-gray-200 text-gray-700 text-sm font-medium shadow-sm hover:bg-white transition inline-flex items-center gap-1.5"
                    >
                      <ZoomInIcon size={25} />
                      
                    </button>
                  </div>

                  <div className={`overflow-hidden w-full h-full relative ${isMainVideo ? '' : 'cursor-zoom-in'}`} onClick={openQuickView}>
                    {isMainVideo ? (
                      <video
                        src={activeMedia}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        disablePictureInPicture
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        onContextMenu={(e) => e.preventDefault()}
                        onVolumeChange={(e) => {
                          if (!e.currentTarget.muted || e.currentTarget.volume !== 0) {
                            e.currentTarget.muted = true
                            e.currentTarget.volume = 0
                          }
                        }}
                      />
                    ) : (
                      <Image
                        src={activeMedia || PLACEHOLDER_IMAGE}
                        alt={product.name}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                        priority
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Main Image Only */}
            <div className="lg:hidden relative -mx-4 sm:mx-0">
              <div className={`relative w-full ${aspectRatioClass} bg-white border border-gray-200 rounded-none sm:rounded-lg overflow-hidden`}>
                {/* Used Badge */}
                {product.attributes?.condition === 'used' && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Used
                    </span>
                  </div>
                )}

                {/* Wishlist - Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlist();
                    }}
                    disabled={wishlistLoading}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:border-gray-300 transition"
                  >
                    <HeartIcon 
                      size={18} 
                      fill={isInWishlist ? '#ef4444' : 'none'} 
                      className={isInWishlist ? 'text-red-500' : 'text-gray-600'}
                      strokeWidth={2} 
                    />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickView();
                    }}
                    className="h-9 px-3 rounded-full bg-white/95 border border-gray-200 text-gray-700 text-sm font-medium shadow-sm hover:bg-white transition inline-flex items-center gap-1.5"
                  >
                    <ZoomInIcon size={25} />
                    
                  </button>
                </div>

                <div className={`w-full h-full ${isMainVideo ? '' : 'cursor-zoom-in'}`} onClick={openQuickView}>
                  {isMainVideo ? (
                    <video
                      src={activeMedia}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      disablePictureInPicture
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      onContextMenu={(e) => e.preventDefault()}
                      onVolumeChange={(e) => {
                        if (!e.currentTarget.muted || e.currentTarget.volume !== 0) {
                          e.currentTarget.muted = true
                          e.currentTarget.volume = 0
                        }
                      }}
                    />
                  ) : (
                    <Image
                      src={activeMedia || PLACEHOLDER_IMAGE}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover"
                      priority
                      onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Thumbnail Gallery */}
            <div className="lg:hidden -mx-4 sm:mx-0 px-2 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing">
              {mediaList.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setMainImage(image)}
                  className={`flex-shrink-0 w-14 h-14 border-2 rounded overflow-hidden transition-all bg-white cursor-pointer ${
                    mainImage === image 
                      ? 'border-orange-500' 
                      : 'border-gray-200'
                  }`}
                >
                  {isVideoUrl(image) ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={getVideoThumbnailPreview(index)}
                        alt={`${product.name} ${index + 1}`}
                        width={56}
                        height={56}
                        unoptimized
                        className="object-cover w-full h-full"
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                      />
                      <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M7 5.5v9l7-4.5-7-4.5z" />
                          </svg>
                        </span>
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={image || PLACEHOLDER_IMAGE}
                      alt={`${product.name} ${index + 1}`}
                      width={56}
                      height={56}
                      unoptimized
                      className="object-cover w-full h-full"
                      onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-lg p-4 lg:p-6 space-y-5">
            {/* Special Offer - Countdown Timer */}
            {offerData?.countdownTimer && (
              <div className="mb-4">
                {offerData.countdownTimer}
              </div>
            )}

            {/* Store Link with Logo */}
            {/* <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <a 
                href={`/shop/${product.store?.username}`} 
                className="text-orange-500 text-sm font-medium hover:underline"
              >
                Shop for {product.store?.name || 'Seller'} &gt;
              </a>
            </div> */}


            {/* Product Title */}
       
          
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h2>

            {/* Special Offer - Discount Badge */}
            {offerData?.discountBadge && (
              <div className="mb-4">
                {offerData.discountBadge}
              </div>
            )}

            {/* Special Offer - Price Comparison */}
            {offerData?.priceComparison && (
              <div className="mb-4">
                {offerData.priceComparison}
              </div>
            )}

            {/* Short Description */}
            {product.attributes?.shortDescription && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {product.attributes.shortDescription}
              </p>
            )}

            {/* Product Badges */}
            {product.attributes?.badges && product.attributes.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.attributes.badges.map((badge, index) => {
                  // Define badge styles based on type
                  const badgeStyles = {
                    'Price Lower Than Usual': 'bg-green-100 text-green-700 border-green-200',
                    'Hot Deal': 'bg-red-100 text-red-700 border-red-200',
                    'Best Seller': 'bg-purple-100 text-purple-700 border-purple-200',
                    'New Arrival': 'bg-blue-100 text-blue-700 border-blue-200',
                    'Limited Stock': 'bg-orange-100 text-orange-700 border-orange-200',
                    'Free Shipping': 'bg-teal-100 text-teal-700 border-teal-200'
                  };
                  
                  const badgeIcons = {
                    'Price Lower Than Usual': '💰',
                    'Hot Deal': '🔥',
                    'Best Seller': '⭐',
                    'New Arrival': '✨',
                    'Limited Stock': '⏰',
                    'Free Shipping': '🚚'
                  };

                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border ${badgeStyles[badge] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      <span>{badgeIcons[badge] || '🏷️'}</span>
                      {badge}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Rating & Reviews */}
            <div className="flex items-center gap-3">
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      size={16}
                      fill={i < Math.round(averageRating) ? "#FFA500" : "none"}
                      className={i < Math.round(averageRating) ? "text-orange-500" : "text-gray-300"}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {reviewCount > 0 ? `${reviewCount} Reviews` : '(0) Reviews'}
                </span>
                {reviewCount > 0 && (
                  <a 
                    href="#reviews" 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    (See Reviews)
                  </a>
                )}
              </>
            </div>

            {/* Stock Availability */}
              {(typeof product.stockQuantity === 'number' || product.inStock === false) && (
                <div className="flex items-center gap-2">
                  {isGloballyOutOfStock ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Out of Stock
                    </span>
                  ) : product.stockQuantity < 20 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg border border-orange-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Limited stock: {product.stockQuantity} available
                    </span>
                  ) : null}
                </div>
              )}

            {/* Price Section */}
            <div className="space-y-2">
              {!isSelectionInStock && !isGloballyOutOfStock && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Out of Stock
                </div>
              )}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`${isSpecialOffer ? 'text-green-600' : 'text-red-600'} text-4xl font-bold`}>
                  {currency}  {displayPrice.toLocaleString()}
                </span>
                {displayMrp > displayPrice && (
                  <>
                    <span className="text-gray-400 text-xl line-through">
                      {currency} {displayMrp.toLocaleString()}
                    </span>
                    <span className="bg-red-50 text-red-600 text-sm font-semibold px-3 py-1.5 rounded">
                      Save {displayDiscountPercent}%
                    </span>
                  </>
                )}
              </div>
              {displayMrp > displayPrice && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-orange-600 text-sm font-semibold">
                    Save ₹ {(displayMrp - displayPrice).toLocaleString()} 
                  </span>
                </div>
              )}
            </div>


            {hasFastDelivery && (
              <div className="w-full">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Delivery details</h3>

                <div className="w-full rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <div className="px-3 py-2.5 bg-white border-b border-gray-200">
                    {authLoading || (isSignedIn && deliveryAddressLoading) ? (
                      <p className="text-sm text-gray-600">Loading saved address...</p>
                    ) : isSignedIn ? (
                      deliveryAddressText ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-700 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 2a5 5 0 00-5 5v3.382l-.724.724a1 1 0 00.708 1.708H8v3a1 1 0 102 0v-3h3.016a1 1 0 00.708-1.708L13 10.382V7a5 5 0 00-3-4.582V2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide shrink-0">HOME</span>
                          <span className="text-sm text-gray-700 truncate">{deliveryAddressText}</span>
                          <button
                            type="button"
                            className="ml-auto text-sm text-gray-600 hover:text-gray-900"
                            onClick={() => router.push('/dashboard/profile')}
                            aria-label="Manage address"
                          >
                            ›
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-700">No saved address found</p>
                          <button
                            type="button"
                            onClick={() => router.push('/dashboard/profile')}
                            className="text-sm font-semibold text-blue-700 hover:underline"
                          >
                            Add address
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-700">Sign in to use your saved address</p>
                        <button
                          type="button"
                          onClick={() => router.push('/sign-in')}
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          Sign in
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-2 bg-white flex flex-col gap-1 group relative" style={{overflow: 'visible'}}>
                    <div className="flex items-center gap-2 cursor-pointer relative group" tabIndex={0} style={{overflow: 'visible'}}>
                      <svg className="w-4 h-4 text-gray-700 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M2 4a1 1 0 011-1h8a1 1 0 011 1v2h2.586a1 1 0 01.707.293l1.414 1.414A1 1 0 0117 8.414V12a2 2 0 01-2 2h-1a2 2 0 11-4 0H8a2 2 0 11-4 0H3a1 1 0 01-1-1V4zm10 4v2h3V8.828L14.172 8H12z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-900">Delivery by {fastDeliveryDateLabel}</span>
                      <span className="ml-1 text-xs text-gray-400">ⓘ</span>
                    </div>
                    {(() => {
                      const now = new Date();
                      if (now.getHours() < 14) {
                        return (
                          <span className="text-xs text-gray-500 mt-0.5">Order before 2:00&nbsp;PM to get delivery by this date</span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}
            {/* Payment Offers */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Offers</h3>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {paymentOffers.map((offer) => {
                  const isActive = offer.key === selectedOfferKey;
                  return (
                    <button
                      key={offer.key}
                      type="button"
                      onClick={() => {
                        setSelectedOfferKey(offer.key);
                        setShowOfferPopup(true);
                        setExpandedOfferIndex(null);
                      }}
                      className={`min-w-[160px] text-left border rounded-lg p-2.5 transition ${
                        isActive ? 'border-blue-400' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-900">{offer.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{offer.subtitle}</p>
                      <p className="text-xs text-blue-700 font-medium mt-2">{offer.countLabel} ›</p>
                    </button>
                  );
                })}
              </div>

              {showOfferPopup && activeOffer && (
                <div
                  className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center p-4"
                  onClick={() => setShowOfferPopup(false)}
                >
                  <div
                    className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900">{activeOffer.title}</h4>
                      <button
                        type="button"
                        onClick={() => setShowOfferPopup(false)}
                        className="text-gray-500 hover:text-gray-700 text-lg leading-none"
                        aria-label="Close offers"
                      >
                        ×
                      </button>
                    </div>

                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                      {activeOffer.offers?.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden">
                          <div className="p-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">%</div>
                              <p className="text-[15px] text-gray-900 leading-snug">{item.title}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedOfferIndex(expandedOfferIndex === idx ? null : idx)}
                              className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
                            >
                              {expandedOfferIndex === idx ? 'Hide details' : 'View details'}
                            </button>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 text-sm text-gray-700 font-medium">{item.terms}</div>
                          {expandedOfferIndex === idx && (
                            <div className="px-4 py-3 border-t border-gray-200 bg-white">
                              <p className="text-xs font-semibold text-gray-900 mb-2">Promotion Terms</p>
                              <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                                {(item.details || []).map((line, detailIdx) => (
                                  <li key={detailIdx}>{line}</li>
                                ))}
                              </ul>
                              <p className="text-xs font-semibold text-gray-900 mt-3 mb-2">Frequently Asked Questions (FAQs)</p>
                              <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                                <li>How to avail? Use eligible card on checkout; no promo code needed.</li>
                                <li>Does EMI work? Yes, for eligible tenure and card combinations.</li>
                                <li>Will cancelled orders get offer? No, benefits are reversed on cancellation/refund.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasSellerMeta && (
              <div className="border border-gray-200 rounded-md px-3 py-2.5">
                <div className="space-y-1.5 text-sm">
                  {deliveredByText && (
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <span className="text-gray-600">Delivered by</span>
                      <span className="text-blue-700">{deliveredByText}</span>
                    </div>
                  )}

                  {soldByText && (
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <span className="text-gray-600">Sold by</span>
                      <span className="text-blue-700">{soldByText}</span>
                    </div>
                  )}

                  {paymentText && (
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <span className="text-gray-600">Payment</span>
                      <div
                        className="relative w-fit"
                        ref={securityInfoRef}
                        onMouseEnter={() => setShowSecurityInfo(true)}
                        onMouseLeave={() => setShowSecurityInfo(false)}
                      >
                        <button
                          type="button"
                          className="text-blue-700 hover:underline"
                          onClick={() => setShowSecurityInfo((prev) => !prev)}
                        >
                          {paymentText}
                        </button>

                        {showSecurityInfo && (
                          <div className="absolute left-0 top-full mt-2 z-40 w-[360px] max-w-[90vw] rounded-md border border-gray-300 bg-white shadow-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-base font-semibold text-gray-900">Your transaction is secure</p>
                              <button
                                type="button"
                                onClick={() => setShowSecurityInfo(false)}
                                className="text-gray-500 hover:text-gray-700 text-base leading-none"
                                aria-label="Close payment security info"
                              >
                                ×
                              </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                              We work hard to protect your security and privacy. Our payment security system encrypts your information during transmission. We don’t share your credit card details with third-party sellers, and we don’t sell your information to others.
                            </p>
                            <a href="/privacy-policy" className="inline-block mt-2 text-sm text-blue-600 hover:underline">Learn more</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Color Options */}
            {variantColors.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-gray-900">Color</label>
                <div className="flex flex-wrap gap-2">
                  {variantColors.map((color) => {
                    const inStock = isColorAvailable(color);
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium relative ${
                          selectedColor === color
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : inStock
                            ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 opacity-40'
                        }`}
                      >
                        {color}
                        {!inStock && (
                          <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 text-white px-1 py-0.5 rounded opacity-100">
                            OUT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Options */}
            {variantSizes.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-gray-900">Size</label>
                <div className="flex flex-wrap gap-2">
                  {variantSizes.map((size) => {
                    const inStock = isSizeAvailable(size);
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium relative ${
                          selectedSize === size
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : inStock
                            ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 opacity-40'
                        }`}
                      >
                        {size}
                        {!inStock && (
                          <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 text-white px-1 py-0.5 rounded opacity-100">
                            OUT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bundle Options */}
            {bulkVariants.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  BUNDLE AND SAVE MORE!
                </p>
                {sortedBulkVariants
                  .map((v, idx)=>{
                    const qty = Number(v.options.bundleQty) || 1;
                    const isSelected = selectedBundleIndex === idx;
                    const price = Number(v.price);
                    const mrp = Number(v.mrp ?? v.price);
                    const save = mrp > price ? (mrp - price) : 0;
                    const tag = v.tag || v.options?.tag || '';
                    const label = v.options?.title?.trim() || (qty === 1 ? 'Buy 1' : `Bundle of ${qty}`);
                    
                    return (
                      <div key={`${qty}-${idx}`} className="relative">
                        {tag === 'MOST_POPULAR' && (
                          <div className="absolute -top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full z-10 uppercase">
                            MOST POPULAR
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={()=> setSelectedBundleIndex(idx)}
                          className={`w-full text-left border rounded-lg p-3 flex items-center justify-between gap-3 transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-orange-500' : 'border-gray-400'
                            }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{label}</p>
                              {qty === 2 && <p className="text-xs text-gray-500">Perfect for 2 Pack</p>}
                              {qty === 3 && <p className="text-xs text-gray-500">Best Value</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-gray-900">{currency} {price.toFixed(2)}</div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Quantity */}
            {isSelectionInStock && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-gray-900">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className={`w-9 h-9 flex items-center justify-center border rounded transition ${quantity <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <MinusIcon size={16} className="text-gray-700" />
                  </button>
                  <div className="w-14 h-9 flex items-center justify-center border border-gray-300 rounded font-semibold text-base">
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity(Math.min(quantity + 1, maxOrderQty || 1))}
                    disabled={quantity >= (maxOrderQty || 1) || !isSelectionInStock}
                    className={`w-9 h-9 flex items-center justify-center border rounded transition ${
                      quantity >= (maxOrderQty || 1) || !isSelectionInStock
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <PlusIcon size={16} className="text-gray-700" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="hidden md:flex gap-2 pt-3">
              <button 
                onClick={handleOrderNow}
                disabled={!isSelectionInStock || isOrderingNow}
                className={`flex-1 py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border shadow-sm ${
                  !isSelectionInStock
                    ? 'bg-gray-400 border-gray-400 text-white cursor-not-allowed opacity-70'
                    : isOrderingNow
                      ? 'bg-red-500 border-red-500 text-white cursor-wait'
                      : 'bg-gradient-to-r from-rose-500 to-red-500 border-red-500 text-white hover:from-rose-600 hover:to-red-600'
                }`}
              >
                {!isSelectionInStock ? (
                  'Out of Stock'
                ) : isOrderingNow ? (
                  <span className="relative w-full h-full flex items-center justify-center py-0.5">
                    <span className="relative flex items-center gap-2 text-white">
                      <ShoppingCartIcon size={17} className="animate-pulse" />
                      <span className="text-sm font-semibold tracking-wide">Placing</span>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                    </span>
                  </span>
                ) : (
                  <>
                    Order Now
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </>
                )}
              </button>

              {isSelectionInStock && (
                cartItems[product._id] ? (
                  <button
                    onClick={() => router.push('/cart')}
                    aria-label="Go to Cart"
                    title="Go to Cart"
                    className="relative w-12 h-12 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 shadow-sm"
                  >
                    <ShoppingCartIcon size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={handleAddToCart}
                    aria-label="Add to Cart"
                    title="Add to Cart"
                    className="relative w-12 h-12 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 text-white border border-transparent shadow-sm"
                    style={{ backgroundColor: cartCount > 0 ? '#262626' : '#DC013C' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = cartCount > 0 ? '#1a1a1a' : '#b8012f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cartCount > 0 ? '#262626' : '#DC013C'}
                  >
                    <ShoppingCartIcon size={20} />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5" style={{ backgroundColor: '#DC013C' }}>
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>

            {/* Same Tag Products */}
            {normalizedCurrentTags.length > 0 && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Products with similar tags</p>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {normalizedCurrentTags.map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {loadingSameTagProducts ? (
                  <p className="text-xs text-gray-500">Finding products...</p>
                ) : sameTagProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {sameTagProducts.slice(0, 4).map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => router.push(`/product/${item.slug || item._id}`)}
                        className="text-left border border-gray-200 rounded-lg p-2 hover:border-blue-300 hover:shadow-sm transition bg-white"
                      >
                        <div className="w-full h-20 relative rounded overflow-hidden bg-gray-50 mb-2">
                          <Image
                            src={item.images?.[0] || PLACEHOLDER_IMAGE}
                            alt={item.name || 'Product'}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 min-h-[2rem]">{item.name}</p>
                        <p className="text-sm font-bold text-red-600 mt-1">{currency}{Number(item.price || 0).toLocaleString('en-IN')}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No similar-tag products found right now.</p>
                )}
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* 1 Year Warranty */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">100% Trusted Product</span>
              </div>

              {/* Arrives in 2 days */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Arrives in 2-5 days</span>
              </div>

              {/* Fast Shipping */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Free Shipping</span>
              </div>

              {/* Cash On Delivery */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Cash On Delivery</span>
              </div>
            </div>

            {/* Wishlist & Share */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={handleWishlist}
                disabled={wishlistLoading}
                className={`flex items-center gap-2 text-sm transition ${
                  isInWishlist ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <HeartIcon size={18} fill={isInWishlist ? 'currentColor' : 'none'} />
                {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
              
              <div className="relative" ref={shareMenuRef}>
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 transition"
                >
                  <Share2Icon size={18} />
                  Share
                </button>

                {/* Share Menu Dropdown */}
                {showShareMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('telegram')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Telegram
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t border-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together Section */}
      {fbtEnabled && fbtProducts.length > 0 && (
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Frequently bought together</h2>
                <p className="text-sm text-gray-500">Select addons to bundle</p>
              </div>
              <span className="text-xl font-semibold text-green-700">{currency}{bundleTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Products carousel */}
              <div className="lg:col-span-9">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => scrollFbtCarousel(-1)}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-300 text-gray-700 shadow"
                    aria-label="Scroll left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollFbtCarousel(1)}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-300 text-gray-700 shadow"
                    aria-label="Scroll right"
                  >
                    ›
                  </button>

                  <div
                    ref={fbtCarouselRef}
                    className="overflow-x-auto pb-2 scrollbar-thin"
                  >
                    <div className="flex items-stretch gap-2 min-w-max pr-2">
                      {[{
                        _id: '__main__',
                        name: 'Main product',
                        image: product.images?.[0] || 'https://ik.imagekit.io/jrstupuke/placeholder.png',
                        price: Number(effPrice || 0),
                        isMain: true,
                      }, ...fbtProducts.map((item) => ({
                        _id: item._id,
                        name: item.name,
                        image: item.images?.[0] || 'https://ik.imagekit.io/jrstupuke/placeholder.png',
                        price: Number(item.price || 0),
                        isMain: false,
                      }))].map((item, index, array) => (
                        <div key={item._id} className="flex items-center gap-2 shrink-0">
                          {item.isMain ? (
                            <div className="w-[190px] p-3 rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
                              <div className="mb-2">
                                <input
                                  type="checkbox"
                                  checked
                                  readOnly
                                  className="w-5 h-5 accent-purple-600 border-gray-300 rounded"
                                />
                              </div>
                              <div className="w-full h-24 relative border border-gray-200 rounded-lg overflow-hidden bg-white mb-2">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                              <p className="text-emerald-700 font-bold">{currency}{item.price.toFixed(0)}</p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleFbtProduct(item._id)}
                              className={`w-[190px] p-3 text-left rounded-xl border shadow-sm transition ${
                                selectedFbtProducts[item._id]
                                  ? 'border-emerald-300 bg-emerald-50/30'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="mb-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFbtProducts[item._id] || false}
                                  onChange={() => toggleFbtProduct(item._id)}
                                  className="w-5 h-5 accent-purple-600 border-gray-300 rounded cursor-pointer"
                                />
                              </div>
                              <div className="w-full h-24 relative border border-gray-200 rounded-lg overflow-hidden bg-white mb-2">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</p>
                              <p className="text-emerald-700 font-bold">{currency}{item.price.toFixed(0)}</p>
                            </button>
                          )}

                          {index < array.length - 1 && (
                            <span className="text-xl font-bold text-gray-400 select-none">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="lg:col-span-3">
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Items selected</span>
                    <span className="font-semibold text-gray-900">{totalBundleItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Bundle total</span>
                    <span className="text-2xl font-bold text-green-700">{currency}{bundleTotal.toFixed(2)}</span>
                  </div>
                  {bundleSavings > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">You save</span>
                      <span className="text-red-500 font-semibold">{currency}{bundleSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <button
                    onClick={handleAddBundleToCart}
                    disabled={selectedAddonProducts.length === 0}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold text-base transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    BUY {totalBundleItems} TOGETHER FOR {currency}{bundleTotal.toFixed(2)}
                  </button>
                  <p className="text-xs text-gray-500 text-center">Select addons you want to include</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isQuickViewOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4" onClick={closeQuickView}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close quick view"
              onClick={closeQuickView}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition flex items-center justify-center"
            >
              <X size={18} />
            </button>

            {!isMainVideo && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 border border-gray-200 rounded-full px-2 py-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setQuickViewZoom((z) => Math.max(1, z - 0.25))}
                disabled={quickViewZoom <= 1}
                className="w-7 h-7 rounded-full border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition flex items-center justify-center"
              >
                <MinusIcon size={14} />
              </button>
              <span className="text-xs font-semibold text-gray-700 min-w-[44px] text-center">{Math.round(quickViewZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setQuickViewZoom((z) => Math.min(3, z + 0.25))}
                disabled={quickViewZoom >= 3}
                className="w-7 h-7 rounded-full border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition flex items-center justify-center"
              >
                <PlusIcon size={14} />
              </button>
            </div>
            )}

            <div className="w-full h-full bg-gray-100 overflow-auto">
              <div className="w-full h-full flex items-center justify-center p-4">
                {isMainVideo ? (
                  <video
                    src={activeMedia}
                    className="max-w-full max-h-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    onContextMenu={(e) => e.preventDefault()}
                    onVolumeChange={(e) => {
                      if (!e.currentTarget.muted || e.currentTarget.volume !== 0) {
                        e.currentTarget.muted = true
                        e.currentTarget.volume = 0
                      }
                    }}
                  />
                ) : (
                  <img
                    src={activeMedia || PLACEHOLDER_IMAGE}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                      transform: `scale(${quickViewZoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 150ms ease'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Toast */}
      {showWishlistToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-8 md:right-8 md:left-auto md:translate-x-0 bg-white border-2 border-orange-500 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 z-[9999] animate-slide-up max-w-[90vw] md:max-w-none">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            wishlistMessage.includes('Added') ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <HeartIcon 
              size={20} 
              className={wishlistMessage.includes('Added') ? 'text-green-600' : 'text-red-600'}
              fill={wishlistMessage.includes('Added') ? 'currentColor' : 'none'}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{wishlistMessage}</p>
            {wishlistMessage.includes('Added') && (
              <a href="/wishlist" className="text-sm text-orange-500 hover:underline">
                View Wishlist
              </a>
            )}
          </div>
        </div>
      )}

      {/* Cart Toast */}
      {showCartToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-8 md:right-8 md:left-auto md:translate-x-0 bg-white border-2 border-green-500 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 z-[9999] animate-slide-up max-w-[90vw] md:max-w-none">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
            <ShoppingCartIcon 
              size={20} 
              className="text-green-600"
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Added to cart!</p>
            <a href="/cart" className="text-sm text-orange-500 hover:underline">
              View Cart
            </a>
          </div>
        </div>
      )}

      {/* Mobile Actions Bar */}
      <MobileProductActions
        onOrderNow={handleOrderNow}
        onAddToCart={handleAddToCart}
        effPrice={effPrice}
        currency={currency}
        cartCount={cartCount}
        isOutOfStock={!isSelectionInStock}
        isOrdering={isOrderingNow}
      />

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>
    </div>
  );
};

export default ProductDetails;
