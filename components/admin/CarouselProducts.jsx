import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/lib/useAuth';
import { FiSearch, FiCheck, FiX, FiSave, FiGrid, FiList } from 'react-icons/fi';

export default function CarouselProducts() {
  const [allProducts, setAllProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const { getToken } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [{ data: all }, { data: carousel }] = await Promise.all([
          axios.get('/api/products?limit=1000'),
          axios.get('/api/store/carousel-products'),
        ]);
        setAllProducts(all.products || []);
        setSelected(carousel.productIds || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleProduct = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const clearAll = () => setSelected([]);

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await axios.post(
        '/api/store/carousel-products',
        { productIds: selected },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('success', 'Carousel saved successfully!');
    } catch {
      showToast('error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = allProducts.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProducts = allProducts.filter((p) => selected.includes(p._id));

  const getImage = (p) => p.images?.[0]?.url || p.images?.[0] || '/placeholder.png';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading products…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold transition-all
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <FiCheck size={16} /> : <FiX size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Carousel Slider</h1>
          <p className="text-gray-500 mt-1 text-sm">Pick products to display in your homepage carousel. Changes apply after saving.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT — Product Picker */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search products by name or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{filtered.length} products</span>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                  title="Grid view"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                  title="List view"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((product) => {
                  const isSelected = selected.includes(product._id);
                  return (
                    <div
                      key={product._id}
                      onClick={() => toggleProduct(product._id)}
                      className={`relative bg-white rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden group hover:shadow-lg
                        ${isSelected
                          ? 'border-indigo-500 shadow-md shadow-indigo-100'
                          : 'border-gray-200 hover:border-indigo-300'
                        }`}
                    >
                      {/* Checkmark overlay */}
                      <div className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all
                        ${isSelected ? 'bg-indigo-500 scale-100 opacity-100' : 'bg-white border-2 border-gray-300 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'}`}>
                        <FiCheck size={12} className="text-white" strokeWidth={3} />
                      </div>

                      {/* Image */}
                      <div className={`aspect-square flex items-center justify-center p-3 transition-colors
                        ${isSelected ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                        <img
                          src={getImage(product)}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5">{product.name}</p>
                        <p className="text-sm font-bold text-green-600">₹{product.price}</p>
                      </div>

                      {/* Selected footer strip */}
                      {isSelected && (
                        <div className="bg-indigo-500 text-white text-center text-xs py-1 font-semibold">
                          ✓ Added to carousel
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {filtered.map((product) => {
                  const isSelected = selected.includes(product._id);
                  return (
                    <div
                      key={product._id}
                      onClick={() => toggleProduct(product._id)}
                      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors
                        ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                        {isSelected && <FiCheck size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <img
                        src={getImage(product)}
                        alt={product.name}
                        className="w-12 h-12 object-contain rounded-lg bg-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                        {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                      </div>
                      <p className="text-sm font-bold text-green-600 shrink-0">₹{product.price}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">No products match your search.</p>
              </div>
            )}
          </div>

          {/* RIGHT — Selected Panel */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-6">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Selected for Carousel</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selected.length} product{selected.length !== 1 ? 's' : ''} chosen</p>
                </div>
                {selected.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Selected Items */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {selectedProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiGrid size={20} className="text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm">No products selected yet.</p>
                    <p className="text-gray-300 text-xs mt-1">Click any product to add it.</p>
                  </div>
                ) : (
                  selectedProducts.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                      <img
                        src={getImage(p)}
                        alt={p.name}
                        className="w-10 h-10 object-contain rounded-lg bg-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs font-bold text-green-600">₹{p.price}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleProduct(p._id); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="Remove"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Save Button */}
              <div className="px-4 py-4 border-t border-gray-100">
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <FiSave size={15} />
                      Save Carousel
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Changes go live immediately on homepage.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
