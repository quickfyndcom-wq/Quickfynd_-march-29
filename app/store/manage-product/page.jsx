
'use client'
import { useAuth } from '@/lib/useAuth';

export const dynamic = 'force-dynamic'
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { fetchProducts as fetchProductsAction } from "@/lib/features/product/productSlice"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Link from "next/link"
import Loading from "@/components/Loading"

import axios from "axios"
import ProductForm from "../add-product/page"



export default function StoreManageProducts() {
    const dispatch = useDispatch();

    const { user, getToken } = useAuth();

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [editingProduct, setEditingProduct] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [categoryMap, setCategoryMap] = useState({}) // Map of category ID to name
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('') // Category filter
    const [showFbtModal, setShowFbtModal] = useState(false)
    const [fbtBaseProduct, setFbtBaseProduct] = useState(null)
    const [fbtEnabled, setFbtEnabled] = useState(false)
    const [selectedFbtIds, setSelectedFbtIds] = useState([])
    const [fbtSearchQuery, setFbtSearchQuery] = useState('')
    const [fbtDiscountPercent, setFbtDiscountPercent] = useState('')
    const [savingFbt, setSavingFbt] = useState(false)

    const getImageSrc = (image) => {
        if (typeof image === 'string' && image.trim()) return image
        if (image && typeof image === 'object') {
            const directUrl = image.url || image.src || image.thumbnailUrl
            if (typeof directUrl === 'string' && directUrl.trim()) return directUrl

            const imagePath = image.filePath || image.path
            const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
            if (typeof imagePath === 'string' && imagePath.trim() && endpoint) {
                const safeEndpoint = endpoint.replace(/\/+$/, '')
                const safePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
                return `${safeEndpoint}${safePath}`
            }
        }
        return 'https://ik.imagekit.io/jrstupuke/placeholder.png'
    }

    const fetchStoreProducts = async () => {
        try {
             const token = await getToken()
             const { data } = await axios.get('/api/store/product', {headers: { Authorization: `Bearer ${token}` } })
             setProducts(data.products.sort((a, b)=> new Date(b.createdAt) - new Date(a.createdAt)))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    // Fetch all categories to map IDs to names
    const fetchCategories = async () => {
        try {
            const { data } = await axios.get('/api/store/categories')
            const map = {}
            data.categories?.forEach(cat => {
                map[cat._id] = cat.name
            })
            setCategoryMap(map)
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const toggleStock = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/stock-toggle',{ productId }, {headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product =>  product._id === productId ? {...product, inStock: !product.inStock} : product))

            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const toggleFastDelivery = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/fast-delivery-toggle', { productId }, {headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product => 
                product._id === productId ? {...product, fastDelivery: !product.fastDelivery} : product
            ))
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleEdit = (product) => {
        console.log('Editing product:', product)
        console.log('  - product.category:', product.category)
        console.log('  - product.categories:', product.categories)
        console.log('  - categories is array?', Array.isArray(product.categories))
        setEditingProduct(product)
        setShowEditModal(true)
    }

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return
        
        try {
            const token = await getToken()
            await axios.delete(`/api/store/product?productId=${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(prevProducts => prevProducts.filter(p => p._id !== productId))
            toast.success('Product deleted successfully')
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleUpdateSuccess = (updatedProduct) => {
        setProducts(prevProducts => prevProducts.map(p => 
            p._id === updatedProduct._id ? updatedProduct : p
        ))
        setShowEditModal(false)
        setEditingProduct(null)
        // Refresh global Redux product list so frontend always uses latest slug
        dispatch(fetchProductsAction({}));
    }

    const openFbtModal = async (product) => {
        setFbtBaseProduct(product)
        setFbtSearchQuery('')
        setSavingFbt(false)
        try {
            const { data } = await axios.get(`/api/products/${product._id}/fbt`)
            setFbtEnabled(Boolean(data?.enableFBT))
            setSelectedFbtIds(Array.isArray(data?.products) ? data.products.map(p => String(p._id)) : [])
            setFbtDiscountPercent(data?.bundleDiscount !== null && data?.bundleDiscount !== undefined ? String(data.bundleDiscount) : '')
        } catch {
            setFbtEnabled(false)
            setSelectedFbtIds([])
            setFbtDiscountPercent('')
        }
        setShowFbtModal(true)
    }

    const closeFbtModal = () => {
        setShowFbtModal(false)
        setFbtBaseProduct(null)
        setSelectedFbtIds([])
        setFbtEnabled(false)
        setFbtSearchQuery('')
        setFbtDiscountPercent('')
        setSavingFbt(false)
    }

    const toggleFbtSelection = (productId) => {
        setSelectedFbtIds(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId])
    }

    const saveFbtConfig = async () => {
        if (!fbtBaseProduct?._id) return
        if (fbtEnabled && selectedFbtIds.length === 0) {
            toast.error('Select at least one product when FBT is enabled')
            return
        }

        const discountValue = Number(fbtDiscountPercent || 0)
        if (fbtEnabled && fbtDiscountPercent !== '' && (Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100)) {
            toast.error('Discount must be between 0 and 100')
            return
        }

        try {
            setSavingFbt(true)
            await axios.patch(`/api/products/${fbtBaseProduct._id}/fbt`, {
                enableFBT: fbtEnabled,
                fbtProductIds: fbtEnabled ? selectedFbtIds : [],
                fbtBundlePrice: null,
                fbtBundleDiscount: fbtEnabled && fbtDiscountPercent !== '' ? discountValue : null,
            })

            setProducts(prev => prev.map((p) => p._id === fbtBaseProduct._id
                ? {
                    ...p,
                    enableFBT: fbtEnabled,
                    fbtProductIds: fbtEnabled ? selectedFbtIds : [],
                    fbtBundleDiscount: fbtEnabled && fbtDiscountPercent !== '' ? discountValue : null,
                }
                : p))

            toast.success('Frequently bought together saved')
            closeFbtModal()
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to save FBT config')
        } finally {
            setSavingFbt(false)
        }
    }

    useEffect(() => {
        if(user){
            fetchStoreProducts()
            fetchCategories()
        }  
    }, [user])

    if (loading) return <Loading />

    // Filter products based on search query and selected category
    const filteredProducts = products.filter(product => {
        // Filter by selected category
        if (selectedCategory) {
            const hasCategory = product.categories?.includes(selectedCategory) || product.category === selectedCategory;
            if (!hasCategory) return false;
        }

        // Filter by search query
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase().trim();

        // Search in product name (partial match)
        if ((product.name || '').toLowerCase().includes(query)) return true;

        // Search in SKU (partial match)
        if ((product.sku || '').toLowerCase().includes(query)) return true;

        // Search in categories (partial match)
        if (product.categories?.some(catId => (categoryMap[catId] || '').toLowerCase().includes(query))) return true;
        if ((categoryMap[product.category] || '').toLowerCase().includes(query)) return true;

        // Search in tags (partial match)
        if (product.tags?.some(tag => (tag || '').toLowerCase().includes(query))) return true;

        // Search in description (partial match)
        if ((product.description || '').toLowerCase().includes(query)) return true;
        
        return false;
    });

    const fbtCandidates = (() => {
        if (!fbtBaseProduct?._id) return []
        const baseTags = Array.isArray(fbtBaseProduct.tags)
            ? fbtBaseProduct.tags.map(t => String(t || '').toLowerCase().trim()).filter(Boolean)
            : []
        const query = fbtSearchQuery.toLowerCase().trim()

        return products
            .filter(p => p._id !== fbtBaseProduct._id)
            .map((p) => {
                const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t || '').toLowerCase().trim()).filter(Boolean) : []
                const matchingTagCount = baseTags.length > 0 ? tags.filter(t => baseTags.includes(t)).length : 0
                return { ...p, matchingTagCount }
            })
            .filter((p) => {
                if (!query) return true
                return (p.name || '').toLowerCase().includes(query)
                    || (p.sku || '').toLowerCase().includes(query)
                    || (Array.isArray(p.tags) && p.tags.some(tag => String(tag || '').toLowerCase().includes(query)))
            })
            .sort((a, b) => {
                if (b.matchingTagCount !== a.matchingTagCount) return b.matchingTagCount - a.matchingTagCount
                return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
            })
    })()

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-5 max-w-5xl">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Products</span></h1>
                <Link
                    href="/store/add-product"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                    + Add Product
                </Link>
            </div>
            
            {/* Search Bar and Category Filter */}
            <div className="mb-6 max-w-5xl flex gap-4 flex-wrap">
                <div className="flex-1 min-w-xs">
                    <input
                        type="text"
                        placeholder="Search products by name, SKU, category, tags, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <p className="text-sm text-slate-600 mt-2">
                            Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                
                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">All Categories</option>
                    {Object.entries(categoryMap).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                    ))}
                </select>
            </div>

            {/* Quick Category Filter Buttons */}
            <div className="mb-6 max-w-5xl">
                <p className="text-sm text-gray-600 font-medium mb-3">Quick Filter by Category:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {['Trending & Featured', "Men's Fashion", "Women's Fashion", 'Kids', 'Electronics', 'Mobile Accessories', 'Home & Kitchen', 'Beauty', 'Car Essentials'].map((categoryName) => {
                        const categoryId = Object.entries(categoryMap).find(([_, name]) => name === categoryName)?.[0];
                        const isSelected = selectedCategory === categoryId;
                        return (
                            <button
                                key={categoryName}
                                onClick={() => setSelectedCategory(isSelected ? '' : (categoryId || ''))}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                            >
                                {categoryName}
                            </button>
                        );
                    })}
                </div>
                
                {/* Selected Category Pills */}
                {selectedCategory && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(categoryMap)
                            .filter(([id]) => id === selectedCategory)
                            .map(([id, name]) => (
                                <div
                                    key={id}
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium"
                                >
                                    {name}
                                    <button
                                        onClick={() => setSelectedCategory('')}
                                        className="ml-1 hover:opacity-70 transition"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {filteredProducts.length === 0 ? (
                <div className="w-full max-w-5xl ring ring-slate-200 rounded p-8 text-center bg-white">
                    <p className="text-slate-600 mb-4">No products found. Add your first product to get started.</p>
                    <Link
                        href="/store/add-product"
                        className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                    >
                        + Add Product
                    </Link>
                </div>
            ) : (
            <table className="w-full max-w-5xl text-left  ring ring-slate-200  rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden lg:table-cell">SKU</th>
                        <th className="px-4 py-3 hidden md:table-cell">Categories</th>
                        <th className="px-4 py-3 hidden xl:table-cell">Tags</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Fast Delivery</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Frequently</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {filteredProducts.map((product) => (
                        <tr key={product._id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} unoptimized className='p-1 shadow rounded cursor-pointer' src={getImageSrc(product.images?.[0] || product.image)} alt="" />
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{product.sku || '-'}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                {product.categories && product.categories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {product.categories.map((catId, idx) => (
                                            <span key={idx} className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                {categoryMap[catId] || catId}
                                            </span>
                                        ))}
                                    </div>
                                ) : product.category ? (
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                        {categoryMap[product.category] || product.category}
                                    </span>
                                ) : (
                                    <span className="text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                                {product.tags && product.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {product.tags.map((tag, idx) => (
                                            <span key={idx} className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">
                                {product.description?.replace(/<[^>]*>/g, ' ').trim().substring(0, 100)}...
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency} {product.mrp.toLocaleString()}</td>
                            <td className="px-4 py-3">{currency} {product.price.toLocaleString()}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        onChange={() => toast.promise(toggleFastDelivery(product._id), { loading: "Updating..." })} 
                                        checked={product.fastDelivery || false} 
                                    />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                                {product.enableFBT ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                        Enabled
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                        Disabled
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleStock(product._id), { loading: "Updating..." })} checked={product.inStock} />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEdit(product)}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product._id)}
                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => openFbtModal(product)}
                                        className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition"
                                    >
                                        FBT
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}

            {showEditModal && (
                <ProductForm 
                    product={editingProduct}
                    onClose={() => {
                        setShowEditModal(false)
                        setEditingProduct(null)
                    }}
                    onSubmitSuccess={handleUpdateSuccess}
                />
            )}

            {showFbtModal && fbtBaseProduct && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Frequently Bought Together</h2>
                                <p className="text-sm text-slate-500">Base product: {fbtBaseProduct.name}</p>
                            </div>
                            <button onClick={closeFbtModal} className="text-slate-500 hover:text-slate-700 text-sm">Close</button>
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <label className="text-sm font-medium text-slate-700">Enable frequently bought together</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={fbtEnabled}
                                    onChange={(e) => setFbtEnabled(e.target.checked)}
                                />
                                <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 transition-colors duration-200"></div>
                                <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                            </label>
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                value={fbtSearchQuery}
                                onChange={(e) => setFbtSearchQuery(e.target.value)}
                                placeholder="Search products by name, SKU or tags..."
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">FBT Discount (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={fbtDiscountPercent}
                                disabled={!fbtEnabled}
                                onChange={(e) => setFbtDiscountPercent(e.target.value)}
                                placeholder="e.g. 10"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">Leave empty for no discount. This % applies to the whole frequent bundle.</p>
                        </div>

                        <p className="text-xs text-slate-500 mb-3">Products are sorted by matching tags first.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                            {fbtCandidates.map((candidate) => {
                                const isSelected = selectedFbtIds.includes(candidate._id)
                                return (
                                    <button
                                        key={candidate._id}
                                        type="button"
                                        disabled={!fbtEnabled}
                                        onClick={() => toggleFbtSelection(candidate._id)}
                                        className={`text-left border rounded-lg p-3 transition ${
                                            isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                        } ${!fbtEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Image width={38} height={38} unoptimized src={getImageSrc(candidate.images?.[0] || candidate.image)} alt="" className="rounded border" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{candidate.name}</p>
                                                <p className="text-xs text-slate-500">{currency} {Number(candidate.price || 0).toLocaleString()}</p>
                                                {candidate.matchingTagCount > 0 && (
                                                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">{candidate.matchingTagCount} matching tag(s)</p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-600">Selected: <span className="font-semibold">{selectedFbtIds.length}</span></p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={closeFbtModal}
                                    className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveFbtConfig}
                                    disabled={savingFbt}
                                    className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {savingFbt ? 'Saving...' : 'Save FBT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}