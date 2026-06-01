"use client";
import { useEffect, useState } from 'react';

import axios from 'axios';

export default function ProductSelect({ value, onChange, selectedIds = [], products: propProducts }) {
  const [products, setProducts] = useState(propProducts || []);
  const [loading, setLoading] = useState(!propProducts);
  const [query, setQuery] = useState('');
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    if (Array.isArray(propProducts)) {
      setProducts(propProducts);
      setLoading(false);
    }
  }, [propProducts]);

  const getProductId = (product) => String(product?._id || product?.id || '');

  const filteredProducts = products.filter((product) => {
    const name = String(product?.name || '').toLowerCase();
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return name.includes(q);
  });

  useEffect(() => {
    if (!propProducts || propProducts.length === 0) {
      axios.get('/api/store/product')
        .then(res => setProducts(res.data.products || []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }
  }, [propProducts]);

  // Reset dropdown after selection
  useEffect(() => {
    if (localValue) setLocalValue('');
  }, [selectedIds]);

  return (
    <>
      <input
        type="text"
        className="w-full border rounded-lg px-3 py-2 mb-2"
        placeholder="Search product by name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={loading}
      />
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={localValue}
        onChange={e => {
          const val = e.target.value;
          const selectedProduct = products.find((product) => getProductId(product) === val);
          if (val && !selectedIds.includes(val)) {
            onChange(val, selectedProduct || null);
          }
          setLocalValue('');
        }}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading products...' : (filteredProducts.length === 0 ? 'No products found' : 'Select a product')}</option>
        {filteredProducts.map((product) => {
          const productId = getProductId(product);
          const productName = String(product?.name || 'Untitled Product');
          return (
          <option key={productId} value={productId} disabled={selectedIds.includes(productId)}>
            {productName.length > 40 ? productName.slice(0, 40) + '\u2026' : productName}
          </option>
          );
        })}
      </select>
      {!loading && filteredProducts.length === 0 && (
        <div className="text-xs text-red-500 mt-1">No products found. Please add products first.</div>
      )}
    </>
  );
}
