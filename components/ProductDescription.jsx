'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
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
const ProductDescription = ({ product, reviews = [], loadingReviews = false, onReviewAdded }) => {

    // Use reviews and loadingReviews from props only
    const [suggestedProducts, setSuggestedProducts] = useState([])
    const allProducts = useSelector((state) => state.product.list || [])
    const [lightboxImage, setLightboxImage] = useState(null)
    const [visibleReviews, setVisibleReviews] = useState(5)

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
        
        // Shuffle and take first 8 products
        const shuffled = related.sort(() => 0.5 - Math.random())
        setSuggestedProducts(shuffled.slice(0, 8))
    }

    // Remove fetchReviews and handleReviewAdded, use parent handler

    return (
        <div className="my-4 sm:my-8">

            {/* Product Description Section */}
            <div className="bg-white border border-gray-200 mb-4 sm:mb-6">
                <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Product Description</h2>
                </div>
                <div className="p-4 sm:p-6">
                    {product?.description && product.description.trim() ? (
                        <div 
                            className="max-w-none prose prose-sm sm:prose dark:prose-invert
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
                            [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:border [&_table]:border-gray-300 [&_table]:shadow-sm
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
                            dangerouslySetInnerHTML={{ __html: product.description }}
                        />
                    ) : (
                        <p className="text-gray-500 text-center py-8">No description available for this product.</p>
                    )}
                </div>
            </div>

            {/* Reviews Section */}
            <div id="reviews" className="bg-white border border-gray-200 mt-4 sm:mt-6">
                <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Reviews</h2>
                </div>
                <div className="p-4 sm:p-8">
                    {/* Rating Overview - Horizontal Layout */}
                    <div className="mb-6 sm:mb-10">
                        <div className="flex items-start gap-4 sm:gap-8 pb-4 sm:pb-8 border-b border-gray-200">
                            {/* Left: Large Rating */}
                            <div className="flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                                <div className="text-5xl sm:text-6xl font-bold text-gray-900 mb-2">{averageRating}</div>
                                <div className="flex mb-2">
                                    {Array(5).fill('').map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            size={20}
                                            fill={i < Math.round(averageRating) ? "#FFA500" : "#D1D5DB"}
                                            className="text-transparent"
                                        />
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500">{normalizedReviews.length} Review{normalizedReviews.length !== 1 ? 's' : ''}</div>
                            </div>

                            {/* Right: Rating Distribution Bars */}
                            <div className="flex-1 space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = ratingCounts[star - 1]
                                    const percentage = normalizedReviews.length > 0 ? (count / normalizedReviews.length) * 100 : 0
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 min-w-[45px]">
                                                <span className="text-sm font-medium text-gray-700">{star}</span>
                                                <StarIcon size={14} fill="#FFA500" className="text-transparent" />
                                            </div>
                                            <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden max-w-md">
                                                <div 
                                                    className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all duration-300"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="min-w-[25px] text-right text-sm text-gray-600">{count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Add Review Section */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Add Review</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            You can add your review by clicking the star rating below:
                        </p>
                        <ReviewForm productId={product._id} onReviewAdded={onReviewAdded} />
                    </div>

                    {/* Customer Photos Section */}
                    {reviewPhotoList.length > 0 && (
                        <div className="mb-8 pb-8 border-b border-gray-200">
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
                    ) : normalizedReviews.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {normalizedReviews.slice(0, visibleReviews).map((item, idx) => (
                                <div key={item.id || item._id || idx} className="pb-6 border-b border-gray-100 last:border-0">
                                    <div className="flex gap-4">
                                        {/* User Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg">
                                                {(item.user?.name || item.userId?.name || item.customerName) ? (item.user?.name || item.userId?.name || item.customerName)[0].toUpperCase() : 'U'}
                                            </div>
                                        </div>
                                        
                                        {/* Review Content */}
                                        <div className="flex-1">
                                            {/* User Info & Rating */}
                                            <div className="flex items-start justify-between mb-2">
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
                                            
                                            {/* Review Text */}
                                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{item.review}</p>
                                            
                                            {/* Review Images */}
                                            {item.images && item.images.length > 0 && (
                                                <div className="flex gap-2 flex-wrap mb-3">
                                                    {item.images.map((img, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <Image
                                                                src={resolveImageUrl(img)}
                                                                alt={`Review image ${idx + 1}`}
                                                                width={80}
                                                                height={80}
                                                                unoptimized
                                                                className="rounded-lg object-cover border border-gray-200 hover:border-orange-400 transition-colors cursor-pointer"
                                                                onClick={() => setLightboxImage(resolveImageUrl(img))}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Country Flag */}
                                            {/* <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>🇦🇪</span>
                                            </div> */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Load More Button */}
                            {normalizedReviews.length > visibleReviews && (
                                <div className="text-center pt-6">
                                    <button
                                        onClick={() => setVisibleReviews(prev => prev + 5)}
                                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Load More Reviews ({normalizedReviews.length - visibleReviews} more)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
