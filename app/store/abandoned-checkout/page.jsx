"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import Loading from "@/components/Loading";

export default function AbandonedCheckoutPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [carts, setCarts] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, cart, guest-cart, checkout
  const [deletingId, setDeletingId] = useState("");
  const [clearing, setClearing] = useState(false);

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

  if (loading) return <Loading />;

  const sourceLabels = {
    "cart": "🛒 Added to Cart",
    "guest-cart": "👤 Guest Cart",
    "checkout": "💳 At Checkout",
  };

  const filteredCarts = filter === "all" ? carts : carts.filter(c => c.source === filter);

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
          onClick={() => setFilter("cart")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "cart"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          🛒 Added to Cart ({carts.filter(c => c.source === "cart").length})
        </button>
        <button
          onClick={() => setFilter("guest-cart")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "guest-cart"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          👤 Guest ({carts.filter(c => c.source === "guest-cart").length})
        </button>
        <button
          onClick={() => setFilter("checkout")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "checkout"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          💳 Checkout ({carts.filter(c => c.source === "checkout").length})
        </button>
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
          {filteredCarts.map((c) => {
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
                    disabled={deletingId === c?._id || clearing}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === c?._id ? "Deleting..." : "Delete"}
                  </button>
                </div>

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
    </div>
  );
}