
'use client'
import { useAuth } from '@/lib/useAuth';

export const dynamic = 'force-dynamic'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"

import axios from "axios"
import { StarIcon, Search, Filter } from "lucide-react"


export default function StoreReviews() {
    const { getToken, user } = useAuth()

    const getImageSrc = (image) => {
        if (typeof image === 'string' && image.trim()) return image
        if (image && typeof image === 'object') return image.url || image.src || 'https://ik.imagekit.io/jrstupuke/placeholder.png'
        return 'https://ik.imagekit.io/jrstupuke/placeholder.png'
    }

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all') // 'all', 'with-reviews', 'no-reviews'
    const [expandedProductId, setExpandedProductId] = useState(null) // Track which product is expanded
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        rating: 5,
        review: '',
        images: [],
        videos: []
    })
    const [imagePreviews, setImagePreviews] = useState([])
    const [videoPreviews, setVideoPreviews] = useState([])

    const fetchReviews = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/reviews', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(data.products)
            setFilteredProducts(data.products)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }
    
    // Filter and search products
    useEffect(() => {
        let result = [...products]
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query)
            )
        }
        
        // Apply status filter
        if (filterStatus === 'with-reviews') {
            result = result.filter(p => p.rating.length > 0)
        } else if (filterStatus === 'no-reviews') {
            result = result.filter(p => p.rating.length === 0)
        }
        
        setFilteredProducts(result)
    }, [searchQuery, filterStatus, products])

    const handleApproval = async (reviewId, approved) => {
        try {
            const token = await getToken()
            await axios.post('/api/store/reviews/approve', 
                { reviewId, approved },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success(approved ? 'Review approved' : 'Review rejected')
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleSubmitReview = async (e) => {
        e.preventDefault()
        
        try {
            const token = await getToken()
            const form = new FormData()
            form.append('productId', selectedProduct._id)
            form.append('rating', formData.rating)
            form.append('review', formData.review)
            form.append('customerName', formData.customerName)
            form.append('customerEmail', formData.customerEmail)
            
            formData.images.forEach((img) => {
                form.append('images', img)
            })

            formData.videos.forEach((vid) => {
                form.append('videos', vid)
            })

            await axios.post('/api/store/reviews', form, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success('Review added successfully')
            setShowAddModal(false)
            setFormData({ customerName: '', customerEmail: '', rating: 5, review: '', images: [], videos: [] })
            setImagePreviews([])
            setVideoPreviews([])
            setSelectedProduct(null)
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (user) {
            fetchReviews()
        }
    }, [user])

    if (loading) return <Loading />

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl text-slate-500 mb-2">
                    Product <span className="text-slate-800 font-medium">Reviews</span>
                </h1>
                <p className="text-sm text-slate-600">
                    Manage reviews for your products. Search for a product to add or moderate reviews.
                </p>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    {/* Filter Dropdown */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
                        >
                            <option value="all">All Products ({products.length})</option>
                            <option value="with-reviews">With Reviews ({products.filter(p => p.rating.length > 0).length})</option>
                            <option value="no-reviews">No Reviews ({products.filter(p => p.rating.length === 0).length})</option>
                        </select>
                    </div>
                </div>
                
                {/* Results count */}
                <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-slate-600">
                        Showing <span className="font-semibold">{filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''}
                        {searchQuery && <span> matching "<span className="font-semibold">{searchQuery}</span>"</span>}
                    </p>
                </div>
            </div>

            {/* Products List */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white border rounded-lg p-12 text-center">
                    <div className="text-slate-400 mb-3">
                        <Search size={48} className="mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No products found</h3>
                    <p className="text-slate-600">
                        {searchQuery 
                            ? `No products match "${searchQuery}". Try a different search term.`
                            : 'No products available with the selected filter.'
                        }
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Clear Search
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredProducts.map((product) => {
                        const isExpanded = expandedProductId === product._id
                        return (
                        <div key={product._id || product.id} className="border rounded-lg bg-white shadow-sm hover:shadow-md transition">
                            {/* Product Header - Always Visible */}
                            <div 
                                className="p-5 cursor-pointer hover:bg-slate-50 transition"
                                onClick={() => setExpandedProductId(isExpanded ? null : product._id)}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Product Image */}
                                    {product.images && product.images[0] && (
                                        <Image
                                            src={getImageSrc(product.images[0])}
                                            alt={product.name}
                                            width={80}
                                            height={80}
                                            unoptimized
                                            className="rounded-lg object-cover border"
                                        />
                                    )}
                                    
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-slate-800 mb-1">{product.name}</h3>
                                        {product.sku && (
                                            <p className="text-sm text-slate-500 mb-2">SKU: {product.sku}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-slate-600 font-medium">
                                                {product.rating.length} review{product.rating.length !== 1 ? 's' : ''}
                                            </span>
                                            {product.rating.length > 0 && (
                                                <span className="text-sm text-slate-500">
                                                    • {product.rating.filter(r => r.approved).length} approved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedProduct(product)
                                                setShowAddModal(true)
                                            }}
                                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow whitespace-nowrap"
                                        >
                                            + Add Review
                                        </button>
                                        
                                        {/* Expand/Collapse Icon */}
                                        <div className="text-slate-400">
                                            {isExpanded ? (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        {/* Reviews List - Expandable */}
                        {isExpanded && (
                            <div className="px-5 pb-5 border-t bg-slate-50">
                                <div className="space-y-3 mt-4">
                            {product.rating.map((rev) => (
                                <div key={rev._id || rev.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        {rev.user && (
                                            <Image
                                                src={rev.user.image && rev.user.image.trim() !== '' ? rev.user.image : '/placeholder.png'}
                                                alt={rev.user.name ? rev.user.name : 'Customer avatar'}
                                                width={40}
                                                height={40}
                                                unoptimized
                                                className="rounded-full"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{rev.user ? rev.user.name : "Unknown User"}</span>
                                                <div className="flex">
                                                    {Array(5).fill('').map((_, i) => (
                                                        <StarIcon
                                                            key={i}
                                                            size={14}
                                                            fill={rev.rating >= i + 1 ? "#FFA500" : "#D1D5DB"}
                                                            className="text-transparent"
                                                        />
                                                    ))}
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${rev.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {rev.approved ? 'Approved' : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">{rev.review}</p>
                                            {rev.images && rev.images.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {rev.images.map((img, idx) => (
                                                        <Image
                                                            key={idx}
                                                            src={getImageSrc(img)}
                                                            alt="Review image"
                                                            width={80}
                                                            height={80}
                                                            unoptimized
                                                            className="rounded object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <p className="text-xs text-slate-400">
                                                    {new Date(rev.createdAt).toLocaleDateString()}
                                                </p>
                                                {!rev.approved && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproval(rev.id, true)}
                                                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproval(rev.id, false)}
                                                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {product.rating.length === 0 && (
                                <p className="text-slate-400 text-sm italic bg-white p-4 rounded-lg border">No reviews yet - be the first to add one!</p>
                            )}
                        </div>
                            </div>
                        )}
                    </div>
                    )})}
                </div>
            )}

            {/* Add Review Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form
                        onSubmit={handleSubmitReview}
                        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-start gap-4 mb-6 pb-4 border-b">
                            {selectedProduct?.images?.[0] && (
                                <Image
                                    src={getImageSrc(selectedProduct.images[0])}
                                    alt={selectedProduct.name}
                                    width={80}
                                    height={80}
                                    unoptimized
                                    className="rounded-lg object-cover border"
                                />
                            )}
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold mb-1">Add Review</h2>
                                <p className="text-slate-600">{selectedProduct?.name}</p>
                                {selectedProduct?.sku && (
                                    <p className="text-sm text-slate-500">SKU: {selectedProduct.sku}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Customer Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.customerEmail}
                                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Rating *</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className="text-3xl"
                                        >
                                            <StarIcon
                                                size={32}
                                                fill={formData.rating >= star ? "#FFA500" : "#D1D5DB"}
                                                className="text-transparent cursor-pointer hover:scale-110 transition"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Review *</label>
                                <textarea
                                    required
                                    value={formData.review}
                                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                    rows={4}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Write your review..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Images (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files)
                                        const remainingSlots = 5 - formData.images.length
                                        if (remainingSlots <= 0) {
                                            toast.error('Maximum 5 images allowed')
                                            e.target.value = ''
                                            return
                                        }
                                        const filesToAdd = files.slice(0, remainingSlots)
                                        if (files.length > remainingSlots) {
                                            toast.error(`Only ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''} can be added (max 5 total)`)
                                        }
                                        setFormData({ ...formData, images: [...formData.images, ...filesToAdd] })
                                        const previews = filesToAdd.map(f => URL.createObjectURL(f))
                                        setImagePreviews([...imagePreviews, ...previews])
                                        e.target.value = ''
                                    }}
                                    className="w-full border rounded px-3 py-2"
                                    disabled={formData.images.length >= 5}
                                />
                                <p className="text-xs text-slate-500 mt-1">You can upload up to 5 images ({formData.images.length}/5)</p>
                                {imagePreviews.length > 0 && (
                                    <div className="flex gap-3 mt-3 flex-wrap">
                                        {imagePreviews.map((preview, idx) => (
                                            <div key={idx} className="relative">
                                                <Image
                                                    src={preview}
                                                    alt={`Preview ${idx + 1}`}
                                                    width={100}
                                                    height={100}
                                                    className="rounded-lg object-cover border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })
                                                        setImagePreviews(imagePreviews.filter((_, i) => i !== idx))
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Videos (Optional)</label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files)
                                        setFormData({ ...formData, videos: [...formData.videos, ...files] })
                                        const previews = files.map(f => URL.createObjectURL(f))
                                        setVideoPreviews([...videoPreviews, ...previews])
                                    }}
                                    className="w-full border rounded px-3 py-2"
                                />
                                <p className="text-xs text-slate-500 mt-1">Upload video reviews (MP4, WebM, max 50MB each)</p>
                                {videoPreviews.length > 0 && (
                                    <div className="flex gap-3 mt-3 flex-wrap">
                                        {videoPreviews.map((preview, idx) => (
                                            <div key={idx} className="relative">
                                                <video
                                                    src={preview}
                                                    width={150}
                                                    height={100}
                                                    controls
                                                    className="rounded-lg object-cover border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, videos: formData.videos.filter((_, i) => i !== idx) })
                                                        setVideoPreviews(videoPreviews.filter((_, i) => i !== idx))
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow"
                            >
                                Submit Review
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false)
                                    setSelectedProduct(null)
                                    setFormData({ customerName: '', customerEmail: '', rating: 5, review: '', images: [], videos: [] })
                                    setImagePreviews([])
                                    setVideoPreviews([])
                                }}
                                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
