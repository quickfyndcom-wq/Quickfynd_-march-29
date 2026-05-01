"use client"

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCartIcon, StarIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

import { useAuth } from '@/lib/useAuth'
import { addToCart, uploadCart } from '@/lib/features/cart/cartSlice'

import toast from 'react-hot-toast'

// Pick a usable image source with graceful fallbacks
const getImageSrc = (product) => {
    if (Array.isArray(product.images) && product.images.length) {
        const first = product.images[0]
        if (first?.url) return first.url
        if (first?.src) return first.src
        if (typeof first === 'string' && first.trim() !== '') return first
    }
    return 'https://ik.imagekit.io/jrstupuke/placeholder.png'
}

const getImageSrcAt = (product, index = 0) => {
    if (Array.isArray(product.images) && product.images.length > index) {
        const item = product.images[index]
        if (item?.url) return item.url
        if (item?.src) return item.src
        if (typeof item === 'string' && item.trim() !== '') return item
    }
    return ''
}

const isVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)
}

const getVideoPreviewImageSrc = (product) => {
    const fallback = 'https://ik.imagekit.io/jrstupuke/placeholder.png'
    const second = getImageSrcAt(product, 1)
    const third = getImageSrcAt(product, 2)
    if (second && !isVideoUrl(second) && second !== fallback) return second
    if (third && !isVideoUrl(third) && third !== fallback) return third
    return fallback
}

// Normalize price-like values (numbers or strings with currency symbols)
const parseAmount = (value) => {
    const num = Number(String(value ?? '').replace(/[^0-9.]/g, ''))
    return Number.isNaN(num) ? 0 : num
}

// Best-guess sale price from common fields
const getSalePrice = (product) => parseAmount(
    product.price ??
    product.salePrice ?? product.sale_price ??
    product.discountedPrice ?? product.discounted_price ??
    product.sellingPrice ?? product.selling_price ??
    product.offerPrice ?? product.offer_price ??
    product.currentPrice ?? product.current_price
)

// Best-guess MRP/compare-at price from common fields
const getMrpPrice = (product) => parseAmount(
    product.mrp ??
    product.compareAtPrice ?? product.compare_at_price ??
    product.originalPrice ?? product.original_price ??
    product.listPrice ?? product.list_price ??
    product.basePrice ?? product.base_price ??
    product.regularPrice ?? product.regular_price
)

const getProductId = (product) => {
    if (!product) return ''

    if (typeof product._id === 'string' && product._id) return product._id
    if (typeof product.id === 'string' && product.id) return product.id
    if (typeof product.productId === 'string' && product.productId) return product.productId
    if (product.productId && typeof product.productId === 'object') {
        if (typeof product.productId._id === 'string' && product.productId._id) return product.productId._id
        if (typeof product.productId.id === 'string' && product.productId.id) return product.productId.id
    }

    return ''
}

const getProductAverageRating = (product, reviews) => {
    if (Array.isArray(reviews) && reviews.length > 0) {
        return reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length
    }

    const averageRating = Number(product?.averageRating)
    if (Number.isFinite(averageRating) && averageRating > 0) return averageRating

    const rating = Number(product?.rating)
    if (Number.isFinite(rating) && rating > 0) return rating

    if (Array.isArray(product?.rating) && product.rating.length > 0) {
        return product.rating.reduce((sum, value) => sum + Number(value || 0), 0) / product.rating.length
    }

    return 0
}

const getProductReviewCount = (product, reviews) => {
    if (Array.isArray(reviews) && reviews.length > 0) return reviews.length
    const ratingCount = Number(product?.ratingCount)
    if (Number.isFinite(ratingCount) && ratingCount >= 0) return ratingCount
    const reviewCount = Number(product?.reviewCount)
    if (Number.isFinite(reviewCount) && reviewCount >= 0) return reviewCount
    if (Array.isArray(product?.reviews)) return product.reviews.length
    return 0
}

