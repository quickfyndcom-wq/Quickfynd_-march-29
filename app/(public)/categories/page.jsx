'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, Folder, ShoppingBag } from 'lucide-react'

const normalizeKey = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

const extractCategoryFromUrl = (url = '') => {
    if (!url) return ''
    try {
        const parsed = new URL(url, 'http://local')
        const byQuery = parsed.searchParams.get('category')
        if (byQuery) return byQuery
    } catch {
    }

    const match = String(url).match(/category=([^&]+)/i)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
}

const getCategoryImageSrc = (category) => {
    if (!category) return ''
    return category.image || category.imageUrl || category.thumbnail || ''
}

const addImageMapEntry = (map, item) => {
    if (!item) return
    const image = getCategoryImageSrc(item)
    if (!image) return

    const urlCategory = extractCategoryFromUrl(item?.url)
    const keys = [item.id, item._id, item.categoryId, item.slug, item.name, item.url, urlCategory]
        .filter(Boolean)
        .flatMap((value) => {
            const raw = String(value).trim().toLowerCase()
            const normalized = normalizeKey(value)
            return normalized && normalized !== raw ? [raw, normalized] : [raw]
        })

    keys.forEach((key) => {
        if (!map[key]) {
            map[key] = image
        }
    })
}

const collectMenuImageMap = (items = [], map = {}) => {
    if (!Array.isArray(items)) return map

    items.forEach((item) => {
        addImageMapEntry(map, item)
        if (Array.isArray(item?.children) && item.children.length) {
            collectMenuImageMap(item.children, map)
        }
    })

    return map
}

const getFallbackImageFromMap = (category, imageMap) => {
    if (!category || !imageMap) return ''

    const keys = [category.id, category._id, category.categoryId, category.slug, category.name]
        .filter(Boolean)
        .flatMap((value) => {
            const raw = String(value).trim().toLowerCase()
            const normalized = normalizeKey(value)
            return normalized && normalized !== raw ? [raw, normalized] : [raw]
        })

    for (const key of keys) {
        if (imageMap[key]) {
            return imageMap[key]
        }
    }

    return ''
}

const attachFallbackImages = (category, imageMap) => {
    const fallbackImage = getCategoryImageSrc(category) || getFallbackImageFromMap(category, imageMap)
    const nextChildren = Array.isArray(category?.children)
        ? category.children.map((child) => ({
            ...child,
            image: getCategoryImageSrc(child) || getFallbackImageFromMap(child, imageMap),
        }))
        : []

    return {
        ...category,
        image: fallbackImage,
        children: nextChildren,
    }
}

const getPlaceholderStyle = (seed = '') => {
    const shades = [
        'from-slate-100 to-slate-200',
        'from-blue-100 to-indigo-100',
        'from-orange-100 to-amber-100',
        'from-emerald-100 to-teal-100',
        'from-purple-100 to-fuchsia-100',
    ]

    const text = String(seed || '')
    const firstCode = text ? text.charCodeAt(0) : 0
    const idx = (text.length + firstCode) % shades.length
    return shades[Math.abs(idx)]
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const [categoriesRes, menuRes, homeMenuRes, homeCategoriesRes] = await Promise.all([
                    fetch('/api/store/categories'),
                    fetch('/api/store/category-menu/public').catch(() => null),
                    fetch('/api/store/home-menu-categories').catch(() => null),
                    fetch('/api/store/home-categories/public').catch(() => null),
                ])

                const categoriesData = await categoriesRes.json()
                const menuData = menuRes ? await menuRes.json() : { categories: [] }
                const homeMenuData = homeMenuRes ? await homeMenuRes.json() : { items: [] }
                const homeCategoriesData = homeCategoriesRes ? await homeCategoriesRes.json() : { categories: [] }

                if (categoriesData?.categories) {
                    const imageMap = collectMenuImageMap(menuData?.categories || [])
                    collectMenuImageMap(homeMenuData?.items || [], imageMap)
                    collectMenuImageMap(homeCategoriesData?.categories || [], imageMap)

                    const withFallbackImages = categoriesData.categories.map((category) =>
                        attachFallbackImages(category, imageMap),
                    )
                    setCategories(withFallbackImages)
                }
            } catch (error) {
                console.error('Error fetching categories:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
    }, [])

    const parentCategories = categories.filter((category) => !category.parentId)

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm px-5 py-5 sm:px-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Shop by Category</h1>
                    <p className="text-slate-600 mt-1">Browse our wide selection of products</p>
                </div>

                {parentCategories.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                        {parentCategories.map((parent) => {
                            const categorySlug = parent?.slug || parent?.name || ''
                            return (
                                <Link
                                    key={parent.id || parent._id}
                                    href={`/shop?category=${encodeURIComponent(categorySlug)}`}
                                    className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
                                >
                                    <div className={`aspect-square rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-slate-200 ${getCategoryImageSrc(parent) ? 'bg-slate-100' : `bg-gradient-to-br ${getPlaceholderStyle(parent.name)}`} `}>
                                        {getCategoryImageSrc(parent) ? (
                                            <img
                                                src={getCategoryImageSrc(parent)}
                                                alt={parent.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Folder size={32} className="text-slate-500" />
                                                <span className="text-[10px] text-slate-500 font-medium">No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
                                        <h2 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                                            {parent.name}
                                        </h2>
                                        <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-2xl text-gray-400 mb-2">No categories available</p>
                        <p className="text-gray-500">Categories will appear here once they are added</p>
                    </div>
                )}
            </div>
        </div>
    )
}
