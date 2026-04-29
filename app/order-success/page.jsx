'use client'
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import Loading from '@/components/Loading';
import { useAuth } from '@/lib/useAuth';
import { trackCustomerBehaviorEvent, getOrCreateSessionId, getOrCreateVisitorId, detectTrafficSource } from '@/lib/customerBehaviorTracking';

export default function OrderSuccess() {
  return (
    <Suspense>
      <OrderSuccessContent />
    </Suspense>
  );

}



function OrderSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const purchaseTrackedRef = useRef(false);
  const { user, getToken } = useAuth();
  const orderIdParam = params.get('orderId');

  useEffect(() => {
    const fetchOrder = async (orderId) => {
      try {
        let fetchOptions = {};
        if (user && getToken) {
          try {
            const token = await getToken();
            fetchOptions.headers = {
              Authorization: `Bearer ${token}`,
            };
          } catch (e) {
           
          }
        }
        const res = await fetch(`/api/orders?orderId=${orderId}`, fetchOptions);
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else if (data.order) {
          setOrders([data.order]);
        } else {
          setOrders(null);
        }
      } catch (err) {
        setOrders(null);
      } finally {
        setLoading(false);
      }
    };

    const orderId = orderIdParam;
    console.log('OrderSuccessContent: orderId from params:', orderId);
    if (!orderId) {
      console.error('OrderSuccessContent: orderId missing, redirecting to home.');
      router.replace('/');
      return;
    }
    // Don't refetch if we already have the order (prevents double-fetch when auth state loads)
    if (orders) return;
    fetchOrder(orderId);
  }, [orderIdParam, router, user, getToken]);

  const order = orders && orders.length > 0 ? orders[0] : null;
  function getOrderNumber(orderObj) {
    if (!orderObj) return '';
    if (orderObj.shortOrderNumber) return String(orderObj.shortOrderNumber).padStart(5, '0');
    if (orderObj._id) return String(orderObj._id).slice(0, 8).toUpperCase();
    return '';
  }
  // Calculate totals
  const products = order && order.orderItems ? order.orderItems : [];
  const subtotal = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // Use shippingFee from order if available
  const shipping = order && typeof order.shippingFee === 'number' ? order.shippingFee : 0;
  const discount = order && order.coupon && order.coupon.discount ? (order.coupon.discountType === 'percentage' ? (order.coupon.discount / 100 * subtotal) : Math.min(order.coupon.discount, subtotal)) : 0;
  const walletDiscount = order ? Number(order.walletDiscount || 0) : 0;
  const total = order && typeof order.total === 'number' ? order.total : (subtotal + shipping - discount - walletDiscount);
  const orderDate = order && order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  const currency = order && order.currency ? order.currency : '₹';
  const paymentMethod = order && order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'COD';
  const isPaid = order && (order.isPaid === true || paymentMethod === 'WALLET' || paymentMethod === 'CARD' || paymentMethod === 'STRIPE');
  const paidAmount = isPaid ? total : 0;
  const dueAmount = isPaid ? 0 : total;
  const purchaseCurrency = String(currency || '').trim().toUpperCase() === '₹' ? 'INR' : (String(currency || 'INR').trim().toUpperCase() || 'INR');

  // Meta Pixel Purchase event with attribution data
  useEffect(() => {
    if (!order || typeof window === 'undefined') return;
    if (purchaseTrackedRef.current) return;

    const orderEventId = String(orderIdParam || order._id || order.shortOrderNumber || 'unknown');
    const purchaseEventKey = `meta_purchase_sent_${orderEventId}`;

    if (window.sessionStorage.getItem(purchaseEventKey)) return;

    const firePurchase = () => {
      if (window.sessionStorage.getItem(purchaseEventKey)) return false;
      if (!window.fbq) return false;

      const purchaseValue = Number(total);
      if (!Number.isFinite(purchaseValue) || purchaseValue <= 0) {
        console.warn('[MetaPixel] Purchase skipped: invalid value', total);
        return false;
      }

      try {
        window.fbq('track', 'Purchase', {
          value: purchaseValue,
          currency: purchaseCurrency,
          ...(window.attributionData || {}),
        }, {
          eventID: `purchase_${orderEventId}`,
        });

        window.sessionStorage.setItem(purchaseEventKey, '1');
        purchaseTrackedRef.current = true;
        return true;
      } catch (error) {
        console.warn('[MetaPixel] Purchase track failed:', error);
        return false;
      }
    };

    let interval;
    if (window.fbq) {
      firePurchase();
    } else {
      let attempts = 0;
      interval = setInterval(() => {
        attempts++;
        if (window.fbq && firePurchase()) {
          clearInterval(interval);
          interval = null;
        } else if (attempts >= 50) {
          clearInterval(interval);
          interval = null;
        }
      }, 100);
    }

    // Cancel any pending poll when this effect re-runs (e.g. auth state loads)
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order, total, purchaseCurrency, orderIdParam]);

  useEffect(() => {
    if (!order || typeof window === 'undefined') return;

    const storeId = String(order?.storeId || '').trim();
    if (!storeId) return;

    const orderEventId = String(order?._id || order?.shortOrderNumber || params.get('orderId') || 'unknown');
    const trackingKey = `customer_order_tracked_${orderEventId}`;
    if (sessionStorage.getItem(trackingKey)) return;

    const attribution = detectTrafficSource();
    const shippingName = String(order?.shippingAddress?.name || order?.guestName || user?.displayName || '').trim();
    const shippingEmail = String(order?.guestEmail || user?.email || '').trim();
    const shippingPhone = String(order?.guestPhone || order?.shippingAddress?.phone || user?.phoneNumber || '').trim();
    const shippingAddress = [
      order?.shippingAddress?.street,
      order?.shippingAddress?.city,
      order?.shippingAddress?.state,
      order?.shippingAddress?.zip,
      order?.shippingAddress?.country,
    ].filter(Boolean).join(', ');

    trackCustomerBehaviorEvent({
      storeId,
      userId: user?.uid || null,
      customerType: user?.uid ? 'logged_in' : 'guest',
      customerName: shippingName,
      customerEmail: shippingEmail,
      customerPhone: shippingPhone,
      customerAddress: shippingAddress,
      eventType: 'order_placed',
      orderId: orderEventId,
      orderValue: Number(total || 0),
      nextAction: 'order_placed',
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      sessionId: getOrCreateSessionId(),
      visitorId: getOrCreateVisitorId(),
      metadata: {
        paymentMethod,
      },
    });

    sessionStorage.setItem(trackingKey, '1');
  }, [order, total, paymentMethod, params, user?.uid]);

  // Render logic moved inside returned JSX to avoid early returns
  return (
    <>
      {loading ? (
        <Loading />
      ) : !order ? (
        <div className='p-8 text-center text-red-600'>Order not found or failed.<br/>If you placed an order and see this message, please check your email for confirmation or contact support with your payment details.</div>
      ) : (
        <div className='bg-slate-100 py-4 sm:py-8'>
          <div className='max-w-3xl mx-auto px-3 sm:px-4'>
            <div className='rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden'>
              <div className='px-4 sm:px-8 pt-6 sm:pt-8 pb-5 text-center bg-gradient-to-b from-emerald-50 to-white'>
                <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 text-2xl mb-3'>
                  ✔
                </div>
                <h2 className='text-2xl sm:text-3xl font-bold text-emerald-700'>Thank you</h2>
                <p className='text-slate-600 text-sm sm:text-base mt-1'>Your order has been received.</p>
              </div>

              <div className='px-4 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-5'>
                <div className='rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-6 text-center'>
                  <div className='text-xs sm:text-sm text-slate-500 mb-1'>Order no.</div>
                  <div className='text-2xl sm:text-4xl font-bold text-red-600 tracking-wide'>
                    {getOrderNumber(order)}
                  </div>
                  <button
                    className='text-xs text-slate-500 hover:text-slate-700 mt-2'
                    onClick={() => navigator.clipboard.writeText(getOrderNumber(order))}
                  >
                    Copy order number
                  </button>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                  <div className='rounded-xl border border-slate-200 bg-white p-4'>
                    <div className='text-xs uppercase tracking-wide text-slate-500 mb-2'>Order details</div>
                    <div className='text-sm text-slate-700 space-y-1.5'>
                      <div><span className='font-semibold text-slate-900'>Order no.:</span> {getOrderNumber(order)}</div>
                      <div><span className='font-semibold text-slate-900'>Order date:</span> {orderDate}</div>
                    </div>
                  </div>
                  <div className='rounded-xl border border-slate-200 bg-white p-4'>
                    <div className='text-xs uppercase tracking-wide text-slate-500 mb-2'>Payment details</div>
                    <div className='text-sm text-slate-700 space-y-1.5'>
                      <div><span className='font-semibold text-slate-900'>Total:</span> {currency} {total.toLocaleString()}</div>
                      <div><span className='font-semibold text-slate-900'>Payment method:</span> {paymentMethod}</div>
                      <div><span className='font-semibold text-slate-900'>Paid:</span> {currency} {paidAmount.toLocaleString()}</div>
                      <div><span className='font-semibold text-slate-900'>To pay:</span> {currency} {dueAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5'>
                  <div className='mb-3 text-base sm:text-lg font-semibold text-slate-900'>Order summary</div>
                  <div className='space-y-3 mb-4'>
                    {products.map((item, idx) => {
                      const p = typeof item.productId === 'object' ? item.productId : null;
                      const key = (p && p._id) || (typeof item.productId === 'string' ? item.productId : idx);
                      const name = p?.name || item.name || 'Product';
                      const image = Array.isArray(p?.images) && p.images[0] ? p.images[0] : null;
                      return (
                        <div key={key} className='flex items-center justify-between gap-3 border border-slate-200 bg-white rounded-lg p-2.5 sm:p-3'>
                          <div className='flex items-center gap-2.5 min-w-0'>
                            {image && (
                              <img src={image} alt={name} className='w-12 h-12 rounded-md object-cover border border-slate-200 flex-shrink-0' />
                            )}
                            <span className='truncate text-sm text-slate-800'>
                              {name} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                            </span>
                          </div>
                          <div className='text-sm font-semibold text-slate-900 whitespace-nowrap'>
                            {currency} {(Number(item.price) * Number(item.quantity)).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between text-slate-600'>
                      <span>Items</span>
                      <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className='flex justify-between text-slate-600'>
                      <span>Discount</span>
                      <span>-{currency} {discount ? discount.toLocaleString() : '0'}</span>
                    </div>
                    <div className='flex justify-between text-slate-600'>
                      <span>Shipping &amp; handling</span>
                      <span>{currency} {shipping.toLocaleString()}</span>
                    </div>
                    {walletDiscount > 0 && (
                      <div className='flex justify-between text-slate-600'>
                        <span>Wallet discount</span>
                        <span>-{currency} {walletDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className='flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200'>
                      <span>Total</span>
                      <span>{currency} {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {order?.shippingAddress && (
                  <div className='rounded-xl border border-slate-200 bg-white p-4'>
                    <div className='font-semibold text-slate-900 mb-2'>Shipping address</div>
                    <div className='text-sm text-slate-700 space-y-1'>
                      <div className='font-medium'>{order.shippingAddress.name}</div>
                      <div>{order.shippingAddress.street}</div>
                      <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</div>
                      <div>{order.shippingAddress.country}</div>
                      {order.shippingAddress.phone && (
                        <div>Phone: {(order.shippingAddress.phoneCode || '+91')} {order.shippingAddress.phone}</div>
                      )}
                      {order.shippingAddress.alternatePhone && (
                        <div className='text-slate-600'>Alternate: {(order.shippingAddress.alternatePhoneCode || order.shippingAddress.phoneCode || '+91')} {order.shippingAddress.alternatePhone}</div>
                      )}
                    </div>
                  </div>
                )}

                {!user && (
                  <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 text-center'>
                    <div className='text-amber-800 font-semibold text-sm sm:text-base'>
                      Please sign in to view your order history and track details.
                    </div>
                    <div className='text-amber-700 text-xs sm:text-sm mt-1'>
                      Guests can track their order using the order ID only.
                    </div>
                  </div>
                )}

                <div className='pt-1 text-center'>
                  <button
                    className='w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-7 py-2.5 rounded-lg font-bold transition-colors'
                    onClick={() => router.push('/')}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
