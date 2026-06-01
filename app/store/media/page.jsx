'use client'

import { useAuth } from '@/lib/useAuth'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import Image from 'next/image'
import Loading from '@/components/Loading'
import ProductImageViewer from './ProductImageViewer'
import { ImageIcon } from 'lucide-react'

export default function StoreMediaPage() {
  const { user, getToken } = useAuth()
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showViewer, setShowViewer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, name
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  const pageSize = 24

  const getImageSrc = (image) => {
    if (typeof image === 'string' && image.trim()) return image
    if (image && typeof image === 'object') return image.url || image.src || 'https://ik.imagekit.io/jrstupuke/placeholder.png'
    return 'https://ik.imagekit.io/jrstupuke/placeholder.png'
  }

  // Fetch products (server-side pagination)
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/product', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
          category: filterCategory,
          sortBy,
        },
        headers: { Authorization: `Bearer ${token}` }
      })

      setProducts(Array.isArray(data.products) ? data.products : [])
      const pagination = data.pagination || {}
      setTotalPages(Math.max(1, Number(pagination.totalPages || 1)))
      setTotalProducts(Number(pagination.totalProducts || 0))
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/store/categories')
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user, sortBy, filterCategory, searchQuery, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, filterCategory, searchQuery])

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setShowViewer(true)
  }

  const openViewer = (product) => {
    setSelectedProduct(product)
    setShowViewer(true)
  }

  if (loading) return <Loading />

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Media</h1>
        <p className="text-slate-600">View and manage product images</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Products
            </label>
            <input
              type="text"
              placeholder="Search by product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length > 0 ? (
          products.map(product => (
            <div
              key={product._id}
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
              onClick={() => openViewer(product)}
            >
              {/* Product Image */}
              <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={getImageSrc(product.images[0])}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200">
                    <ImageIcon size={40} className="text-slate-400" />
                  </div>
                )}
                {product.images && product.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs font-medium">
                    +{product.images.length - 1} more
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-slate-500 text-xs mb-3">
                  {product.images ? `${product.images.length} image${product.images.length !== 1 ? 's' : ''}` : '0 images'}
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">
                    {currency}{product.salePrice || product.price}
                  </p>
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      openViewer(product)
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">
              {totalProducts === 0
                ? 'No products found. Add products to see their images here.'
                : 'No products match your search or filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            Showing page {currentPage} of {totalPages} ({totalProducts} products)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showViewer && selectedProduct && (
        <ProductImageViewer
          product={selectedProduct}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  )
}
