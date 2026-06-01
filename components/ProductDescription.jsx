'use client'
import { ArrowRight, ArrowUpDown, Funnel, Info, StarIcon, ThumbsUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import ReviewForm from "./ReviewForm"
import axios from "axios"
import ProductCard from "./ProductCard"
import { useSelector } from "react-redux"

// Helper function to get relative time
const getRelativeTime = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now - date
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 14) return 'Last week'
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 60) return 'Last month'
    
    // For older dates, show month and year
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${month} ${year}`
}

// Updated design - Noon.com style v2
const ProductDescription = ({ product, reviews = [], loadingReviews = false, onReviewAdded, embedded = false, afterDescriptionContent = null }) => {

    // Use reviews and loadingReviews from props only
    const [suggestedProducts, setSuggestedProducts] = useState([])
    const allProducts = useSelector((state) => state.product.list || [])
    const [lightboxImage, setLightboxImage] = useState(null)
    const [visibleReviews, setVisibleReviews] = useState(2)
    const [animateRatings, setAnimateRatings] = useState(false)
    const [helpfulVoteDelta, setHelpfulVoteDelta] = useState({})
    const [votedHelpfulMap, setVotedHelpfulMap] = useState({})
    const [reviewFilter, setReviewFilter] = useState('all')
    const [reviewSort, setReviewSort] = useState('top')

    const resolveImageUrl = (image) => {
        const endpoint = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/jrstupuke').replace(/\/+$/, '')

        const normalize = (value) => {
            if (typeof value !== 'string') return ''
            const trimmed = value.trim()
            if (!trimmed) return ''

            if (trimmed.startsWith('//')) return `https:${trimmed}`
            if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`
            if (trimmed.startsWith('https://')) return trimmed
            if (trimmed.startsWith('/')) return `${endpoint}${trimmed}`

            if (/^[a-zA-Z0-9._/-]+$/.test(trimmed) && (trimmed.includes('reviews/') || trimmed.includes('products/') || trimmed.includes('profile-images/'))) {
                const safePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
                return `${endpoint}${safePath}`
            }

            return trimmed
        }

        if (typeof image === 'string') {
            const normalized = normalize(image)
            if (normalized) return normalized
        }

        if (image && typeof image === 'object') {
            const candidates = [image.url, image.src, image.thumbnailUrl, image.filePath, image.path]
            for (const candidate of candidates) {
                const normalized = normalize(candidate)
                if (normalized) return normalized
            }
        }

        return 'https://ik.imagekit.io/jrstupuke/placeholder.png'
    }

    const normalizedReviews = reviews.map((review) => ({
        ...review,
        images: Array.isArray(review.images)
            ? review.images.map(resolveImageUrl).filter(Boolean)
            : []
    }))

    const reviewPhotoList = normalizedReviews.flatMap((review) => review.images || [])

    // Calculate rating distribution
    const ratingCounts = [0, 0, 0, 0, 0]
    normalizedReviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
            ratingCounts[review.rating - 1]++
        }
    })

    const averageRating = normalizedReviews.length > 0
        ? (normalizedReviews.reduce((sum, r) => sum + r.rating, 0) / normalizedReviews.length).toFixed(1)
        : 0

    const totalRatings = Number(product?.ratingCount || product?.ratingsCount || normalizedReviews.length || 0)
    const totalReviews = normalizedReviews.length
    const ratingOverviewRows = [
        { label: 'Excellent', count: ratingCounts[4], barClass: 'bg-indigo-500', labelClass: 'text-slate-700' },
        { label: 'Very Good', count: ratingCounts[3], barClass: 'bg-blue-500', labelClass: 'text-slate-700' },
        { label: 'Good', count: ratingCounts[2], barClass: 'bg-cyan-500', labelClass: 'text-slate-700' },
        { label: 'Average', count: ratingCounts[1], barClass: 'bg-amber-500', labelClass: 'text-slate-700' },
        { label: 'Poor', count: ratingCounts[0], barClass: 'bg-rose-400', labelClass: 'text-slate-700' },
    ]
    const noonRatingRows = [
        { stars: 5, count: ratingCounts[4], color: '#38AE04' },
        { stars: 4, count: ratingCounts[3], color: '#6EAE00' },
        { stars: 3, count: ratingCounts[2], color: '#ECAA22' },
        { stars: 2, count: ratingCounts[1], color: '#F47A20' },
        { stars: 1, count: ratingCounts[0], color: '#EB5F2A' },
    ]

    const getReviewKey = (review, idx) => String(review?.id || review?._id || `idx-${idx}`)

    useEffect(() => {
        if (typeof window === 'undefined' || !product?._id) return
        const storageKey = `helpful-votes-${product._id}`
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
            if (saved && typeof saved === 'object') {
                setVotedHelpfulMap(saved)
            } else {
                setVotedHelpfulMap({})
            }
        } catch {
            setVotedHelpfulMap({})
        }
        setHelpfulVoteDelta({})
    }, [product?._id])

    const handleHelpfulClick = (reviewKey) => {
        if (!reviewKey || typeof window === 'undefined' || !product?._id) return
        const storageKey = `helpful-votes-${product._id}`
        setVotedHelpfulMap((prev) => {
            const wasVoted = Boolean(prev[reviewKey])
            const next = { ...prev, [reviewKey]: !wasVoted }
            try {
                localStorage.setItem(storageKey, JSON.stringify(next))
            } catch {
                // Ignore storage errors and keep in-memory state.
            }
            setHelpfulVoteDelta((deltaPrev) => ({
                ...deltaPrev,
                [reviewKey]: (deltaPrev[reviewKey] || 0) + (wasVoted ? -1 : 1),
            }))
            return next
        })
    }

    useEffect(() => {
        setAnimateRatings(false)
        const timer = setTimeout(() => setAnimateRatings(true), 80)
        return () => clearTimeout(timer)
    }, [product?._id, totalReviews])

    const sortedAndFilteredReviews = useMemo(() => {
        let list = [...normalizedReviews]

        if (reviewFilter !== 'all') {
            const filterRating = Number(reviewFilter)
            list = list.filter((item) => Number(item.rating) === filterRating)
        }

        if (reviewSort === 'new') {
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        } else if (reviewSort === 'high') {
            list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        } else if (reviewSort === 'low') {
            list.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0))
        } else {
            list.sort((a, b) => {
                const aHelpful = Number(a.helpfulCount || 0)
                const bHelpful = Number(b.helpfulCount || 0)
                if (bHelpful !== aHelpful) return bHelpful - aHelpful
                return new Date(b.createdAt) - new Date(a.createdAt)
            })
        }

        return list
    }, [normalizedReviews, reviewFilter, reviewSort])

    const visibleReviewItems = useMemo(
        () => sortedAndFilteredReviews.slice(0, visibleReviews),
        [sortedAndFilteredReviews, visibleReviews]
    )

    useEffect(() => {
        setVisibleReviews(2)
    }, [reviewFilter, reviewSort, product?._id])

    useEffect(() => {
        fetchSuggestedProducts()
    }, [product._id, allProducts])

    const fetchSuggestedProducts = () => {
        // Filter products by same category or tags, exclude current product
        const related = allProducts.filter(p => {
            if (p._id === product._id) return false
            
            // Match by category
            if (p.category === product.category) return true
            
            // Match by tags if they exist
            if (product.tags && p.tags) {
                const productTags = Array.isArray(product.tags) ? product.tags : []
                const pTags = Array.isArray(p.tags) ? p.tags : []
                return productTags.some(tag => pTags.includes(tag))
            }
            
            return false
        })
        
        // Shuffle and take first 6 products
        const shuffled = related.sort(() => 0.5 - Math.random())
        setSuggestedProducts(shuffled.slice(0, 6))
    }

    const responsiveDescriptionHtml = useMemo(() => {
        const sourceHtml = typeof product?.description === 'string' ? product.description : ''
        if (!sourceHtml.trim() || typeof window === 'undefined') return sourceHtml

        try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(sourceHtml, 'text/html')

            doc.querySelectorAll('table').forEach((table) => {
                const parent = table.parentElement
                if (parent && parent.classList.contains('desc-table-wrap')) return

                const wrapper = doc.createElement('div')
                wrapper.className = 'desc-table-wrap'
                table.parentNode?.insertBefore(wrapper, table)
                wrapper.appendChild(table)
            })

            doc.querySelectorAll('img').forEach((img) => {
                if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy')
                if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async')
                if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'no-referrer')
                img.classList.add('desc-media')
            })

            doc.querySelectorAll('video, iframe').forEach((node) => {
                node.classList.add('desc-media')
            })

            doc.querySelectorAll('a').forEach((anchor) => {
                const href = anchor.getAttribute('href') || ''
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    anchor.setAttribute('target', '_blank')
                    anchor.setAttribute('rel', 'noopener noreferrer nofollow')
                }
            })

            return doc.body.innerHTML
        } catch {
            return sourceHtml
        }
    }, [product?.description])

    // Remove fetchReviews and handleReviewAdded, use parent handler

    return (
        <div className={embedded ? 'mt-4 space-y-4' : 'my-4 sm:my-8'}>

            {/* Product Description Section */}
            <div className={embedded ? 'bg-white border border-gray-200 rounded-lg' : 'bg-white border border-gray-200 mb-4 sm:mb-6'}>
                <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Product Description</h2>
                </div>
                <div className="p-4 sm:p-6">
                    {product?.description && product.description.trim() ? (
                        <div 
                            className="max-w-none prose prose-sm sm:prose dark:prose-invert product-desc-content
                            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:leading-tight
                            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:leading-tight
                            [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-3 [&_h3]:mt-4 [&_h3]:leading-tight
                            [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mb-2 [&_h4]:mt-3
                            [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-gray-900 [&_h5]:mb-2 [&_h5]:mt-2
                            [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:text-gray-900 [&_h6]:mb-2 [&_h6]:mt-2
                            [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-base
                            [&_strong]:font-bold [&_strong]:text-gray-900 [&_strong]:not-italic
                            [&_b]:font-bold [&_b]:text-gray-900 [&_b]:not-italic
                            [&_em]:italic [&_em]:text-gray-800 [&_em]:not-bold
                            [&_i]:italic [&_i]:text-gray-800 [&_i]:not-bold
                            [&_u]:underline [&_u]:decoration-solid [&_u]:underline-offset-2
                            [&_s]:line-through [&_s]:text-gray-600
                            [&_mark]:bg-yellow-100 [&_mark]:px-1
                            [&_ul]:list-disc [&_ul]:list-outside [&_ul]:text-gray-700 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:space-y-2
                            [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:text-gray-700 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:space-y-2
                            [&_li]:text-gray-700 [&_li]:mb-0 [&_li]:pl-2
                            [&_li_p]:mb-0
                            [&_dl]:space-y-3
                            [&_dt]:font-semibold [&_dt]:text-gray-900 [&_dt]:mt-2
                            [&_dd]:ml-6 [&_dd]:text-gray-700
                            [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_a]:break-words [&_a]:transition-colors
                            [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-6 [&_img]:border [&_img]:border-gray-200
                            [&_video]:max-w-full [&_video]:w-full [&_video]:h-auto [&_video]:rounded-lg [&_video]:shadow-md [&_video]:my-6 [&_video]:border [&_video]:border-gray-200
                            [&_figure]:my-6 [&_figure]:text-center [&_figure]:flex [&_figure]:flex-col [&_figure]:items-center
                            [&_figcaption]:text-sm [&_figcaption]:text-gray-600 [&_figcaption]:mt-2 [&_figcaption]:italic
                            [&_blockquote]:border-l-4 [&_blockquote]:border-orange-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:my-4 [&_blockquote]:bg-gray-50 [&_blockquote]:py-3
                            [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-red-600 [&_code]:not-italic
                            [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm [&_pre]:shadow-lg
                            [&_pre_code]:bg-none [&_pre_code]:text-inherit [&_pre_code]:p-0 [&_pre_code]:font-mono
                            [&_hr]:border-t-2 [&_hr]:border-gray-300 [&_hr]:my-6 [&_hr]:mx-0
                            [&_table]:w-full [&_table]:min-w-[520px] [&_table]:border-collapse [&_table]:my-6 [&_table]:border [&_table]:border-gray-300 [&_table]:shadow-sm
                            [&_thead]:bg-gray-100
                            [&_thead_th]:text-left [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:font-semibold [&_thead_th]:text-gray-800 [&_thead_th]:border [&_thead_th]:border-gray-300 [&_thead_th]:bg-gray-100
                            [&_tbody_tr]:border-b [&_tbody_tr]:border-gray-300 [&_tbody_tr]:transition-colors
                            [&_tbody_tr:hover]:bg-gray-50
                            [&_tbody_tr:last-child]:border-b
                            [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:text-gray-700 [&_tbody_td]:border [&_tbody_td]:border-gray-300
                            [&_tfoot]:bg-gray-50
                            [&_tfoot_tr]:border-t-2 [&_tfoot_tr]:border-gray-300
                            [&_tfoot_th]:text-left [&_tfoot_th]:px-4 [&_tfoot_th]:py-3 [&_tfoot_th]:font-semibold [&_tfoot_th]:text-gray-800 [&_tfoot_th]:border [&_tfoot_th]:border-gray-300
                            [&_br]:block
                            [&_.text-center]:text-center
                            [&_.text-left]:text-left
                            [&_.text-right]:text-right
                            [&_.text-justify]:text-justify
                            [&_.font-bold]:font-bold
                            [&_.italic]:italic
                            [&_.underline]:underline
                            [&_.line-through]:line-through"
                            dangerouslySetInnerHTML={{ __html: responsiveDescriptionHtml }}
                        />
                    ) : (
                        <p className="text-gray-500 text-center py-8">No description available for this product.</p>
                    )}
                </div>
            </div>

            {afterDescriptionContent}

            {/* Reviews Section */}
            <div id="reviews" className={embedded ? 'bg-white border border-gray-200 rounded-lg' : 'bg-white border border-gray-200 mt-4 sm:mt-6'}>
                <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Ratings &amp; Reviews</h2>
                </div>
                <div className="p-4 sm:p-5 lg:p-4 xl:p-5">
                    <div className={embedded ? '' : 'lg:flex lg:items-start lg:gap-5 xl:gap-6'}>
                        {/* Left Summary - sticky on desktop */}
                        <div className={`mb-4 sm:mb-5 pb-4 border-b border-gray-200 ${embedded ? '' : 'lg:w-[320px] xl:w-[340px] lg:flex-none lg:mb-0 lg:pb-0 lg:border-b-0 lg:border-r lg:border-gray-200 lg:pr-5 lg:pl-1 xl:pl-2 lg:sticky lg:top-24'} self-start`}>
                            <div>
                            <div className="flex items-end gap-1 mb-1">
                                <span className="text-[42px] font-bold leading-none text-[#404553]">{Number(averageRating).toFixed(1)}</span>
                                <StarIcon size={18} fill="#F5A623" className="text-[#F5A623] mb-2" />
                            </div>

                            <div className="mb-1.5 flex items-center gap-1.5 text-[#38AE04]">
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon
                                        key={index}
                                        size={21}
                                        fill={Number(averageRating) >= index + 1 ? 'currentColor' : '#D1D5DB'}
                                        className={Number(averageRating) >= index + 1 ? 'text-[#38AE04]' : 'text-slate-300'}
                                    />
                                ))}
                            </div>

                            <div className="mb-4 flex items-center gap-1 text-[14px] leading-5 text-[#626B84]">
                                <span>Based on {totalRatings} ratings from trusted sources</span>
                                <Info size={13} className="text-[#626B84]" />
                            </div>

                            <div className="space-y-2.5 mb-7">
                                {noonRatingRows.map((row, index) => {
                                    const percentage = totalReviews > 0 ? Math.round((row.count / totalReviews) * 100) : 0
                                    const barWidth = percentage > 0 ? Math.max(percentage, 6) : 0
                                    return (
                                        <div key={row.stars} className="grid grid-cols-[20px_minmax(0,1fr)_36px] items-center gap-2">
                                            <span className="text-[16px] font-semibold leading-none text-[#404553]">{row.stars}<span className="text-[#F5A623]">★</span></span>
                                            <div className="h-[8px] rounded-full bg-[#E2E7F0] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                                                    style={{
                                                        width: animateRatings ? `${barWidth}%` : '0%',
                                                        backgroundColor: row.color,
                                                        transitionDelay: `${index * 80}ms`,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-right text-[16px] leading-5 font-bold text-[#404553]">{percentage}%</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="space-y-6 text-[#404553]">
                                <div>
                                    <h4 className="mb-2.5 flex items-start gap-2 text-[16px] font-bold leading-6">
                                        <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#404553] bg-[#FFE500] text-[9px] font-bold leading-none text-[#404553]">i</span>
                                        <span>How do I review this product?</span>
                                    </h4>
                                    <p className="text-[14px] leading-7 text-[#626B84]">
                                        If you recently purchased this product from Quickfynd, you can go to your Orders page and click on the Submit Review button.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="mb-2.5 flex items-start gap-2 text-[16px] font-bold leading-6">
                                        <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#404553] bg-[#FFE500] text-[9px] font-bold leading-none text-[#404553]">i</span>
                                        <span>Where do the reviews come from?</span>
                                    </h4>
                                    <p className="text-[14px] leading-7 text-[#626B84]">
                                        Our reviews are from customers who purchased the product and submitted a review.
                                    </p>
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Right Content - reviews stream on desktop */}
                        <div className={embedded ? '' : 'lg:flex-1 lg:min-w-0 lg:pr-3 xl:pr-4 lg:pt-3 xl:pt-4'}>
                            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <h3 className="text-xl font-bold leading-none text-gray-900 sm:text-3xl">{sortedAndFilteredReviews.length} {sortedAndFilteredReviews.length === 1 ? 'Review' : 'Reviews'}</h3>

                                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-3">
                                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                                        <Funnel size={13} className="hidden sm:block" />
                                        <span>Filter:</span>
                                        <select
                                            value={reviewFilter}
                                            onChange={(e) => setReviewFilter(e.target.value)}
                                            className="h-10 w-[118px] rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500 sm:w-[125px]"
                                        >
                                            <option value="all">All Stars</option>
                                            <option value="5">5 Stars</option>
                                            <option value="4">4 Stars</option>
                                            <option value="3">3 Stars</option>
                                            <option value="2">2 Stars</option>
                                            <option value="1">1 Star</option>
                                        </select>
                                    </label>

                                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                                        <ArrowUpDown size={13} className="hidden sm:block" />
                                        <span>Sort:</span>
                                        <select
                                            value={reviewSort}
                                            onChange={(e) => setReviewSort(e.target.value)}
                                            className="h-10 w-[118px] rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500 sm:w-[130px]"
                                        >
                                            <option value="top">Top Reviews</option>
                                            <option value="new">Newest First</option>
                                            <option value="high">Highest Rating</option>
                                            <option value="low">Lowest Rating</option>
                                        </select>
                                    </label>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Photos Section */}
                            {reviewPhotoList.length > 0 && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Photos ({reviewPhotoList.length})</h3>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                        {reviewPhotoList.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square group">
                                                <Image
                                                    src={resolveImageUrl(img)}
                                                    alt={`Customer photo ${idx + 1}`}
                                                    fill
                                                    unoptimized
                                                    className="rounded-lg object-cover border border-gray-200 hover:border-orange-400 transition-all cursor-pointer hover:scale-105"
                                                    onClick={() => setLightboxImage(resolveImageUrl(img))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reviews List */}
                            {loadingReviews ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                                </div>
                            ) : sortedAndFilteredReviews.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {visibleReviewItems.map((item, idx) => {
                                        const reviewKey = getReviewKey(item, idx)
                                        const displayedHelpfulCount = Math.max(0, Number(item.helpfulCount || 0) + Number(helpfulVoteDelta[reviewKey] || 0))
                                        const isHelpfulVoted = Boolean(votedHelpfulMap[reviewKey])
                                        return (
                                        <div key={item.id || item._id || idx} className="mb-3 rounded-xl border border-slate-200 bg-white p-4 last:mb-0">
                                            <div className="flex gap-3 sm:gap-4">
                                                {/* User Avatar */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-base">
                                                        {(item.user?.name || item.userId?.name || item.customerName) ? (item.user?.name || item.userId?.name || item.customerName)[0].toUpperCase() : 'U'}
                                                    </div>
                                                </div>

                                                {/* Review Content */}
                                                <div className="flex-1">
                                                    <div className="mb-1">
                                                        <p className="font-semibold text-slate-800 text-base leading-6">{item.user?.name || item.userId?.name || item.customerName || 'Guest User'}</p>
                                                    </div>

                                                    {/* Rating + Date */}
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <div className="inline-flex items-center gap-0.5 text-lime-600">
                                                            {Array(5).fill('').map((_, index) => (
                                                                <StarIcon
                                                                    key={index}
                                                                    size={16}
                                                                    fill={Number(item.rating || 0) >= index + 1 ? 'currentColor' : '#D1D5DB'}
                                                                    className={Number(item.rating || 0) >= index + 1 ? 'text-lime-600' : 'text-slate-300'}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>

                                                    {/* Review Text */}
                                                    <p className="text-base font-semibold leading-6 text-slate-800 mb-1">{item.title || 'Review'}</p>
                                                    <p className="text-sm sm:text-base leading-7 text-slate-700 mb-3.5">{item.review}</p>

                                                    {/* Review Images */}
                                                    {item.images && item.images.length > 0 && (
                                                        <div className="flex gap-2 flex-wrap mb-4">
                                                            {item.images.map((img, imageIndex) => (
                                                                <div key={imageIndex} className="relative group">
                                                                    <Image
                                                                        src={resolveImageUrl(img)}
                                                                        alt={`Review image ${imageIndex + 1}`}
                                                                        width={84}
                                                                        height={84}
                                                                        unoptimized
                                                                        className="rounded-lg object-cover border border-slate-200 hover:border-orange-400 transition-colors cursor-pointer"
                                                                        onClick={() => setLightboxImage(resolveImageUrl(img))}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleHelpfulClick(reviewKey)}
                                                        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors border rounded-md px-3 py-1.5 ${
                                                            isHelpfulVoted
                                                                ? 'text-blue-700 border-blue-300 bg-blue-50'
                                                                : 'text-slate-600 border-slate-300 hover:text-slate-800 hover:border-slate-400'
                                                        }`}
                                                    >
                                                        <ThumbsUp size={16} />
                                                        Helpful ({displayedHelpfulCount})
                                                    </button>

                                                    {/* User Info (legacy kept for fallback) */}
                                                    <div className="hidden">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{item.user?.name || item.userId?.name || item.customerName || 'Guest User'}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {getRelativeTime(item.createdAt)}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-0.5">
                                                            {Array(5).fill('').map((_, index) => (
                                                                <StarIcon
                                                                    key={index}
                                                                    size={14}
                                                                    className='text-transparent'
                                                                    fill={item.rating >= index + 1 ? "#FFA500" : "#D1D5DB"}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        )})}

                                    {/* Load More Button */}
                                    {sortedAndFilteredReviews.length > visibleReviews && (
                                        <div className="text-center pt-4">
                                            <button
                                                onClick={() => setVisibleReviews(prev => prev + (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 5))}
                                                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md transition-colors"
                                            >
                                                Load More Reviews ({sortedAndFilteredReviews.length - visibleReviews} more)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Add Review Section */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Add Review</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Share your experience with this product.
                                </p>
                                <ReviewForm productId={product._id} onReviewAdded={onReviewAdded} />
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested Products Section */}
            {suggestedProducts.length > 0 && (
                <div className="bg-white border border-gray-200 mt-6">
                    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">You May Also Like</h2>
                        {product.category && (
                            <Link 
                                href={`/shop?category=${product.category}`}
                                className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                            >
                                View All <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-5 lg:gap-6">
                            {suggestedProducts.map((suggestedProduct) => (
                                <ProductCard key={suggestedProduct._id} product={suggestedProduct} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
                        >
                            ×
                        </button>
                        <img
                            src={resolveImageUrl(lightboxImage)}
                            alt="Review image full size"
                            className="rounded-lg max-h-[85vh] w-auto object-contain"
                            onClick={(e) => e.stopPropagation()}
                            onError={(e) => {
                                e.currentTarget.src = 'https://ik.imagekit.io/jrstupuke/placeholder.png'
                            }}
                        />
                    </div>
                </div>
            )}
           
        </div>
    )
}

export default ProductDescription
