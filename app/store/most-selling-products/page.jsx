"use client"
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function MostSellingProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");
        // Replace with your actual API endpoint for most selling products
        const { data } = await axios.get("/api/public/most-selling-products");
        setProducts(Array.isArray(data?.products) ? data.products : []);
      } catch (err) {
        setError("Failed to load most selling products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold mb-6">Most Selling Products</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="overflow-x-auto w-full rounded-md shadow border border-gray-200 mt-6">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Total Orders</th>
              <th className="px-4 py-3">Stock Available</th>
              <th className="px-4 py-3">Delivered</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product, idx) => (
              <tr key={product._id || product.id}>
                <td className="pl-6 text-green-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{product.name}</td>
                <td className="px-4 py-3 font-bold text-blue-700">{product.totalOrders || 0}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{typeof product.stockQuantity === 'number' ? product.stockQuantity : (product.stockQuantity || 0)}</td>
                <td className="px-4 py-3 font-bold text-green-700">{product.deliveredCount || 0}</td>
                <td className="px-4 py-3 font-bold text-fuchsia-700">{typeof product.profit === 'number' ? `₹${product.profit}` : '-'}</td>
                <td className="px-4 py-3">
                  <Link href={`/product/${product._id}`} className="inline-flex items-center text-blue-600 hover:text-blue-900" title="Go to product page">
                    <ChevronRight size={20} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && products.length === 0 && <div className="text-slate-500 mt-8 text-center">No data found.</div>}
    </div>
  );
}
