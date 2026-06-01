'use client'
import { useMemo, useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import ProductCard from "@/components/ProductCard";
import ProductFilterSidebar from "@/components/ProductFilterSidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NewProductsPage() {
    const products = useSelector(state => state.product.list);
    const productsPerPage = 50;

    const [activeFilters, setActiveFilters] = useState({
        categories: [],
        priceRange: { min: 0, max: 100000 },
        rating: 0,
        inStock: false,
        sortBy: 'newest'
    });
    const [currentPage, setCurrentPage] = useState(1);

    // Sort products by creation date (newest first baseline)
    const newProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // newest first
        });
    }, [products]);

    const applyFilters = useCallback((productsToFilter) => {
        return productsToFilter.filter(product => {
            if (activeFilters.categories.length > 0) {
                const productCategories = [
                    product.category,
                    ...(Array.isArray(product.categories) ? product.categories : [])
                ].filter(Boolean);

                const hasMatchingCategory = productCategories.some(cat =>
                    activeFilters.categories.includes(cat)
                );
                if (!hasMatchingCategory) return false;
            }

            if (product.price < activeFilters.priceRange.min || product.price > activeFilters.priceRange.max) {
                return false;
            }

            if (activeFilters.rating > 0) {
                const avgRating = product.averageRating || 0;
                if (avgRating < activeFilters.rating) return false;
            }

            if (activeFilters.inStock && product.inStock === false) {
                return false;
            }

            return true;
        });
    }, [activeFilters]);

    const sortProducts = useCallback((productsToSort) => {
        const sorted = [...productsToSort];

        switch (activeFilters.sortBy) {
            case 'price-low-high':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price-high-low':
                return sorted.sort((a, b) => b.price - a.price);
            case 'rating':
                return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
            case 'discount':
                return sorted.sort((a, b) => {
                    const discountA = a.mrp > a.price ? ((a.mrp - a.price) / a.mrp * 100) : 0;
                    const discountB = b.mrp > b.price ? ((b.mrp - b.price) / b.mrp * 100) : 0;
                    return discountB - discountA;
                });
            case 'newest':
            default:
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
        }
    }, [activeFilters.sortBy]);

    const filteredAndSortedProducts = useMemo(() => {
        const filtered = applyFilters(newProducts);
        return sortProducts(filtered);
    }, [newProducts, applyFilters, sortProducts]);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredAndSortedProducts.length / productsPerPage));
    }, [filteredAndSortedProducts.length]);

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * productsPerPage;
        return filteredAndSortedProducts.slice(start, start + productsPerPage);
    }, [filteredAndSortedProducts, currentPage]);

    const pageNumbers = useMemo(() => {
        const pages = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        const start = Math.max(1, currentPage - 3);
        const end = Math.min(totalPages, start + maxVisiblePages - 1);
        const adjustedStart = Math.max(1, end - maxVisiblePages + 1);

        for (let i = adjustedStart; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }, [currentPage, totalPages]);

    const handleFilterChange = useCallback((filters) => {
        setActiveFilters(filters);
        setCurrentPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setActiveFilters({
            categories: [],
            priceRange: { min: 0, max: 100000 },
            rating: 0,
            inStock: false,
            sortBy: 'newest'
        });
        setCurrentPage(1);
    }, []);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1700px] mx-auto px-2 sm:px-3 lg:px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">New Arrivals</h1>
                    <p className="text-gray-600">Check out our latest products just added to the store</p>
                </div>

                <div className="flex gap-6">
                    {/* Filter Sidebar */}
                    <div className="hidden lg:block flex-shrink-0">
                        <ProductFilterSidebar
                            products={newProducts}
                            onFilterChange={handleFilterChange}
                            initialFilters={activeFilters}
                        />
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1">
                        <div className="mb-3 text-sm text-gray-600">
                            Showing {filteredAndSortedProducts.length === 0 ? 0 : (currentPage - 1) * productsPerPage + 1}-
                            {Math.min(currentPage * productsPerPage, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} products
                        </div>
                        {filteredAndSortedProducts.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                                <p className="text-gray-500 text-lg">No products match your filters.</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 lg:gap-3">
                                    {paginatedProducts.map((product, idx) => (
                                        <ProductCard
                                            key={product._id || product.id || product.slug || idx}
                                            product={product}
                                            compact={true}
                                        />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft size={15} /> Prev
                                        </button>

                                        {pageNumbers[0] > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(1)}
                                                    className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    1
                                                </button>
                                                {pageNumbers[0] > 2 && <span className="px-1 text-sm text-gray-400">...</span>}
                                            </>
                                        )}

                                        {pageNumbers.map((page) => (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-2 rounded-md border text-sm ${
                                                    currentPage === page
                                                        ? 'border-orange-600 bg-orange-600 text-white'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        {pageNumbers[pageNumbers.length - 1] < totalPages && (
                                            <>
                                                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    {totalPages}
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next <ChevronRight size={15} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
