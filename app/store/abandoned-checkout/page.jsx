"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";

export default function AbandonedCheckoutPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [carts, setCarts] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, cart, guest-cart, checkout
  const [deletingId, setDeletingId] = useState("");
  const [clearing, setClearing] = useState(false);
  const [convertingId, setConvertingId] = useState("");
  const [activeConvertId, setActiveConvertId] = useState("");
  const [employeeNames, setEmployeeNames] = useState({});
  const [convertConfirmCart, setConvertConfirmCart] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const asText = (value, fallback = "-") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value.trim() || fallback;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return fallback;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const formatCurrency = (amount, currency = "INR") => {
    const numberAmount = Number(amount);
    if (Number.isNaN(numberAmount)) return "-";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numberAmount);
    } catch {
      return `Rs ${numberAmount.toLocaleString("en-IN")}`;
    }
  };

  const getItemCount = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + Number(item?.quantity || 1), 0);
  };

  const fetchCarts = async () => {
    try {
      setError("");
      const token = await getToken();
      const { data } = await axios.get("/api/store/abandoned-checkout", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCarts(Array.isArray(data.carts) ? data.carts : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

  const handleDeleteCart = async (cartId) => {
    if (!cartId || deletingId) return;
    const ok = window.confirm("Delete this abandoned checkout record?");
    if (!ok) return;

    try {
      setError("");
      setDeletingId(cartId);
      const token = await getToken();
      await axios.delete(`/api/store/abandoned-checkout?cartId=${encodeURIComponent(cartId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCarts((prev) => prev.filter((c) => c._id !== cartId));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to delete record");
    } finally {
      setDeletingId("");
    }
  };

  const handleClearFiltered = async () => {
    if (filteredCarts.length === 0 || clearing) return;
    const message =
      filter === "all"
        ? `Delete all ${filteredCarts.length} abandoned checkout records?`
        : `Delete ${filteredCarts.length} records from ${sourceLabels[filter]}?`;
    const ok = window.confirm(message);
    if (!ok) return;

    try {
      setError("");
      setClearing(true);
      const token = await getToken();
      await axios.delete(`/api/store/abandoned-checkout?source=${encodeURIComponent(filter)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (filter === "all") {
        setCarts([]);
      } else {
        setCarts((prev) => prev.filter((c) => c.source !== filter));
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to clear records");
    } finally {
      setClearing(false);
    }
  };

  const handleConvertCart = async (cart) => {
    const cartId = cart?._id;
    if (!cartId || convertingId || deletingId) return;
    const employeeName = String(employeeNames[cartId] || '').trim();
    if (!employeeName) {
      setError('Please enter employee name before conversion');
      return;
    }

    try {
      setError('');
      setConvertingId(cartId);
      const token = await getToken();
      const { data } = await axios.post('/api/store/abandoned-checkout', {
        action: 'convertToOrder',
        cartId,
        employeeName,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCarts((prev) => prev.map((record) => {
        if (record._id !== cartId) return record;
        return {
          ...record,
          purchased: true,
          purchasedAt: new Date().toISOString(),
          purchasedOrderId: data?.orderId || record.purchasedOrderId,
          convertedByEmployeeName: employeeName,
          convertedAt: new Date().toISOString(),
        };
      }));

      toast.custom((toastRef) => (
        <div className={`max-w-sm w-full rounded-xl border border-emerald-200 bg-white shadow-lg transition ${toastRef.visible ? 'animate-enter' : 'animate-leave'}`}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">✓</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Converted to Order</p>
                <p className="mt-1 text-xs text-slate-600">Employee: <span className="font-semibold text-slate-800">{employeeName}</span></p>
                <p className="mt-0.5 text-xs text-slate-500">Order ID: {String(data?.orderId || '').slice(-8)}</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 3500 });

      setActiveConvertId('');
      setConvertConfirmCart(null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to convert checkout to order');
    } finally {
      setConvertingId('');
    }
  };

  const openConvertConfirm = (cart) => {
    const cartId = cart?._id;
    if (!cartId || convertingId || deletingId) return;
    const employeeName = String(employeeNames[cartId] || '').trim();
    if (!employeeName) {
      setError('Please enter employee name before conversion');
      return;
    }
    setError('');
    setConvertConfirmCart(cart);
  };

  if (loading) return <Loading />;

  const sourceLabels = {
    "cart": "🛒 Added to Cart",
    "guest-cart": "👤 Guest Cart",
    "checkout": "💳 At Checkout",
    "purchased": "✓ Purchased",
    "abandoned": "⚠ Abandoned",
  };

  const filteredCarts = filter === "all" 
    ? carts 
    : filter === "purchased"
    ? carts.filter(c => c.purchased)
    : filter === "abandoned"
    ? carts.filter(c => !c.purchased)
    : carts.filter(c => c.source === filter);

  const totalItems = filteredCarts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCarts = filteredCarts.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Abandoned Checkout</h1>
        <button
          onClick={handleClearFiltered}
          disabled={filteredCarts.length === 0 || clearing}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearing ? "Deleting..." : filter === "all" ? "Delete All" : `Delete ${sourceLabels[filter]}`}
        </button>
      </div>
      {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-4">{error}</div>}

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          All ({carts.length})
        </button>
        <button
          onClick={() => setFilter("purchased")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "purchased"
              ? "bg-green-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          ✓ Purchased ({carts.filter(c => c.purchased).length})
        </button>
        <button
          onClick={() => setFilter("abandoned")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "abandoned"
              ? "bg-orange-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          ⚠ Abandoned ({carts.filter(c => !c.purchased).length})
        </button>
        <button
          onClick={() => setFilter("checkout")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "checkout"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          💳 At Checkout ({carts.filter(c => c.source === "checkout").length})
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-sm text-slate-600">
          Showing {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} of {totalItems}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per page</label>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value) || 10)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredCarts.length === 0 ? (
        <div className="text-center py-10 text-slate-500 border rounded">
          {filter === "all" 
            ? "No abandoned checkouts yet."
            : `No abandoned carts from ${sourceLabels[filter]}.`
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedCarts.map((c) => {
            const customerName = asText(c?.name, "Name not provided");
            const email = asText(c?.email, "Email not provided");
            const phone = asText(c?.phone, "-");
            const addressLine = [
              asText(c?.address?.street, ""),
              asText(c?.address?.city, ""),
              asText(c?.address?.district, ""),
              asText(c?.address?.state, ""),
              asText(c?.address?.pincode, ""),
              asText(c?.address?.country, ""),
            ].filter(Boolean).join(", ");

            return (
              <div key={asText(c?._id, Math.random().toString())} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {sourceLabels[c?.source] || asText(c?.source, "Unknown")}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">{customerName}</h2>
                    <p className="text-sm text-slate-600">{email}</p>
                    <p className="text-xs text-slate-500">{phone}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCart(c?._id)}
                    disabled={deletingId === c?._id || clearing || convertingId === c?._id}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === c?._id ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setActiveConvertId((prev) => (prev === c?._id ? '' : c?._id))}
                    disabled={deletingId === c?._id || clearing || convertingId === c?._id || c?.purchased}
                    className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {c?.purchased ? 'Converted' : 'Conversion'}
                  </button>
                </div>

                {activeConvertId === c?._id && !c?.purchased && (
                  <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-blue-800">Convert to Placed Order</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        placeholder="Enter employee name"
                        value={employeeNames[c?._id] || ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmployeeNames((prev) => ({ ...prev, [c?._id]: value }));
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => openConvertConfirm(c)}
                        disabled={convertingId === c?._id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {convertingId === c?._id ? 'Converting...' : 'Convert to Order'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cart Summary</p>
                    <p className="mt-1 text-slate-800">Items: {getItemCount(c?.items)}</p>
                    <p className="text-slate-800">Total: {formatCurrency(c?.cartTotal, asText(c?.currency, "INR"))}</p>
                    <p className="text-slate-600">Last seen: {formatDate(c?.lastSeenAt)}</p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Mail</p>
                    {c?.recoveryEmailSentAt ? (
                      <>
                        <p className="mt-1 font-medium text-emerald-700">Auto Mail Sent</p>
                        <p className="text-slate-700">Sent: {formatDate(c?.recoveryEmailSentAt)}</p>
                        <p className="text-slate-600">Expires: {formatDate(c?.recoveryOfferExpiresAt)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-slate-600">Not sent</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-1 text-sm text-slate-700">{addressLine || "Not provided"}</p>
                  {c?.purchased && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">Converted to order</span>
                      {c?.convertedByEmployeeName && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">
                          By {c.convertedByEmployeeName}
                        </span>
                      )}
                      {c?.convertedAt && (
                        <span className="text-slate-600">at {formatDate(c.convertedAt)}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products</p>
                  {Array.isArray(c?.items) && c.items.length > 0 ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {c.items.slice(0, 8).map((item, idx) => (
                        <div key={`${asText(item?.name, "product")}-${idx}`} className="rounded-md border border-slate-200 bg-white p-2">
                          <p className="truncate text-sm font-medium text-slate-900">{asText(item?.name, "Product")}</p>
                          <p className="text-xs text-slate-600">Qty: {Number(item?.quantity || 1)}</p>
                          <p className="text-xs font-semibold text-slate-800">{formatCurrency(item?.price, asText(c?.currency, "INR"))}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No items</p>
                  )}
                  {Array.isArray(c?.items) && c.items.length > 8 && (
                    <p className="mt-2 text-xs text-slate-500">+{c.items.length - 8} more items</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalItems > 0 && totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, idx) => idx + 1)
            .slice(Math.max(0, safeCurrentPage - 3), Math.max(0, safeCurrentPage - 3) + 5)
            .map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  safeCurrentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {convertConfirmCart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-white">
              <p className="text-sm font-semibold tracking-wide">Confirm Conversion</p>
              <p className="text-xs text-blue-100 mt-1">This will create a new order from this checkout.</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Customer:</span> {asText(convertConfirmCart?.name, 'Guest')}</p>
                <p><span className="font-semibold text-slate-900">Employee:</span> {asText(employeeNames[convertConfirmCart?._id], '-')}</p>
                <p><span className="font-semibold text-slate-900">Items:</span> {getItemCount(convertConfirmCart?.items)}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertConfirmCart(null)}
                  disabled={convertingId === convertConfirmCart?._id}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConvertCart(convertConfirmCart)}
                  disabled={convertingId === convertConfirmCart?._id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {convertingId === convertConfirmCart?._id ? 'Converting...' : 'Yes, Convert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}