const ProductCard = ({ product }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const dispatch = useDispatch()
    const { getToken } = useAuth()
    const cartItems = useSelector(state => state.cart.cartItems)
    const productId = getProductId(product)
    const itemQuantity = cartItems[productId] || cartItems[String(productId)] || 0

    const [reviews, setReviews] = useState([])
    const [hovered, setHovered] = useState(false)
    const [videoReady, setVideoReady] = useState(false)
    const videoRef = useRef(null)
    const [, setLoadingReviews] = useState(false)

    useEffect(() => {
        const fetchReviews = async () => {
            if (!productId) {
                setReviews([])
                return
            }

            try {
                setLoadingReviews(true)
                const { data } = await import('axios').then(ax => ax.default.get(`/api/review?productId=${encodeURIComponent(productId)}`))
                setReviews(data.reviews || [])
            } catch (error) {
                // silent fail
            } finally {
                setLoadingReviews(false)
            }
        }
        fetchReviews()
    }, [productId])

    const averageRating = Math.round(getProductAverageRating(product, reviews))

    const ratingCount = getProductReviewCount(product, reviews)

    let priceNum = getSalePrice(product)
    let mrpNum = getMrpPrice(product)
    const explicitDiscount = parseAmount(
        product.discountPercent ?? product.discount_percent ??
        product.discountPercentage ?? product.discount_percentage ??
        product.discount
    )

    // If only one price plus a percent is present, synthesize the other
    if (priceNum === 0 && mrpNum > 0 && explicitDiscount > 0) {
        priceNum = +(mrpNum * (1 - explicitDiscount / 100)).toFixed(2)
    }
    if (mrpNum === 0 && priceNum > 0 && explicitDiscount > 0) {
        mrpNum = +(priceNum / (1 - explicitDiscount / 100)).toFixed(2)
    }

    const discount = mrpNum > priceNum && priceNum > 0
        ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
        : explicitDiscount > 0
            ? Math.round(explicitDiscount)
            : 0

    const hasFastDelivery = Boolean(
        product.fastDelivery || product.fast_delivery ||
        product.fastDeliveryAvailable || product.fast_delivery_available ||
        product.isFastDelivery || product.is_fast_delivery ||
        product.fast || product.expressDelivery || product.express_delivery ||
        product.deliverySpeed === 'fast' || product.delivery_speed === 'fast'
    )
    const isOutOfStock = product.inStock === false || (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0)

    const handleAddToCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isOutOfStock) {
            toast.error('Out of stock')
            return
        }
        dispatch(addToCart({ 
            productId,
            price: priceNum > 0 ? priceNum : undefined
        }))
        dispatch(uploadCart({ getToken }))
        toast.success('Added to cart')
    }

    const displayName = (product.name || product.title || 'Untitled Product').length > 50
        ? `${(product.name || product.title || 'Untitled Product').slice(0, 50)}...`
        : (product.name || product.title || 'Untitled Product')

    const showPrice = priceNum > 0 || mrpNum > 0

    const imageSrc = getImageSrc(product)
    const showVideo = isVideoUrl(imageSrc)
    const preHoverImageSrc = showVideo ? getVideoPreviewImageSrc(product) : imageSrc

    useEffect(() => {
        if (!showVideo || !videoRef.current) return
        if (hovered) {
            videoRef.current.play().catch(() => {})
        } else {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
            setVideoReady(false)
        }
    }, [hovered, showVideo])

    return (
        <Link
            href={`/product/${product.slug || productId || ''}`}
            className="group w-full"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col h-full relative">
                {/* Product Image */}
                <div className={`relative w-full bg-gray-50 overflow-hidden ${getAspectRatioClass(product.aspectRatio)}`}>
                    {hasFastDelivery && (
                        <span className="absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm z-20 pointer-events-none" style={{ backgroundColor: '#006644' }}>
                            Fast
                        </span>
                    )}
                    {showVideo ? (
                        <>
                            <Image
                                src={preHoverImageSrc}
                                alt={displayName}
                                fill
                                unoptimized
                                className={`object-contain p-1.5 transition-transform duration-300 scale-[1.06] group-hover:scale-[1.12] ${hovered && videoReady ? 'invisible' : 'visible'}`}
                                onError={(e) => {
                                    if (e.currentTarget.src !== 'https://ik.imagekit.io/jrstupuke/placeholder.png') {
                                        e.currentTarget.src = 'https://ik.imagekit.io/jrstupuke/placeholder.png'
                                    }
                                }}
                            />
                            <video
                                ref={videoRef}
                                src={imageSrc}
                                poster={preHoverImageSrc}
                                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${hovered && videoReady ? 'visible' : 'invisible'}`}
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
                                onLoadedData={() => setVideoReady(true)}
                                onPlaying={() => setVideoReady(true)}
                                onWaiting={() => setVideoReady(false)}
                            />
                        </>
                    ) : (
                        <Image
                            src={imageSrc}
                            alt={displayName}
                            fill
                            unoptimized
                            className="object-contain p-1.5 transition-transform duration-300 scale-[1.06] group-hover:scale-[1.12]"
                            onError={(e) => {
                                if (e.currentTarget.src !== 'https://ik.imagekit.io/jrstupuke/placeholder.png') {
                                    e.currentTarget.src = 'https://ik.imagekit.io/jrstupuke/placeholder.png'
                                }
                            }}
                        />
                    )}
                </div>

                {/* Product Details */}
                <div className="flex flex-col p-2 sm:p-2.5">
                    <h3 className="min-h-[2rem] text-xs font-semibold leading-tight text-gray-900 line-clamp-2 sm:min-h-[2.5rem] sm:text-sm mb-1">
                        {displayName}
                    </h3>

                    <div className="mt-1 flex items-end justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-0.5">
                                {ratingCount > 0 ? (
                                    <>
                                        <div className="flex items-center">
                                            {Array(5).fill('').map((_, index) => (
                                                <StarIcon
                                                    key={index}
                                                    size={10}
                                                    className="text-yellow-400"
                                                    fill={averageRating >= index + 1 ? '#FBBF24' : 'none'}
                                                    stroke={averageRating >= index + 1 ? '#FBBF24' : '#D1D5DB'}
                                                    strokeWidth={1.5}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] text-gray-400">({ratingCount})</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center">
                                            {Array(5).fill('').map((_, index) => (
                                                <StarIcon
                                                    key={index}
                                                    size={10}
                                                    className="text-gray-300"
                                                    fill="none"
                                                    stroke="#D1D5DB"
                                                    strokeWidth={1.5}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] text-gray-400">(0)</span>
                                    </>
                                )}
                            </div>

                            {showPrice && (
                                <div className="mt-1 flex min-h-[2.6rem] flex-col justify-end gap-0.5">
                                    {priceNum > 0 && (
                                        <p className="text-sm font-bold text-gray-900 sm:text-base">{currency} {priceNum.toFixed(2)}</p>
                                    )}
                                    {mrpNum > 0 && mrpNum > priceNum && priceNum > 0 && (
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                            <p className="text-[10px] text-gray-400 line-through sm:text-xs">{currency} {mrpNum.toFixed(2)}</p>
                                            {discount > 0 && (
                                                <span className="text-[10px] font-semibold text-green-600 sm:text-xs">
                                                    {discount}% off
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                            className="mb-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 relative flex-shrink-0"
                            style={{ backgroundColor: isOutOfStock ? '#9CA3AF' : (itemQuantity > 0 ? '#262626' : '#DC013C') }}
                            onMouseEnter={(e) => {
                                if (isOutOfStock) return
                                e.currentTarget.style.backgroundColor = itemQuantity > 0 ? '#1a1a1a' : '#b8012f'
                            }}
                            onMouseLeave={(e) => {
                                if (isOutOfStock) return
                                e.currentTarget.style.backgroundColor = itemQuantity > 0 ? '#262626' : '#DC013C'
                            }}
                        >
                            <ShoppingCartIcon className="text-white" size={15} strokeWidth={2} />
                            {itemQuantity > 0 && (
                                <span className="absolute -top-1 -right-1 text-white text-[9px] sm:text-[10px] font-bold min-w-[15px] h-[15px] sm:min-w-[16px] sm:h-[16px] rounded-full flex items-center justify-center shadow-md border-2 border-white px-0.5" style={{ backgroundColor: '#DC013C' }}>
                                    {itemQuantity > 99 ? '99+' : itemQuantity}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}

// Helper function for aspect ratio CSS class
function getAspectRatioClass(ratio) {
    switch (ratio) {
        case '1:1': return 'aspect-square'
        case '4:6': return 'aspect-[2/3]'
        case '2:3': return 'aspect-[2/3]'
        case '3:4': return 'aspect-[3/4]'
        case '16:9': return 'aspect-[16/9]'
        case '9:16': return 'aspect-[9/16]'
        case '4:5': return 'aspect-[4/5]'
        case '5:7': return 'aspect-[5/7]'
        case '7:10': return 'aspect-[7/10]'
        case '5:8': return 'aspect-[5/8]'
        case '3:2': return 'aspect-[3/2]'
        case '8:10': return 'aspect-[8/10]'
        case '11:14': return 'aspect-[11/14]'
        default: return 'aspect-square'
    }
}

export default ProductCard

