"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/lib/useAuth";
import Loading from "@/components/Loading";
import { Activity, Clock3, MousePointerClick, ShoppingCart, Users, X } from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-600">{subtitle}</p>}
        </div>
        <Icon className="h-6 w-6 text-slate-700" />
      </div>
    </div>
  );
}

const getCustomerDisplay = (event) => {
  const email = String(event?.customerEmail || '').trim();
  const name = String(event?.customerName || '').trim();
  const phone = String(event?.customerPhone || '').trim();
  const userId = String(event?.userId || '').trim();
  const type = String(event?.customerType || '').trim();

  if (name || email || phone) {
    return {
      title: name || email || phone,
      subtitle: email && name && email !== name ? email : (phone || ''),
      badge: type === 'logged_in' ? 'Logged-in' : 'Guest',
    };
  }

  if (type === 'logged_in') {
    return { title: 'Logged-in user', subtitle: userId ? `User ID: ${userId}` : '', badge: 'Logged-in' };
  }

  return { title: 'Guest', subtitle: '', badge: 'Guest' };
};

const formatSeconds = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}m ${sec}s`;
};

const getEventLabel = (eventType) => {
  const key = String(eventType || "").toLowerCase();
  if (key === "page_view") return "Visited page";
  if (key === "checkout_visit") return "Opened checkout";
  if (key === "product_view") return "Opened product";
  if (key === "product_exit") return "Left product page";
  if (key === "add_to_cart") return "Clicked Add to Cart";
  if (key === "go_to_checkout") return "Clicked Go to Checkout";
  if (key === "order_placed") return "Order placed";
  return key || "Unknown action";
};

const getActionLabel = (nextAction, eventType) => {
  const next = String(nextAction || "").toLowerCase();
  if (next === "address_updated") return "Filled address";
  if (next === "go_to_checkout") return "Go to Checkout";
  if (next === "add_to_cart") return "Add to Cart";
  if (next === "order_placed") return "Place Order";
  if (next === "viewing") return "Browsing";
  return getEventLabel(eventType);
};

const resolveCustomerKey = (event) => {
  if (event?.customerKey) return String(event.customerKey);
  if (event?.visitorId) return `guest:${event.visitorId}`;
  if (event?.sessionId) return `guest_session:${event.sessionId}`;
  if (event?.customerEmail) return `guest_email:${String(event.customerEmail).toLowerCase()}`;
  if (event?.customerPhone) return `guest_phone:${event.customerPhone}`;
  return "";
};

const pickLatestFromTimeline = (timeline, fieldName, fallback = "") => {
  if (!Array.isArray(timeline)) return fallback;
  for (const item of timeline) {
    const value = String(item?.[fieldName] || "").trim();
    if (value) return value;
  }
  return fallback;
};

const getCustomerIdentifier = (summary, timeline, selectedCustomerKey) => {
  const email = String(summary?.customerEmail || pickLatestFromTimeline(timeline, "customerEmail", "")).trim();
  if (email) return email;

  const phone = String(summary?.customerPhone || pickLatestFromTimeline(timeline, "customerPhone", "")).trim();
  if (phone) return phone;

  const userId = String(summary?.userId || pickLatestFromTimeline(timeline, "userId", "")).trim();
  if (userId) return `user:${userId}`;

  return String(selectedCustomerKey || "").trim() || "-";
};

export default function StoreCustomerTrackingPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState("7");
  const [payload, setPayload] = useState(null);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState("");
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

  const fetchTracking = async () => {
    try {
      setError("");
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`/api/store/customer-tracking?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayload(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load tracking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [days]);

  const fetchCustomerDetails = async (customerKey) => {
    if (!customerKey) return;
    try {
      setCustomerDetailsLoading(true);
      const token = await getToken();
      const { data } = await axios.get(
        `/api/store/customer-tracking?days=${days}&customerKey=${encodeURIComponent(customerKey)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedCustomerData({
        customerSummary: data?.customerSummary || null,
        customerTimeline: Array.isArray(data?.customerTimeline) ? data.customerTimeline : [],
      });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load customer details");
      setSelectedCustomerData({ customerSummary: null, customerTimeline: [] });
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const handleOpenCustomer = (event) => {
    const key = resolveCustomerKey(event);
    if (!key) return;
    setSelectedCustomerKey(key);
    setSelectedCustomerData(null);
    fetchCustomerDetails(key);
  };

  const handleCloseCustomer = () => {
    setSelectedCustomerKey("");
    setSelectedCustomerData(null);
  };

  const overview = payload?.overview || {};
  const sourceBreakdown = useMemo(() => payload?.sourceBreakdown || [], [payload]);
  const topProducts = useMemo(() => payload?.topProducts || [], [payload]);
  const recentEvents = useMemo(() => payload?.recentEvents || [], [payload]);
  const recentCustomerRows = useMemo(() => {
    const grouped = new Map();

    for (const event of recentEvents) {
      const key = resolveCustomerKey(event) || `event:${event._id}`;
      const eventTime = event?.eventAt ? new Date(event.eventAt).getTime() : 0;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          key,
          latestEvent: event,
          eventCount: 1,
          totalDurationMs: Number(event?.durationMs || 0),
          maxScrollDepth: Number(event?.scrollDepthPercent || 0),
        });
        continue;
      }

      const existingTime = existing.latestEvent?.eventAt ? new Date(existing.latestEvent.eventAt).getTime() : 0;
      if (eventTime >= existingTime) {
        existing.latestEvent = event;
      }
      existing.eventCount += 1;
      existing.totalDurationMs += Number(event?.durationMs || 0);
      existing.maxScrollDepth = Math.max(existing.maxScrollDepth, Number(event?.scrollDepthPercent || 0));
      grouped.set(key, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aTime = a.latestEvent?.eventAt ? new Date(a.latestEvent.eventAt).getTime() : 0;
      const bTime = b.latestEvent?.eventAt ? new Date(b.latestEvent.eventAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [recentEvents]);

  const selectedJourneySteps = useMemo(() => {
    const timeline = Array.isArray(selectedCustomerData?.customerTimeline)
      ? selectedCustomerData.customerTimeline
      : [];

    return timeline
      .slice()
      .sort((a, b) => {
        const aTime = a?.eventAt ? new Date(a.eventAt).getTime() : 0;
        const bTime = b?.eventAt ? new Date(b.eventAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((event, index) => ({
        stepNumber: index + 1,
        time: event?.eventAt ? new Date(event.eventAt).toLocaleString() : "-",
        eventLabel: getEventLabel(event?.eventType),
        actionLabel: getActionLabel(event?.nextAction, event?.eventType),
        productLabel: event?.productName || event?.productSlug || "-",
      }));
  }, [selectedCustomerData]);

  const selectedSummary = useMemo(() => {
    const timeline = Array.isArray(selectedCustomerData?.customerTimeline)
      ? selectedCustomerData.customerTimeline
      : [];
    const summary = selectedCustomerData?.customerSummary || {};

    return {
      customerType: summary.customerType || pickLatestFromTimeline(timeline, "customerType", "guest"),
      userId: summary.userId || pickLatestFromTimeline(timeline, "userId", ""),
      customerName: summary.customerName || pickLatestFromTimeline(timeline, "customerName", ""),
      customerEmail: summary.customerEmail || pickLatestFromTimeline(timeline, "customerEmail", ""),
      customerPhone: summary.customerPhone || pickLatestFromTimeline(timeline, "customerPhone", ""),
      customerAddress: summary.customerAddress || pickLatestFromTimeline(timeline, "customerAddress", ""),
      totalEvents: Number(summary.totalEvents || timeline.length || 0),
      firstSeenAt: summary.firstSeenAt || (timeline.length ? timeline[timeline.length - 1]?.eventAt : null),
      lastSeenAt: summary.lastSeenAt || (timeline.length ? timeline[0]?.eventAt : null),
    };
  }, [selectedCustomerData]);

  const selectedIdentifier = useMemo(() => {
    const timeline = Array.isArray(selectedCustomerData?.customerTimeline)
      ? selectedCustomerData.customerTimeline
      : [];
    return getCustomerIdentifier(selectedSummary, timeline, selectedCustomerKey);
  }, [selectedCustomerData, selectedSummary, selectedCustomerKey]);

  const selectedDisplayFields = useMemo(() => {
    const isLoggedIn = String(selectedSummary?.customerType || "").toLowerCase() === "logged_in";
    const identifier = String(selectedIdentifier || "").trim();
    const identifierIsEmail = identifier.includes("@");
    const identifierIsUserKey = identifier.startsWith("user:");

    const nameValue = selectedSummary?.customerName || (isLoggedIn ? "Logged-in customer" : "-");
    const emailValue = selectedSummary?.customerEmail || (identifierIsEmail ? `${identifier} (from identifier)` : "-");
    const phoneValue = selectedSummary?.customerPhone || "-";

    const emailNote = !selectedSummary?.customerEmail && isLoggedIn
      ? (identifierIsUserKey ? "Email not available from auth provider" : "Email not captured in this session")
      : "";
    const phoneNote = !selectedSummary?.customerPhone && isLoggedIn
      ? "Phone not available from auth provider"
      : "";

    return {
      nameValue,
      emailValue,
      phoneValue,
      emailNote,
      phoneNote,
    };
  }, [selectedSummary, selectedIdentifier]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customer Tracking</h1>
          <p className="text-sm text-slate-600">See where customers came from and how they behaved on product pages.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Range</label>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Visitors" value={Number(overview.uniqueVisitors || 0).toLocaleString()} subtitle="Unique visitor IDs" icon={Users} color="bg-blue-50 border-blue-200" />
        <StatCard title="Product Views" value={Number(overview.productViews || 0).toLocaleString()} subtitle="Total product page opens" icon={Activity} color="bg-indigo-50 border-indigo-200" />
        <StatCard title="To Checkout" value={Number(overview.goToCheckout || 0).toLocaleString()} subtitle={`${Number(overview.checkoutRate || 0).toFixed(1)}% of views`} icon={ShoppingCart} color="bg-amber-50 border-amber-200" />
        <StatCard title="Orders Placed" value={Number(overview.ordersPlaced || 0).toLocaleString()} subtitle={`${Number(overview.orderRateFromCheckout || 0).toFixed(1)}% of checkout`} icon={MousePointerClick} color="bg-emerald-50 border-emerald-200" />
        <StatCard title="Avg Time" value={formatSeconds(overview.avgDurationMs)} subtitle={`Avg scroll ${Number(overview.avgScrollDepth || 0).toFixed(0)}%`} icon={Clock3} color="bg-rose-50 border-rose-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Unique Customers Identified: <span className="font-semibold text-slate-900">{Number(overview.uniqueCustomers || 0).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Traffic Sources</h2>
          {sourceBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No source data in this period.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sourceBreakdown.map((item) => (
                <div key={String(item._id || "unknown")} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{String(item._id || "unknown")}</span>
                  <span className="text-sm font-semibold text-slate-900">{Number(item.count || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Top Products by Engagement</h2>
          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No product events in this period.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3">Product</th>
                    <th className="pb-2 pr-3">Views</th>
                    <th className="pb-2 pr-3">Checkout</th>
                    <th className="pb-2 pr-3">Orders</th>
                    <th className="pb-2">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item) => (
                    <tr key={String(item._id)} className="border-t border-slate-100">
                      <td className="py-2 pr-3 text-slate-800">{item.productName || item._id}</td>
                      <td className="py-2 pr-3 text-slate-700">{Number(item.views || 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-slate-700">{Number(item.checkouts || 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-slate-700">{Number(item.orders || 0).toLocaleString()}</td>
                      <td className="py-2 text-slate-700">{formatSeconds(item.avgDurationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Customer Activity</h2>
        {recentCustomerRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No events found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3">Time</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Customer Key</th>
                  <th className="pb-2 pr-3">Events</th>
                  <th className="pb-2 pr-3">Source</th>
                  <th className="pb-2 pr-3">Product</th>
                  <th className="pb-2 pr-3">Address</th>
                  <th className="pb-2 pr-3">Duration</th>
                  <th className="pb-2 pr-3">Scroll</th>
                  <th className="pb-2">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomerRows.map((row) => {
                  const event = row.latestEvent;
                  const customer = getCustomerDisplay(event);
                  const customerKey = row.key;
                  const canOpen = Boolean(customerKey);
                  return (
                    <tr key={String(event._id)} className="border-t border-slate-100">
                      <td className="py-2 pr-3 text-slate-700">{event.eventAt ? new Date(event.eventAt).toLocaleString() : "-"}</td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={() => handleOpenCustomer(event)}
                          disabled={!canOpen}
                          className={`text-left ${canOpen ? "text-blue-700 hover:underline" : "text-slate-900"}`}
                        >
                          <div className="font-medium">{customer.title}</div>
                        </button>
                        {customer.subtitle && <div className="text-xs text-slate-500">{customer.subtitle}</div>}
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{customer.badge}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{customerKey || '-'}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">{row.eventCount} event(s)</td>
                      <td className="py-2 pr-3 text-slate-700">{event.source || "direct"}</td>
                      <td className="py-2 pr-3 text-slate-700">{event.productName || event.productSlug || "-"}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{event.customerAddress || '-'}</td>
                      <td className="py-2 pr-3 text-slate-700">{formatSeconds(row.totalDurationMs)}</td>
                      <td className="py-2 pr-3 text-slate-700">{Number(row.maxScrollDepth || 0).toFixed(0)}%</td>
                      <td className="py-2 text-slate-700">{event.nextAction || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Customer Tracking Details</h3>
                <p className="text-xs text-slate-500">{selectedCustomerKey}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCustomer}
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-4">
              {customerDetailsLoading ? (
                <div className="py-8 text-center text-slate-500">Loading customer timeline...</div>
              ) : !selectedCustomerData?.customerTimeline?.length ? (
                <div className="py-8 text-center text-slate-500">No timeline found for this customer.</div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                      <div><span className="font-semibold">Type:</span> {selectedSummary?.customerType || 'guest'}</div>
                      <div><span className="font-semibold">Identifier:</span> {selectedIdentifier}</div>
                      <div><span className="font-semibold">Name:</span> {selectedDisplayFields.nameValue}</div>
                      <div>
                        <span className="font-semibold">Email:</span> {selectedDisplayFields.emailValue}
                        {selectedDisplayFields.emailNote && (
                          <span className="ml-2 text-xs text-slate-500">({selectedDisplayFields.emailNote})</span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Phone:</span> {selectedDisplayFields.phoneValue}
                        {selectedDisplayFields.phoneNote && (
                          <span className="ml-2 text-xs text-slate-500">({selectedDisplayFields.phoneNote})</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                      <div><span className="font-semibold">Events:</span> {Number(selectedSummary?.totalEvents || 0).toLocaleString()}</div>
                      <div><span className="font-semibold">First Seen:</span> {selectedSummary?.firstSeenAt ? new Date(selectedSummary.firstSeenAt).toLocaleString() : '-'}</div>
                      <div><span className="font-semibold">Last Seen:</span> {selectedSummary?.lastSeenAt ? new Date(selectedSummary.lastSeenAt).toLocaleString() : '-'}</div>
                      <div><span className="font-semibold">Address:</span> {selectedSummary?.customerAddress || '-'}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="pb-2 pr-3">Time</th>
                          <th className="pb-2 pr-3">Event</th>
                          <th className="pb-2 pr-3">Source</th>
                          <th className="pb-2 pr-3">Product</th>
                          <th className="pb-2 pr-3">Duration</th>
                          <th className="pb-2 pr-3">Scroll</th>
                          <th className="pb-2">Next Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomerData.customerTimeline.map((event) => (
                          <tr key={String(event._id)} className="border-t border-slate-100">
                            <td className="py-2 pr-3 text-slate-700">{event.eventAt ? new Date(event.eventAt).toLocaleString() : '-'}</td>
                            <td className="py-2 pr-3 font-medium text-slate-900">{event.eventType || '-'}</td>
                            <td className="py-2 pr-3 text-slate-700">{event.source || 'direct'}</td>
                            <td className="py-2 pr-3 text-slate-700">{event.productName || event.productSlug || '-'}</td>
                            <td className="py-2 pr-3 text-slate-700">{formatSeconds(event.durationMs)}</td>
                            <td className="py-2 pr-3 text-slate-700">{Number(event.scrollDepthPercent || 0).toFixed(0)}%</td>
                            <td className="py-2 text-slate-700">{event.nextAction || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-sm font-semibold text-slate-900">Step-by-step Journey</h4>
                    {selectedJourneySteps.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No steps available.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {selectedJourneySteps.map((step) => (
                          <div key={`${step.stepNumber}-${step.time}`} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
                            <div className="font-semibold text-slate-900">Step {step.stepNumber}: {step.eventLabel}</div>
                            <div className="text-xs text-slate-600">Time: {step.time}</div>
                            <div className="text-xs text-slate-600">Product: {step.productLabel}</div>
                            <div className="text-xs text-slate-700">Action/Button: {step.actionLabel}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
