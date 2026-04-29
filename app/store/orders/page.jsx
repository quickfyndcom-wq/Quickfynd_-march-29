"use client";

// Update order status
const updateOrderStatus = async (orderId, newStatus, getToken, fetchOrders) => {
    try {
        const token = await getToken(true); // Force refresh token
        if (!token) {
            toast.error('Authentication failed. Please sign in again.');
            return;
        }
        await axios.post('/api/store/orders/update-status', {
            orderId,
            status: newStatus
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Order status updated!');
        fetchOrders();
    } catch (error) {
        console.error('Update status error:', error);
        toast.error(error?.response?.data?.error || 'Failed to update status');
    }
};
import { useAuth } from '@/lib/useAuth';
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Loading from "@/components/Loading"

import axios from "axios"
import toast from "react-hot-toast"
import { Package, Truck, X, Download, Printer, RefreshCw, MapPin, MessageSquare } from "lucide-react"
import { downloadInvoice, printInvoice } from "@/lib/generateInvoice"
import { downloadAwbBill, generateAwbBill } from "@/lib/generateAwbBill"
import { schedulePickup } from '@/lib/delhivery'

// Add updateTrackingDetails function
// (must be inside the component, not top-level)
const updateTrackingDetails = async (orderId, trackingId, trackingUrl, courier, getToken, fetchOrders) => {
    try {
        const token = await getToken(true); // Force refresh token
        if (!token) {
            toast.error('Authentication failed. Please sign in again.');
            return;
        }
        await axios.post('/api/store/orders/update-tracking', {
            orderId,
            trackingId,
            trackingUrl,
            courier
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tracking details updated!');
        fetchOrders();
    } catch (error) {
        console.error('Update tracking error:', error);
        toast.error(error?.response?.data?.error || 'Failed to update tracking details');
    }
};

export default function StoreOrders() {
    const DEFAULT_RETURN_ADDRESS = [
        'Nilaas shop, MLA ROAD NEAR POLICE STATION',
        'AMBALAMUKKU KUNNAMNAGALAM KOZHIKODE-673571, INDIA'
    ].join('\n')
    const DEFAULT_SELLER_NAME = 'Quickfynd'
    const DEFAULT_SELLER_ADDRESS = [
        '14/380 Kunnamangalam MLA ROAD, Peruvayal,',
        'Kerala, India, 673571'
    ].join('\n')
    const DEFAULT_GST = '32JWYPS4831L1ZI'

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const formatDateTimeLocalValue = (date) => {
        const source = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(source.getTime())) return '';
        const localDate = new Date(source.getTime() - source.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    };

    const getImageSrc = (image) => {
        if (Array.isArray(image)) return getImageSrc(image[0])
        if (typeof image === 'string' && image.trim()) return image.trim()
        if (image && typeof image === 'object') {
            return image.url || image.src || image.secure_url || image.image || '/placeholder.png'
        }
        return '/placeholder.png'
    }

    const normalizeAddressText = (address) => {
        if (!address) return ''
        if (typeof address === 'string') return address.trim()
        if (typeof address === 'object') {
            const pin = address.zip || address.pincode || address.pin
            const locationLine = [address.city, address.state, pin].filter(Boolean).join(', ')
            const parts = [
                address.name,
                address.line1,
                address.line2,
                address.street,
                locationLine,
                address.country,
                pin ? `Pin: ${pin}` : '',
                address.phone ? `Phone: ${address.phone}` : ''
            ].filter(Boolean)
            return parts.join('\n').trim()
        }
        return String(address).trim()
    }

    const resolveReturnAddress = (order, storeData = {}) => {
        // Business requested fixed return address for AWB labels.
        return DEFAULT_RETURN_ADDRESS
    }

    const resolveSellerName = (order, storeData = {}) => {
        return (
            storeData?.name ||
            order?.storeName ||
            order?.sellerName ||
            order?.store?.name ||
            DEFAULT_SELLER_NAME
        )
    }

    const resolveSellerAddress = (order, storeData = {}) => {
        const candidates = [
            storeData?.address,
            order?.storeAddress,
            order?.sellerAddress,
            order?.store?.address
        ]
        for (const candidate of candidates) {
            const normalized = normalizeAddressText(candidate)
            if (normalized) return normalized
        }
        return DEFAULT_SELLER_ADDRESS
    }

    const resolveOrderItemImage = (item) => {
        const candidates = [
            item?.image,
            item?.productImage,
            item?.product?.image,
            item?.productId?.image,
            item?.product?.images?.[0],
            item?.productId?.images?.[0],
            item?.product?.imageUrl,
            item?.productId?.imageUrl
        ]
        for (const candidate of candidates) {
            const src = getImageSrc(candidate)
            if (src && src !== '/placeholder.png') return src
        }
        return '/placeholder.png'
    }
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trackingData, setTrackingData] = useState({
        trackingId: '',
        trackingUrl: '',
        courier: ''
    });
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [datePreset, setDatePreset] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const [schedulingPickup, setSchedulingPickup] = useState(false);
    const [sendingToDelhivery, setSendingToDelhivery] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // seconds
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingReturnIndex, setRejectingReturnIndex] = useState(null);
    const [ltlPickupData, setLtlPickupData] = useState({
        client_warehouse: '',
        pickup_date: '',
        start_time: '',
        expected_package_count: 1
    });
    const [ltlLabelSize, setLtlLabelSize] = useState('std');
    const [ltlLoading, setLtlLoading] = useState(false);
    const [awbManifestData, setAwbManifestData] = useState({
        pickup_location_name: '',
        payment_mode: 'cod',
        cod_amount: 0,
        weight: 1000,
        dimensions: [{ box_count: 1, length_cm: 10, width_cm: 10, height_cm: 10 }],
        dropoff_location: {}
    });
    const [generatingAwb, setGeneratingAwb] = useState(false);
    const [storeContracts, setStoreContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [loadingStoreContracts, setLoadingStoreContracts] = useState(false);
    const [showAwbPreviewModal, setShowAwbPreviewModal] = useState(false);
    const [awbPreviewUrl, setAwbPreviewUrl] = useState('');
    const [awbPreviewDoc, setAwbPreviewDoc] = useState(null);
    const [awbPreviewGenerating, setAwbPreviewGenerating] = useState(false);
    const [showAwbGenerateModal, setShowAwbGenerateModal] = useState(false);
    const [awbFormDetails, setAwbFormDetails] = useState({});
    const [awbFormPreviewUrl, setAwbFormPreviewUrl] = useState('');
    const [awbFormPreviewDoc, setAwbFormPreviewDoc] = useState(null);
    
    // NEW: Weight & Dimensions states for AWB modal
    const [useManualWeight, setUseManualWeight] = useState(false);
    const [manualWeight, setManualWeight] = useState('');
    const [packageLength, setPackageLength] = useState('10');
    const [packageWidth, setPackageWidth] = useState('20');
    const [packageHeight, setPackageHeight] = useState('20');
    const [awbFormErrors, setAwbFormErrors] = useState({});
    
    // NEW: Track AWB status (generated/downloaded) per order
    const [awbStatus, setAwbStatus] = useState({}); // { orderId: { generated: true, downloaded: true } }
    
    const refreshIntervalRef = useRef(null);
    const router = useRouter();

    const { user, getToken, loading: authLoading } = useAuth();

    const callCourierProxy = async (action, params, data) => {
        setLtlLoading(true);
        try {
            const token = await getToken(true);
            if (!token) {
                toast.error('Authentication failed. Please sign in again.');
                return;
            }
            const response = await axios.post('/api/store/courior/proxy', {
                action,
                params,
                data
            }, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000
            });

            toast.success('Courier action completed');
            return response.data?.data;
        } catch (error) {
            console.error('[Courier action] error:', error);
            toast.error(error?.response?.data?.error || 'Courier action failed');
            return null;
        } finally {
            setLtlLoading(false);
        }
    };

    // Status options available (aligned with customer dashboard and courier states)
    const STATUS_OPTIONS = [
        { value: 'ORDER_PLACED', label: 'Order Placed', color: 'bg-blue-100 text-blue-700' },
        { value: 'PROCESSING', label: 'Processing', color: 'bg-yellow-100 text-yellow-700' },
        { value: 'MANIFESTED', label: 'Manifested', color: 'bg-cyan-100 text-cyan-700' },
        { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', color: 'bg-amber-100 text-amber-700' },
        { value: 'WAITING_FOR_PICKUP', label: 'Waiting For Pickup', color: 'bg-yellow-50 text-yellow-700' },
        { value: 'PICKUP_REQUESTED', label: 'Pickup Requested', color: 'bg-yellow-100 text-yellow-700' },
        { value: 'PICKED_UP', label: 'Picked Up', color: 'bg-purple-100 text-purple-700' },
        { value: 'WAREHOUSE_RECEIVED', label: 'Warehouse Received', color: 'bg-indigo-100 text-indigo-700' },
        { value: 'SHIPPED', label: 'Shipped / In Transit', color: 'bg-purple-100 text-purple-700' },
        { value: 'OUT_FOR_DELIVERY', label: 'Out For Delivery', color: 'bg-teal-100 text-teal-700' },
        { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-700' },
        { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
        { value: 'PAYMENT_FAILED', label: 'Payment Failed', color: 'bg-orange-100 text-orange-700' },
        { value: 'RTO', label: 'RTO', color: 'bg-fuchsia-100 text-fuchsia-700' },
        { value: 'RETURNED', label: 'Returned', color: 'bg-indigo-100 text-indigo-700' },
        { value: 'RETURN_INITIATED', label: 'Return Initiated', color: 'bg-pink-100 text-pink-700' },
        { value: 'RETURN_APPROVED', label: 'Return Approved', color: 'bg-pink-100 text-pink-700' },
    ];

    // Map Delhivery live status (current_status + latest event) to internal order status
    const mapDelhiveryStatusToOrderStatus = (delhivery, currentStatus) => {
        if (!delhivery) return null;

        const texts = [];
        if (delhivery.current_status) {
            texts.push(delhivery.current_status.toLowerCase());
        }

        // Use the event with the latest timestamp
        if (Array.isArray(delhivery.events) && delhivery.events.length > 0) {
            const latestEvent = delhivery.events.reduce((latest, event) => {
                if (!latest) return event;
                const latestTime = new Date(latest.time || latest.timestamp || 0).getTime();
                const eventTime = new Date(event.time || event.timestamp || 0).getTime();
                return eventTime > latestTime ? event : latest;
            }, null);
            if (latestEvent?.status) {
                texts.push(latestEvent.status.toLowerCase());
            }
        }

        if (texts.length === 0) return null;
        const combined = texts.join(' | ');

        if (combined.includes('manifested') || combined.includes('manifest')) return 'MANIFESTED';
        if (combined.includes('pickup scheduled')) return 'PICKUP_SCHEDULED';
        if (
            combined.includes('rto') ||
            combined.includes('return to origin') ||
            combined.includes('return accepted') ||
            combined.includes('dispatched for rto')
        ) {
            return 'RTO';
        }
        if (combined.includes('delivered')) return 'DELIVERED';
        if (combined.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
        if (combined.includes('picked up') || combined.includes('picked-up')) return 'PICKED_UP';
        if (combined.includes('pickup requested')) return 'PICKUP_REQUESTED';
        if (combined.includes('waiting for pickup')) return 'WAITING_FOR_PICKUP';
        if (combined.includes('warehouse') || combined.includes('hub')) return 'WAREHOUSE_RECEIVED';

        // Treat generic "pending" as order is being processed
        if (combined.includes('pending')) {
            if (currentStatus === 'ORDER_PLACED') return 'PROCESSING';
            return currentStatus;
        }

        if (
            combined.includes('in transit') ||
            combined.includes('dispatched') ||
            combined.includes('shipped') ||
            combined.includes('forwarded')
        ) {
            if (
                currentStatus === 'ORDER_PLACED' ||
                currentStatus === 'PROCESSING' ||
                currentStatus === 'WAITING_FOR_PICKUP' ||
                currentStatus === 'PICKUP_REQUESTED'
            ) {
                return 'SHIPPED';
            }
        }

        return null;
    };

    // Get status color
    const getStatusColor = (status) => {
        const statusOption = STATUS_OPTIONS.find(s => s.value === status);
        return statusOption?.color || 'bg-gray-100 text-gray-700';
    };

    // Unified payment-status resolver for dashboard
    const isOrderPaid = (order) => {
        const paymentMethod = String(order?.paymentMethod || '').trim().toLowerCase();
        const orderStatus = String(order?.status || '').trim().toUpperCase();
        const paymentStatus = String(order?.paymentStatus || '').trim().toLowerCase();

        // COD is paid only when delivered/collected
        if (paymentMethod === 'cod') {
            if (orderStatus === 'DELIVERED') return true;
            if (order?.delhivery?.payment?.is_cod_recovered) return true;
            return !!order?.isPaid;
        }

        // Non-COD (card/online/prepaid) should appear paid unless explicitly failed/unpaid
        if (paymentMethod) {
            const explicitUnpaidStatuses = new Set(['failed', 'payment_failed', 'refunded', 'unpaid', 'pending']);
            if (explicitUnpaidStatuses.has(paymentStatus)) return false;
            if (orderStatus === 'PAYMENT_FAILED') return false;
            return true;
        }

        return !!order?.isPaid;
    };

    // Calculate order statistics
    const getOrderStats = () => {
        const stats = {
            TOTAL: orders.length,
            ORDER_PLACED: orders.filter(o => o.status === 'ORDER_PLACED').length,
            PROCESSING: orders.filter(o => o.status === 'PROCESSING').length,
            MANIFESTED: orders.filter(o => o.status === 'MANIFESTED').length,
            PICKUP_SCHEDULED: orders.filter(o => o.status === 'PICKUP_SCHEDULED').length,
            SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
            DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,
            CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
            PAYMENT_FAILED: orders.filter(o => o.status === 'PAYMENT_FAILED').length,
            RTO: orders.filter(o => o.status === 'RTO').length,
            RETURNED: orders.filter(o => o.status === 'RETURNED').length,
            RETURN_REQUESTED: orders.filter(o => o.returns && o.returns.some(r => r.status === 'REQUESTED')).length,
            DAMAGED_REVIEW: orders.filter(o => ['MINOR_DAMAGE', 'DAMAGED'].includes(o?.deliveryReview?.packageCondition)).length,
            PENDING_PAYMENT: orders.filter(o => {
                // Exclude cancelled and returned orders from pending payment
                return !isOrderPaid(o) && o.status !== 'CANCELLED' && o.status !== 'RETURNED' && o.status !== 'RTO';
            }).length,
            PENDING_SHIPMENT: orders.filter(o => !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status)).length,
        };
        return stats;
    };
    const getDateRange = () => {
        if (!fromDate && !toDate) return { start: null, end: null };
        const start = fromDate ? new Date(fromDate) : null;
        const end = toDate ? new Date(toDate) : null;
        return { start, end };
    };

    const isOrderInRange = (order) => {
        const { start, end } = getDateRange();
        if (!start && !end) return true;
        const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        if (start && createdAt < start) return false;
        if (end && createdAt > end) return false;
        return true;
    };

    // Filter orders based on selected status + date range
    const getFilteredOrders = () => {
        const dateFiltered = orders.filter(isOrderInRange);
        if (filterStatus === 'ALL') return dateFiltered;
        if (filterStatus === 'PENDING_PAYMENT') return dateFiltered.filter(o => {
            return !isOrderPaid(o);
        });
        if (filterStatus === 'PENDING_SHIPMENT') return dateFiltered.filter(o => !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status));
        if (filterStatus === 'RETURN_REQUESTED') return dateFiltered.filter(o => o.returns && o.returns.some(r => r.status === 'REQUESTED'));
        if (filterStatus === 'DAMAGED_REVIEW') return dateFiltered.filter(o => ['MINOR_DAMAGE', 'DAMAGED'].includes(o?.deliveryReview?.packageCondition));
        return dateFiltered.filter(o => o.status === filterStatus);
    };

    const stats = getOrderStats();
    const filteredOrders = getFilteredOrders();

    const getDisplayOrderNumber = (order) => {
        if (order?.shortOrderNumber) return String(order.shortOrderNumber).padStart(5, '0');
        return String(order?._id || '').slice(0, 8).toUpperCase();
    };

    const getOrderSourceLabel = (order) => {
        const normalized = String(order?.orderSource || '').trim().toUpperCase();
        return normalized === 'APP' ? 'APP' : 'WEB';
    };

    const exportOrdersToCsv = () => {
        if (!filteredOrders.length) {
            toast.error('No orders available to export for the selected filters.');
            return;
        }

        const sanitizeCsvValue = (value) => {
            const normalized = value === null || value === undefined ? '' : String(value);
            return `"${normalized.replace(/"/g, '""')}"`;
        };

        const getCustomerName = (order) => {
            if (order?.isGuest) return order?.guestName || 'Guest User';
            return order?.shippingAddress?.name || order?.userId?.name || order?.userId?.email || 'Unknown';
        };

        const getCustomerEmail = (order) => {
            if (order?.isGuest) return order?.guestEmail || order?.shippingAddress?.email || '';
            return order?.shippingAddress?.email || order?.userId?.email || '';
        };

        const getCustomerPhone = (order) => {
            if (order?.isGuest) {
                return [order?.shippingAddress?.phoneCode, order?.guestPhone].filter(Boolean).join(' ');
            }
            return [order?.shippingAddress?.phoneCode, order?.shippingAddress?.phone].filter(Boolean).join(' ');
        };

        const getAlternatePhone = (order) => {
            return [
                order?.alternatePhoneCode || order?.shippingAddress?.alternatePhoneCode || order?.shippingAddress?.phoneCode,
                order?.alternatePhone || order?.shippingAddress?.alternatePhone,
            ].filter(Boolean).join(' ');
        };

        const getShippingAddress = (order) => {
            return [
                order?.shippingAddress?.street,
                order?.shippingAddress?.city,
                order?.shippingAddress?.district,
                order?.shippingAddress?.state,
                order?.shippingAddress?.zip || order?.shippingAddress?.pincode,
                order?.shippingAddress?.country,
            ].filter(Boolean).join(', ');
        };

        const headers = [
            'Order No',
            'Order ID',
            'Created At',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Alternate Phone',
            'Guest Order',
            'Payment Method',
            'Payment Status',
            'Order Status',
            'Order Total',
            'Shipping Fee',
            'Tracking ID',
            'Tracking URL',
            'Courier',
            'Shipping Address',
            'Item Name',
            'Item SKU/Product ID',
            'Item Quantity',
            'Item Price',
            'Coupon Code',
            'Coupon Discount',
            'Notes',
        ];

        const rows = filteredOrders.flatMap((order) => {
            const orderItems = Array.isArray(order?.orderItems) && order.orderItems.length > 0
                ? order.orderItems
                : [{ name: '', productId: '', quantity: '', price: '' }];

            return orderItems.map((item) => {
                const productId = typeof item?.productId === 'object'
                    ? item?.productId?._id || item?.productId?.id || ''
                    : item?.productId || '';
                const itemName = item?.name || item?.productId?.name || item?.productId?.title || '';

                return [
                    getDisplayOrderNumber(order),
                    order?._id || '',
                    order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '',
                    getCustomerName(order),
                    getCustomerEmail(order),
                    getCustomerPhone(order),
                    getAlternatePhone(order),
                    order?.isGuest ? 'Yes' : 'No',
                    order?.paymentMethod || '',
                    getPaymentStatus(order),
                    order?.status || '',
                    order?.total || 0,
                    order?.shippingFee || 0,
                    order?.trackingId || '',
                    order?.trackingUrl || '',
                    order?.courier || '',
                    getShippingAddress(order),
                    itemName,
                    productId,
                    item?.quantity || 0,
                    item?.price || 0,
                    order?.coupon?.code || '',
                    order?.coupon?.discountAmount || 0,
                    order?.notes || '',
                ];
            });
        });

        const csvContent = [headers, ...rows]
            .map((row) => row.map(sanitizeCsvValue).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fromLabel = (fromDate || 'all').replace(/[\s:T]/g, '-');
        const toLabel = (toDate || 'all').replace(/[\s:T]/g, '-');

        link.href = url;
        link.setAttribute('download', `orders_${fromLabel}_to_${toLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Orders exported to CSV.');
    };

    // Function to update tracking details (AWB), auto-set status and notify customer
    const updateTrackingDetails = async () => {
        if (!selectedOrder) return;

        const awb = (trackingData.trackingId || '').trim();
        let courierName = (trackingData.courier || selectedOrder?.courier || '').trim();
        let trackingUrl = (trackingData.trackingUrl || '').trim();

        if (!awb) {
            toast.error('AWB / Tracking ID is required');
            return;
        }

        // If courier is not set, assume Delhivery (for AWB-based tracking)
        if (!courierName) {
            courierName = 'Delhivery';
        }

        // For Delhivery, if no tracking URL entered, auto-generate using AWB
        if (!trackingUrl && courierName.toLowerCase() === 'delhivery') {
            trackingUrl = `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
        }

        // Auto-move status forward when tracking is added
        // If the order is still ORDER_PLACED or PROCESSING, treat it as SHIPPED
        let nextStatus = selectedOrder.status;
        if (nextStatus === 'ORDER_PLACED' || nextStatus === 'PROCESSING') {
            nextStatus = 'SHIPPED';
        }
        
        try {
            const token = await getToken();
            await axios.put(`/api/store/orders/${selectedOrder._id}`, {
                status: nextStatus,
                trackingId: awb,
                trackingUrl,
                courier: courierName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Tracking details updated, status set to Shipped & customer notified!');

            // Refresh orders list
            await fetchOrders();

            // Update selectedOrder locally so UI + Delhivery auto-refresh work immediately
            setSelectedOrder(prev => prev ? {
                ...prev,
                status: nextStatus,
                trackingId: awb,
                courier: courierName,
                trackingUrl
            } : prev);

            // Trigger an immediate Delhivery refresh (if Delhivery courier)
            if (courierName.toLowerCase() === 'delhivery') {
                try {
                    await refreshTrackingData();
                } catch {
                    // ignore refresh errors here; UI will still have AWB saved
                }
            }
        } catch (error) {
            console.error('Failed to update tracking:', error);
            toast.error(error?.response?.data?.error || 'Failed to update tracking details');
        }
    };

    // Manually trigger automatic status sync from latest courier tracking
    const autoSyncStatusFromTracking = async (targetOrder) => {
        const order = targetOrder || selectedOrder;

        if (!order || !order.trackingId) {
            toast.error('Add a tracking ID first');
            return;
        }
        try {
            const token = await getToken();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const { data } = await axios.get(`/api/track-order?awb=${order.trackingId}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!data.order || !data.order.delhivery) {
                toast.error('No live courier status found yet. Try again later.');
                return;
            }

            const currentStatus = data.order.status || order.status;
            const mappedStatus = mapDelhiveryStatusToOrderStatus(data.order.delhivery, currentStatus);

            if (!mappedStatus || mappedStatus === currentStatus) {
                toast.error('Status is already up to date with tracking.');
                return;
            }

            await axios.post('/api/store/orders/update-status', {
                orderId: order._id,
                status: mappedStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state so UI reflects the change immediately
            setSelectedOrder(prev => prev && prev._id === order._id ? { ...prev, status: mappedStatus } : prev);
            setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: mappedStatus } : o));

            toast.success(`Order status set to "${mappedStatus}" from tracking.`);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Auto status sync timeout after 10 seconds');
                toast.error('Request timeout. Delhivery API took too long. Please try again.');
            } else {
                console.error('Auto status sync failed:', error);
                toast.error(error?.response?.data?.error || 'Failed to auto-sync status from tracking');
            }
        }
    };
    // Move openModal and closeModal to top level
    const openModal = (order) => {
        console.log('[MODAL DEBUG] Opening order:', order);
        console.log('[MODAL DEBUG] Order shippingAddress:', order.shippingAddress);
        console.log('[MODAL DEBUG] Order userId type:', typeof order.userId);
        console.log('[MODAL DEBUG] Order userId value:', order.userId);
        console.log('[MODAL DEBUG] Order userId is object?:', typeof order.userId === 'object');
        if (typeof order.userId === 'object' && order.userId !== null) {
            console.log('[MODAL DEBUG] User name:', order.userId.name);
            console.log('[MODAL DEBUG] User email:', order.userId.email);
        }
        console.log('[MODAL DEBUG] Order addressId:', order.addressId);
        console.log('[MODAL DEBUG] Order isGuest:', order.isGuest);
        setSelectedOrder(order);
        // Pre-fill tracking data if it exists
        setTrackingData({
            trackingId: order.trackingId || '',
            trackingUrl: order.trackingUrl || '',
            courier: order.courier || ''
        });
        // Pre-fill AWB manifest data from order
        const isCod = order.payment_method === 'cod' || order.paymentMethod === 'cod';
        setAwbManifestData({
            pickup_location_name: '',
            payment_mode: isCod ? 'cod' : 'prepaid',
            cod_amount: isCod ? order.total : 0,
            weight: Math.max(1000, Math.ceil(order.total / 10)), // Estimate: 1kg min or 100g per ₹1
            dimensions: [{ box_count: 1, length_cm: 30, width_cm: 20, height_cm: 15 }],
            dropoff_location: order.shippingAddress || {}
        });
        setIsModalOpen(true);
    };

    // Check Razorpay payment settlement status
    const checkRazorpaySettlement = async (order) => {
        if (!order.razorpayPaymentId) {
            toast.error('This order does not have a Razorpay payment');
            return;
        }
        
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/store/orders/check-razorpay-settlement?orderId=${order._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.success) {
                // Update order locally if it was updated
                if (data.updated) {
                    setSelectedOrder(prev => prev && prev._id === order._id ? {
                        ...prev,
                        isPaid: true,
                        paymentStatus: 'CAPTURED'
                    } : prev);
                    setOrders(prev => prev.map(o => 
                        o._id === order._id ? {
                            ...o,
                            isPaid: true,
                            paymentStatus: 'CAPTURED'
                        } : o
                    ));
                }
                
                const settlement = data.razorpayStatus;
                let message = `💳 Razorpay Payment Status\n`;
                message += `Amount: ₹${settlement.amount}\n`;
                message += `Status: ${settlement.payment_captured ? '✓ Captured' : '✗ Not captured'}\n`;
                message += `Fee: ₹${settlement.fee || 0}\n`;
                message += `Settlement: ${settlement.settlement_status}\n`;
                
                if (settlement.transfer_details) {
                    message += `✓ Transferred to Bank\n`;
                    message += `Transfer ID: ${settlement.transfer_details.transfer_id}\n`;
                    message += `Amount: ₹${settlement.transfer_details.amount_transferred}`;
                } else {
                    message += `Pending transfer to bank account`;
                }
                
                toast.success(message);
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            console.error('Razorpay check error:', error);
            toast.error(error?.response?.data?.error || 'Failed to check payment settlement');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        // Reset tracking data
        setTrackingData({
            trackingId: '',
            trackingUrl: '',
            courier: ''
        });
    };

    // When modal opens, fetch tracking info only
    useEffect(() => {
        if (isModalOpen && selectedOrder) {
            // Contracts will be fetched when Generate AWB is clicked
        }
    }, [isModalOpen, selectedOrder, getToken])

    // Helper function to compute correct payment status
    const getPaymentStatus = (order) => {
        const paymentMethod = (order.paymentMethod || '').toLowerCase();
        const status = (order.status || '').toUpperCase();
        const resolvedPaid = isOrderPaid(order);

        // Enhanced payment status string for cancelled/returned
        if (status === 'CANCELLED') {
            return resolvedPaid ? 'Cancelled (Paid)' : 'Cancelled (Unpaid)';
        }
        if (status === 'RTO') {
            return resolvedPaid ? 'RTO (Paid)' : 'RTO (Unpaid)';
        }
        if (status === 'RETURNED') {
            return resolvedPaid ? 'Returned (Paid)' : 'Returned (Unpaid)';
        }
        if (status === 'PAYMENT_FAILED') {
            return 'Payment Failed';
        }
        return resolvedPaid ? '✓ Paid' : 'Pending';
    };

    const fetchOrders = async () => {
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Invalid session. Please sign in again.");
                setLoading(false);
                return;
            }
            const { data } = await axios.get('/api/store/orders', {headers: { Authorization: `Bearer ${token}` }});
            console.log('[ORDERS DEBUG] Raw orders data:', data.orders);
            
            // Debug first 3 orders
            if (data.orders && data.orders.length > 0) {
                console.log('[ORDERS DEBUG] First 3 orders payment/status info:');
                data.orders.slice(0, 3).forEach((o, i) => {
                    console.log(`Order ${i}:`, { _id: o._id, paymentMethod: o.paymentMethod, status: o.status, isPaid: o.isPaid });
                });
            }

            let syncedOrders = data.orders || [];

            // One-time client-side sync: if Delhivery says "out for delivery" / "delivered" etc.
            // but order.status is still ORDER_PLACED/PROCESSING/CANCELLED, bump status to match
            // and persist the change back to the backend so customer views stay in sync.
            const updatesToPersist = [];
            syncedOrders = syncedOrders.map(order => {
                const mapped = mapDelhiveryStatusToOrderStatus(order.delhivery, order.status);
                if (mapped && mapped !== order.status) {
                    updatesToPersist.push({ orderId: order._id, status: mapped });
                    return { ...order, status: mapped };
                }
                return order;
            });

            if (syncedOrders.length > 0) {
                console.log('[ORDERS DEBUG] First synced order sample:', JSON.stringify(syncedOrders[0], null, 2));
            }

            // Persist any mapped statuses silently (no toast spam)
            if (updatesToPersist.length > 0) {
                try {
                    await Promise.all(
                        updatesToPersist.map(update =>
                            axios.post('/api/store/orders/update-status', update, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                        )
                    );
                } catch (statusSyncError) {
                    console.error('Failed to persist auto-mapped statuses:', statusSyncError);
                }
            }

            setOrders(syncedOrders);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return; // Wait for auth to load
        if (!user) {
            toast.error("You must be signed in as a seller to view orders.");
            setLoading(false);
            return;
        }
        fetchOrders();
        // eslint-disable-next-line
    }, [authLoading, user]);

    // Auto-refresh tracking data
    useEffect(() => {
        if (autoRefreshEnabled && selectedOrder?.trackingId) {
            refreshIntervalRef.current = setInterval(() => {
                refreshTrackingData();
            }, refreshInterval * 1000);
        }
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefreshEnabled, selectedOrder, refreshInterval]);

    useEffect(() => {
        const today = new Date();
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        if (datePreset === 'TODAY') {
            setFromDate(formatDateTimeLocalValue(startOfToday));
            setToDate(formatDateTimeLocalValue(endOfToday));
            return;
        }
        if (datePreset === 'LAST_7_DAYS') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 6);
            lastWeek.setHours(0, 0, 0, 0);
            setFromDate(formatDateTimeLocalValue(lastWeek));
            setToDate(formatDateTimeLocalValue(endOfToday));
            return;
        }
        if (datePreset === 'ALL') {
            setFromDate('');
            setToDate('');
        }
    }, [datePreset]);

    const refreshTrackingData = async () => {
        if (!selectedOrder || !selectedOrder.trackingId) return;
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/track-order?awb=${selectedOrder.trackingId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.order) {
                // Optionally sync internal order.status with Delhivery live status
                const mappedStatus = mapDelhiveryStatusToOrderStatus(
                    data.order.delhivery,
                    selectedOrder.status || data.order.status
                );

                if (mappedStatus && mappedStatus !== (selectedOrder.status || data.order.status)) {
                    try {
                        // Persist new status silently (no toast spam during auto-refresh)
                        await axios.post('/api/store/orders/update-status', {
                            orderId: selectedOrder._id,
                            status: mappedStatus
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        data.order.status = mappedStatus;
                    } catch (statusError) {
                        console.error('Failed to sync status from Delhivery:', statusError);
                    }
                }

                // Update the selected order with fresh tracking data
                setSelectedOrder(prev => ({
                    ...prev,
                    ...data.order,
                    delhivery: data.order.delhivery || prev.delhivery
                }));
                // Also update in orders list
                setOrders(prev => prev.map(o => o._id === selectedOrder._id ? {...o, ...data.order} : o));
            }
        } catch (error) {
            console.error('Failed to refresh tracking:', error);
        }
    };

    const schedulePickupWithDelhivery = async () => {
        if (!selectedOrder) return;
        
        if (!selectedOrder.trackingId) {
            toast.error('Please add tracking ID first');
            return;
        }

        setSchedulingPickup(true);
        try {
            const token = await getToken();
            
            // Call backend to schedule pickup
            const { data } = await axios.post('/api/store/schedule-pickup', {
                orderId: selectedOrder._id,
                trackingId: selectedOrder.trackingId,
                courierName: selectedOrder.courier || 'Delhivery',
                shippingAddress: selectedOrder.shippingAddress,
                shipmentWeight: 1, // kg - can be configurable
                packageCount: selectedOrder.orderItems?.length || 1
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                toast.success(`✅ Pickup scheduled! ID: ${data.pickupId}`);
                fetchOrders();
            } else {
                toast.error(data.error || 'Failed to schedule pickup');
            }
        } catch (error) {
            console.error('Pickup scheduling error:', error);
            toast.error(error?.response?.data?.error || 'Failed to schedule pickup with Delhivery');
        } finally {
            setSchedulingPickup(false);
        }
    };

    const sendOrderToDelhivery = async () => {
        if (!selectedOrder) return;

        // Validate order can be sent to Delhivery
        if (!selectedOrder.shippingAddress?.street || !selectedOrder.shippingAddress?.city) {
            toast.error('Complete shipping address is required to send order to Delhivery');
            return;
        }

        setSendingToDelhivery(true);
        try {
            const token = await getToken();
            
            // Call backend to send order to Delhivery
            const { data } = await axios.post('/api/store/send-to-delhivery', {
                orderId: selectedOrder._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                toast.success('✅ Order sent to Delhivery! Waiting for AWB assignment...');
                fetchOrders();
                // Refresh selected order
                setSelectedOrder(prev => prev ? {...prev, sentToDelhivery: true, orderStatus: 'PENDING_ASSIGNMENT'} : null);
            } else {
                toast.error(data.error || 'Failed to send order to Delhivery');
            }
        } catch (error) {
            console.error('Send to Delhivery error:', error);
            toast.error(error?.response?.data?.error || 'Failed to send order to Delhivery');
        } finally {
            setSendingToDelhivery(false);
        }
    };


    if (authLoading || loading) return <Loading />;

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-6">Store <span className="text-slate-800 font-medium">Orders</span></h1>
            
            {/* Order Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <div 
                    onClick={() => setFilterStatus('ALL')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.TOTAL}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('PENDING_PAYMENT')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'PENDING_PAYMENT' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Pending Payment</p>
                    <p className="text-2xl font-bold">{stats.PENDING_PAYMENT}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('PROCESSING')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'PROCESSING' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Processing</p>
                    <p className="text-2xl font-bold">{stats.PROCESSING}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('SHIPPED')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'SHIPPED' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Shipped</p>
                    <p className="text-2xl font-bold">{stats.SHIPPED}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('DELIVERED')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'DELIVERED' ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Delivered</p>
                    <p className="text-2xl font-bold">{stats.DELIVERED}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('DAMAGED_REVIEW')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'DAMAGED_REVIEW' ? 'bg-red-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Damaged Review</p>
                    <p className="text-2xl font-bold">{stats.DAMAGED_REVIEW}</p>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
                {['ALL', 'PROCESSING', 'MANIFESTED', 'PICKUP_SCHEDULED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'RTO', 'RETURNED', 'RETURN_REQUESTED', 'DAMAGED_REVIEW'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                            filterStatus === status
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                    >
                        <span>{status === 'ALL' ? 'All Orders' : status === 'PAYMENT_FAILED' ? 'Payment Failed' : status === 'RETURN_REQUESTED' ? 'Return Requested' : status === 'DAMAGED_REVIEW' ? 'Damaged Review' : status.replace(/_/g, ' ')}</span>
                        {(status === 'RETURN_REQUESTED' || status === 'DAMAGED_REVIEW') && (status === 'RETURN_REQUESTED' ? stats.RETURN_REQUESTED : stats.DAMAGED_REVIEW) > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                filterStatus === status ? 'bg-blue-800' : 'bg-red-500 text-white'
                            }`}>
                                {status === 'RETURN_REQUESTED' ? stats.RETURN_REQUESTED : stats.DAMAGED_REVIEW}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Date Range Filters */}
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setDatePreset('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${datePreset === 'ALL' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                    >
                        All Orders
                    </button>
                    <button
                        onClick={() => setDatePreset('TODAY')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${datePreset === 'TODAY' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setDatePreset('LAST_7_DAYS')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${datePreset === 'LAST_7_DAYS' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                    >
                        Last 7 Days
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="text-xs text-slate-500">From Date & Time</label>
                        <input
                            type="datetime-local"
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setDatePreset('CUSTOM');
                            }}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500">To Date & Time</label>
                        <input
                            type="datetime-local"
                            value={toDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setDatePreset('CUSTOM');
                            }}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2 flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="text-xs text-slate-500 sm:flex-1">Showing orders by date range</div>
                        <button
                            type="button"
                            onClick={exportOrdersToCsv}
                            disabled={filteredOrders.length === 0}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filteredOrders.length === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                            }`}
                        >
                            <Download size={16} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No orders found for this status</p>
            ) : (
                <div className="overflow-x-auto w-full rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Sr. No.</th>
                                <th className="px-4 py-3">Order No.</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Delivery Rating</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Payment</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">AWB Status</th>
                                <th className="px-4 py-3">Need to Pick</th>
                                <th className="px-4 py-3">Tracking</th>
                                <th className="px-4 py-3">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map((order, index) => {
                                                                // Show 'Yes' in Need to Pick if pickup is scheduled (from Delhivery events) and not yet picked up or delivered/cancelled
                                                                let needToPick = false;
                                                                let latestTrackingStatus = '';
                                                                if (!['DELIVERED', 'CANCELLED'].includes(order.status)) {
                                                                    if (order.delhivery && Array.isArray(order.delhivery.events) && order.delhivery.events.length > 0) {
                                                                        // Get the latest event (by time)
                                                                        const sortedEvents = [...order.delhivery.events].sort((a, b) => new Date(b.time) - new Date(a.time));
                                                                        latestTrackingStatus = sortedEvents[0]?.status || '';
                                                                        const scheduledEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('pickup scheduled'));
                                                                        const pickedEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('picked up'));
                                                                        needToPick = !!scheduledEvent && !pickedEvent;
                                                                    } else {
                                                                        needToPick = !order.trackingId;
                                                                    }
                                                                }
                                                                // Pickup date: Prefer order.pickupDate, else extract from Delhivery events
                                                                let pickupDate = '';
                                                                let pickupScheduled = '';
                                                                let pickedUp = '';
                                                                if (order.pickupDate) {
                                                                    pickupDate = new Date(order.pickupDate).toLocaleDateString();
                                                                } else if (order.delhivery && Array.isArray(order.delhivery.events)) {
                                                                    // Find pickup scheduled and picked up events
                                                                    const scheduledEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('pickup scheduled'));
                                                                    const pickedEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('picked up'));
                                                                    if (scheduledEvent) {
                                                                        pickupScheduled = `Scheduled: ${new Date(scheduledEvent.time).toLocaleString()}`;
                                                                    }
                                                                    if (pickedEvent) {
                                                                        pickedUp = `Picked: ${new Date(pickedEvent.time).toLocaleString()}`;
                                                                    }
                                                                }
                                                                const agentBehaviorLabel = order.deliveryReview?.agentBehavior === 'VERY_POLITE'
                                                                    ? 'Very Polite'
                                                                    : order.deliveryReview?.agentBehavior === 'POLITE'
                                                                        ? 'Polite'
                                                                        : order.deliveryReview?.agentBehavior === 'AVERAGE'
                                                                            ? 'Average'
                                                                            : order.deliveryReview?.agentBehavior === 'RUDE'
                                                                                ? 'Rude'
                                                                                : '';
                                                                const packageConditionLabel = order.deliveryReview?.packageCondition === 'INTACT'
                                                                    ? 'Box Intact'
                                                                    : order.deliveryReview?.packageCondition === 'MINOR_DAMAGE'
                                                                        ? 'Minor Box Damage'
                                                                        : order.deliveryReview?.packageCondition === 'DAMAGED'
                                                                            ? 'Damaged Box'
                                                                            : '';
                                                                const reviewTooltip = [
                                                                    order.deliveryReview?.feedback?.trim() ? `Feedback: ${order.deliveryReview.feedback.trim()}` : '',
                                                                    agentBehaviorLabel ? `Agent: ${agentBehaviorLabel}` : '',
                                                                    packageConditionLabel ? `Package: ${packageConditionLabel}` : '',
                                                                    order.deliveryReview?.damagePhotoUrl ? 'Damage Photo: Yes' : ''
                                                                ].filter(Boolean).join(' • ');
                                return (
                                  <tr
                                    key={order._id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                  >
                                    <td className="pl-6 text-green-600 font-medium">{index + 1}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{getDisplayOrderNumber(order)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-slate-800">
                                                {order.isGuest 
                                                    ? (order.guestName || 'Guest User')
                                                    : (order.userId?.name || order.userId?.email || 'Unknown')}
                                            </span>
                                            {order.isGuest && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full w-fit font-semibold">
                                                    Guest
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-semibold ${getOrderSourceLabel(order) === 'APP' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {getOrderSourceLabel(order)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.deliveryReview?.rating ? (
                                            <div className="flex items-center gap-1.5" title={reviewTooltip || `Rating: ${order.deliveryReview.rating}/5`}>
                                                <div className="flex items-center gap-0.5" aria-label={`Delivery rating ${order.deliveryReview.rating} out of 5`}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span
                                                            key={star}
                                                            className={`text-xs leading-none ${star <= order.deliveryReview.rating ? 'text-amber-500' : 'text-slate-300'}`}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                                {order.deliveryReview?.feedback?.trim() && (
                                                    <MessageSquare size={12} className="text-slate-500" />
                                                )}
                                                {order.deliveryReview?.agentBehavior && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">A</span>
                                                )}
                                                {order.deliveryReview?.packageCondition && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">P</span>
                                                )}
                                                {order.deliveryReview?.damagePhotoUrl && (
                                                    <span className="text-[10px] text-red-600 font-semibold">📷</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{currency}{order.total}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const paymentStatusLabel = getPaymentStatus(order);
                                            let colorClass = 'bg-gray-100 text-gray-700';
                                            if (paymentStatusLabel.includes('Paid')) colorClass = 'bg-green-100 text-green-700';
                                            else if (paymentStatusLabel.includes('Unpaid') || paymentStatusLabel === 'Pending') colorClass = 'bg-red-100 text-red-700';
                                            else if (paymentStatusLabel === 'Payment Failed') colorClass = 'bg-orange-100 text-orange-700';
                                            else if (paymentStatusLabel.includes('Returned')) colorClass = 'bg-blue-100 text-blue-700';
                                            return (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{paymentStatusLabel}</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); }}>
                                        {(() => {
                                            // Use mapped status from tracking if available, else fallback to order.status
                                            const mappedStatus = mapDelhiveryStatusToOrderStatus(order.delhivery, order.status) || order.status;
                                            const mappedStatusLabel = STATUS_OPTIONS.find(s => s.value === mappedStatus)?.label || mappedStatus;
                                            return (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mappedStatus)}`}>{mappedStatusLabel}</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const status = awbStatus[order._id];
                                            if (!status || !status.generated) {
                                                return <span className="text-slate-400 text-xs">—</span>;
                                            }
                                            if (status.downloaded) {
                                                return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">✓ Downloaded</span>;
                                            }
                                            return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">📄 Generated</span>;
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-orange-600">
                                        {latestTrackingStatus ? latestTrackingStatus : (needToPick ? 'Yes' : '')}
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.trackingId ? (
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                                {order.trackingId.substring(0, 8)}...
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">Not shipped</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                                  </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-slate-700 text-sm z-50 p-4" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Order Details</h2>
                                    <p className="text-blue-100 text-xs">Order No: <span className='font-mono text-white'>{getDisplayOrderNumber(selectedOrder)}</span></p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Download Invoice"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">Download</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                setGeneratingAwb(true)
                                                // Always try to load latest store details so logo/return address stay correct.
                                                let storeData = {}
                                                const storeId = selectedOrder.storeId || selectedOrder.store || selectedOrder.sellerId || (selectedOrder.store && selectedOrder.store._id)
                                                if (storeId) {
                                                    const token = await getToken(true)
                                                    const { data } = await axios.get(`/api/store/${storeId}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    })
                                                    storeData = data?.store || {}

                                                    if (!storeContracts || storeContracts.length === 0) {
                                                        let contracts = data?.store?.contractIds || []
                                                        // If no contracts in DB, show sample contracts for testing
                                                        if (!contracts || contracts.length === 0) {
                                                            contracts = [
                                                                { key: 'contract_1', label: 'BUSINESS_PARCEL', id: '41250721' },
                                                                { key: 'contract_2', label: 'Normal', id: '41431600' },
                                                                { key: 'contract_3', label: 'speed post', id: '41853808' }
                                                            ]
                                                        }
                                                        setStoreContracts(contracts)
                                                    }
                                                }
                                                // Build AWB details form
                                                const awbDetails = {
                                                    awbNumber: selectedOrder.trackingId || selectedOrder._id,
                                                    orderId: getDisplayOrderNumber(selectedOrder),
                                                    courier: selectedOrder.courier || '',
                                                    date: new Date().toLocaleDateString(),
                                                    senderName: resolveSellerName(selectedOrder, storeData),
                                                    senderAddress: DEFAULT_SELLER_ADDRESS,
                                                    senderPhone: '',
                                                    receiverName: (selectedOrder.shippingAddress && selectedOrder.shippingAddress.name) || selectedOrder.guestName || '',
                                                    receiverAddress: selectedOrder.shippingAddress ? [selectedOrder.shippingAddress.street, selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state, selectedOrder.shippingAddress.zip].filter(Boolean).join(', ') : '',
                                                    receiverPhone: selectedOrder.shippingAddress?.phone || '',
                                                    receiverPin: selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '',
                                                    contents: (selectedOrder.orderItems || []).map(i => `${i.quantity || 1} x ${(i.name || i.product?.name || '').substring(0,40)}`).join('; '),
                                                    weight: Math.max(1, Math.ceil((selectedOrder.total || 0) / 100)),
                                                    dimensions: (awbManifestData.dimensions || []).map(d => `${d.length_cm}x${d.width_cm}x${d.height_cm} cm`).join('; '),
                                                    price: selectedOrder.total || selectedOrder.amount || '',
                                                    shippingCharge: Number(selectedOrder.shippingFee ?? selectedOrder.shipping ?? selectedOrder.deliveryCharge ?? 0),
                                                    paymentMethod: selectedOrder.paymentMethod || selectedOrder.payment_method || '',
                                                    orderItems: (selectedOrder.orderItems || []).map(item => ({
                                                        ...item,
                                                        image: resolveOrderItemImage(item)
                                                    })),
                                                    storeLogo: storeData.logo || selectedOrder.storeLogo || selectedOrder.logo || '/logo/logo1.png',
                                                    returnAddress: resolveReturnAddress(selectedOrder, storeData),
                                                    customerId: selectedOrder.customerId || selectedOrder.userId || '',
                                                    gst: storeData.gst || selectedOrder.gst || DEFAULT_GST,
                                                    contractId: '',
                                                    contractLabel: '',
                                                    paymentType: (selectedOrder.paymentMethod || '').toUpperCase().includes('COD') ? 'COD' : 'Prepaid'
                                                }
                                                setAwbFormDetails(awbDetails)
                                                setSelectedContract(null)
                                                setAwbFormPreviewUrl('')
                                                setAwbFormPreviewDoc(null)
                                                
                                                // Reset weight & dimensions form
                                                setUseManualWeight(false)
                                                setManualWeight('')
                                                setPackageLength('10')
                                                setPackageWidth('20')
                                                setPackageHeight('20')
                                                setAwbFormErrors({})
                                                
                                                setShowAwbGenerateModal(true)
                                            } catch (err) {
                                                console.error('Generate AWB error', err)
                                                toast.error('Failed to open AWB form')
                                            } finally {
                                                setGeneratingAwb(false)
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Generate AWB"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">Generate AWB</span>
                                    </button>
                                    <button
                                        onClick={() => printInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Print Invoice"
                                    >
                                        <Printer size={18} />
                                        <span className="text-sm">Print</span>
                                    </button>
                                    <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Tracking Details Section */}
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <Truck size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-orange-900">Tracking Information</h3>
                                </div>
                                
                                {selectedOrder.trackingId ? (
                                    <div className="bg-white rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.trackingId}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Courier</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.courier}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Track Order</p>
                                                {selectedOrder.trackingUrl ? (
                                                    <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                                        View Tracking
                                                    </a>
                                                ) : (
                                                    <p className="text-slate-400">No URL</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delhivery Live Status */}
                                        {selectedOrder.delhivery && (
                                            <div className="border-t border-slate-200 mt-4 pt-4">
                                                <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    📍 Live Delhivery Tracking
                                                </p>
                                                <div className="space-y-3">
                                                    {/* Current Location - Most Important */}
                                                    {selectedOrder.delhivery.current_status_location && (
                                                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-lg text-white shadow-lg border-l-4 border-green-700">
                                                            <p className="text-xs font-semibold opacity-90">📍 Current Location</p>
                                                            <p className="font-bold text-lg mt-1">{selectedOrder.delhivery.current_status_location}</p>
                                                        </div>
                                                    )}

                                                    {/* Current Status */}
                                                    {selectedOrder.delhivery.current_status && (
                                                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                                            <p className="text-xs text-slate-600 font-semibold">Status</p>
                                                            <p className="font-bold text-blue-700 mt-1 text-lg">{selectedOrder.delhivery.current_status}</p>
                                                        </div>
                                                    )}

                                                    {/* Expected Delivery */}
                                                    {selectedOrder.delhivery.expected_delivery_date && (
                                                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                                            <p className="text-xs text-slate-600 font-semibold">Expected Delivery</p>
                                                            <p className="font-bold text-purple-700 mt-1">{new Date(selectedOrder.delhivery.expected_delivery_date).toLocaleDateString()} {new Date(selectedOrder.delhivery.expected_delivery_date).toLocaleTimeString()}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Recent Events Timeline */}
                                                {selectedOrder.delhivery.events && selectedOrder.delhivery.events.length > 0 && (
                                                    <div className="border-t border-slate-200 mt-4 pt-4">
                                                        <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                                            <span>📦</span> Tracking History
                                                        </p>
                                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                                            {selectedOrder.delhivery.events.map((event, idx) => (
                                                                <div key={idx} className="border-l-3 border-blue-400 pl-3 py-2 bg-slate-50 rounded-r p-2">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <div className="flex-1">
                                                                            {event.location && (
                                                                                <div className="font-semibold text-slate-900 text-sm">📍 {event.location}</div>
                                                                            )}
                                                                            {event.status && (
                                                                                <div className="font-medium text-blue-700 text-sm mt-0.5">{event.status}</div>
                                                                            )}
                                                                            {event.remarks && (
                                                                                <div className="text-slate-600 text-xs mt-1 italic">{event.remarks}</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 whitespace-nowrap">
                                                                            {new Date(event.time).toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">AWB / Tracking ID *</label>
                                        <input
                                            type="text"
                                            value={trackingData.trackingId}
                                            onChange={e => setTrackingData({...trackingData, trackingId: e.target.value})}
                                            placeholder="Enter Delhivery AWB or courier tracking ID"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Courier Name *</label>
                                        <input
                                            type="text"
                                            value={trackingData.courier}
                                            onChange={e => setTrackingData({...trackingData, courier: e.target.value})}
                                            placeholder="e.g., FedEx, DHL, UPS"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Tracking URL</label>
                                        <input
                                            type="url"
                                            value={trackingData.trackingUrl}
                                            onChange={e => setTrackingData({...trackingData, trackingUrl: e.target.value})}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={updateTrackingDetails}
                                    className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Update Tracking & Notify Customer
                                </button>

                                {/* Manual trigger to auto-sync status from courier tracking */}
                                <button
                                    onClick={autoSyncStatusFromTracking}
                                    className="mt-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                                >
                                    Auto Status from Tracking
                                </button>

                                {/* Delhivery Pickup & Auto-Refresh Controls */}
                                {selectedOrder?.courier?.toLowerCase() === 'delhivery' && (
                                    <div className="mt-4 space-y-2">
                                        <button
                                            onClick={schedulePickupWithDelhivery}
                                            disabled={schedulingPickup || !selectedOrder?.trackingId}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            {schedulingPickup ? (
                                                <>
                                                    <span className="animate-spin">⚙️</span>
                                                    Scheduling Pickup...
                                                </>
                                            ) : (
                                                <>
                                                    <MapPin size={18} />
                                                    Schedule Delhivery Pickup
                                                </>
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                                            className={`w-full font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                                autoRefreshEnabled
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <RefreshCw size={18} />
                                            {autoRefreshEnabled ? `Auto-Refresh ON (Every ${refreshInterval}s)` : 'Auto-Refresh OFF'}
                                        </button>
                                    </div>
                                )}

                                {/* ...existing code... */}
                            </div>

                            {/* Return/Replacement Request Section */}
                            {selectedOrder.returns && selectedOrder.returns.length > 0 && (
                                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-pink-900 mb-4">Return/Replacement Requests</h3>
                                    
                                    <div className="space-y-4">
                                        {selectedOrder.returns.map((returnRequest, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-pink-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        returnRequest.type === 'RETURN' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {returnRequest.type}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        returnRequest.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                                                        returnRequest.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        returnRequest.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {returnRequest.status}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-auto">{new Date(returnRequest.requestedAt).toLocaleString()}</span>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <p className="text-slate-600 font-medium">Reason:</p>
                                                        <p className="text-slate-900">{returnRequest.reason}</p>
                                                    </div>
                                                    
                                                    {returnRequest.description && (
                                                        <div>
                                                            <p className="text-slate-600 font-medium">Description:</p>
                                                            <p className="text-slate-900">{returnRequest.description}</p>
                                                        </div>
                                                    )}

                                                    {returnRequest.images && returnRequest.images.length > 0 && (
                                                        <div>
                                                            <p className="text-slate-600 font-medium mb-2">Images:</p>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {returnRequest.images.map((img, imgIdx) => (
                                                                    <a 
                                                                        key={imgIdx} 
                                                                        href={img} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <img 
                                                                            src={img} 
                                                                            alt={`Return ${imgIdx + 1}`}
                                                                            className="w-24 h-24 object-cover rounded-lg border-2 border-pink-200 hover:border-pink-400 transition cursor-pointer"
                                                                        />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {returnRequest.status === 'REQUESTED' && (
                                                        <div className="flex gap-2 pt-3">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const token = await getToken(true);
                                                                        await axios.post('/api/store/return-requests', {
                                                                            orderId: selectedOrder._id,
                                                                            returnIndex: idx,
                                                                            action: 'APPROVE'
                                                                        }, {
                                                                            headers: { Authorization: `Bearer ${token}` }
                                                                        });
                                                                        toast.success('Approved!');
                                                                        fetchOrders();
                                                                        closeModal();
                                                                    } catch (error) {
                                                                        toast.error(error?.response?.data?.error || 'Failed');
                                                                    }
                                                                }}
                                                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                                                            >
                                                                ✓ Approve
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setRejectingReturnIndex(idx);
                                                                    setShowRejectModal(true);
                                                                }}
                                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                                                            >
                                                                ✗ Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Customer Details */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                    Customer Details
                                    {selectedOrder.isGuest && (
                                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                            GUEST ORDER
                                        </span>
                                    )}
                                </h3>
                                
                                {!selectedOrder.shippingAddress && !selectedOrder.isGuest && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                        <p className="text-yellow-800 text-sm">
                                            ⚠️ Shipping address not available for this order. This order was placed before address tracking was implemented.
                                        </p>
                                        {selectedOrder.userId && (
                                            <p className="text-yellow-700 text-xs mt-2">
                                                Customer: {selectedOrder.userId.name || selectedOrder.userId.email || 'Unknown'}
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Name</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? (selectedOrder.guestName || '—') 
                                                : (selectedOrder.shippingAddress?.name || selectedOrder.userId?.name || '—')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Email</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? (selectedOrder.guestEmail || '—') 
                                                : (selectedOrder.shippingAddress?.email || selectedOrder.userId?.email || '—')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Phone</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? ([selectedOrder.shippingAddress?.phoneCode, selectedOrder.guestPhone].filter(Boolean).join(' ') || '—')
                                                : ([selectedOrder.shippingAddress?.phoneCode, selectedOrder.shippingAddress?.phone].filter(Boolean).join(' ') || '—')}
                                        </p>
                                    </div>
                                    {(selectedOrder.shippingAddress?.alternatePhone || selectedOrder.alternatePhone) && (
                                        <div>
                                            <p className="text-slate-500">Alternate Phone</p>
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.isGuest
                                                    ? [selectedOrder.alternatePhoneCode || selectedOrder.shippingAddress?.phoneCode || '+91', selectedOrder.alternatePhone || selectedOrder.shippingAddress?.alternatePhone].filter(Boolean).join(' ')
                                                    : [selectedOrder.shippingAddress?.alternatePhoneCode || selectedOrder.shippingAddress?.phoneCode || '+91', selectedOrder.shippingAddress?.alternatePhone || selectedOrder.alternatePhone].filter(Boolean).join(' ')}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Street</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.street || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">City</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.city || '—'}</p>
                                    </div>
                                    {selectedOrder.shippingAddress?.district && selectedOrder.shippingAddress.district.trim() !== '' && (
                                        <div>
                                            <p className="text-slate-500">District</p>
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress.district}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">State</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.state || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Pincode</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Country</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.country || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                                    Order Items
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 border border-slate-200 rounded-xl p-3 bg-white hover:shadow-md transition-shadow">
                                            <img
                                                src={getImageSrc(item.productId?.images?.[0] || item.product?.images?.[0] || item.productId?.image || item.product?.image)}
                                                alt={item.productId?.name || item.product?.name || 'Product'}
                                                className="w-20 h-20 object-cover rounded-lg border border-slate-100"
                                                onError={(e) => {
                                                    if (e.currentTarget.src !== '/placeholder.png') {
                                                        e.currentTarget.src = '/placeholder.png'
                                                    }
                                                }}
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">{item.productId?.name || item.product?.name || 'Unknown Product'}</p>
                                                <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                                                <p className="text-sm font-semibold text-slate-900">{currency}{item.price} each</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900">{currency}{item.price * item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment & Status */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                                    Payment & Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
                                    <div>
                                        <p className="text-slate-500">Total Amount</p>
                                        <p className="text-xl font-bold text-slate-900">{currency}{selectedOrder.total}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Method</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Status</p>
                                        <p className="font-medium text-slate-900">{getPaymentStatus(selectedOrder)}</p>
                                    </div>
                                    
                                    {/* Delhivery Payment Collection Info */}
                                    {selectedOrder.delhivery?.payment && (
                                        <>
                                            {selectedOrder.delhivery.payment.is_cod_recovered && (
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                    <p className="text-sm text-green-700 font-medium">✓ Payment Collected by Delhivery</p>
                                                    {selectedOrder.delhivery.payment.cod_amount > 0 && (
                                                        <p className="text-sm text-green-600 mt-1">
                                                            Amount: ₹{selectedOrder.delhivery.payment.cod_amount}
                                                        </p>
                                                    )}
                                                    {selectedOrder.delhivery.payment.payment_collected_at && (
                                                        <p className="text-xs text-green-500 mt-1">
                                                            Collected: {new Date(selectedOrder.delhivery.payment.payment_collected_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {/* Razorpay Payment Settlement Info */}
                                    {selectedOrder.razorpayPaymentId && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <p className="text-sm text-blue-700 font-medium">💳 Card Payment (Razorpay)</p>
                                            <p className="text-xs text-blue-600 mt-1">Payment ID: {selectedOrder.razorpayPaymentId.slice(-8)}</p>
                                            {selectedOrder.razorpaySettlement?.is_transferred && (
                                                <p className="text-xs text-green-600 mt-1">✓ Transferred to Bank Account</p>
                                            )}
                                            {!selectedOrder.razorpaySettlement?.is_transferred && (
                                                <p className="text-xs text-amber-600 mt-1">⏳ Pending transfer to bank</p>
                                            )}
                                            <button
                                                onClick={() => checkRazorpaySettlement(selectedOrder)}
                                                className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                                            >
                                                Check Settlement Status
                                            </button>
                                        </div>
                                    )}
                                    
                                    {selectedOrder.isCouponUsed && (
                                        <div>
                                            <p className="text-slate-500">Coupon Used</p>
                                            <p className="font-medium text-green-600">{selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Order Date</p>
                                        <p className="font-medium text-slate-900">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="md:col-span-3">
                                        <p className="text-slate-500 mb-1">Delivery Review</p>
                                        {selectedOrder.deliveryReview?.rating ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-0.5" aria-label={`Delivery rating ${selectedOrder.deliveryReview.rating} out of 5`}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span
                                                                key={star}
                                                                className={`text-sm leading-none ${star <= selectedOrder.deliveryReview.rating ? 'text-amber-500' : 'text-slate-300'}`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-slate-700 font-medium">
                                                        {selectedOrder.deliveryReview.rating}/5
                                                    </span>
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {selectedOrder.deliveryReview?.agentBehavior && (
                                                        <span className="px-2 py-1 rounded bg-white border border-amber-200 text-xs text-slate-700">
                                                            Agent: {selectedOrder.deliveryReview.agentBehavior === 'VERY_POLITE'
                                                                ? 'Very Polite'
                                                                : selectedOrder.deliveryReview.agentBehavior === 'POLITE'
                                                                    ? 'Polite'
                                                                    : selectedOrder.deliveryReview.agentBehavior === 'AVERAGE'
                                                                        ? 'Average'
                                                                        : 'Rude'}
                                                        </span>
                                                    )}
                                                    {selectedOrder.deliveryReview?.packageCondition && (
                                                        <span className="px-2 py-1 rounded bg-white border border-amber-200 text-xs text-slate-700">
                                                            Package: {selectedOrder.deliveryReview.packageCondition === 'INTACT'
                                                                ? 'Box Intact'
                                                                : selectedOrder.deliveryReview.packageCondition === 'MINOR_DAMAGE'
                                                                    ? 'Minor Box Damage'
                                                                    : 'Damaged Box'}
                                                        </span>
                                                    )}
                                                </div>

                                                {selectedOrder.deliveryReview?.feedback?.trim() && (
                                                    <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-700 bg-white border border-amber-200 rounded px-2 py-1.5">
                                                        <MessageSquare size={12} className="mt-0.5 text-slate-500" />
                                                        <p>{selectedOrder.deliveryReview.feedback}</p>
                                                    </div>
                                                )}

                                                {selectedOrder.deliveryReview?.damagePhotoUrl && (
                                                    <div className="mt-2 space-y-2">
                                                        <img
                                                            src={selectedOrder.deliveryReview.damagePhotoUrl}
                                                            alt="Package damage"
                                                            className="w-28 h-28 object-cover rounded border border-amber-200"
                                                        />
                                                        <a
                                                            href={selectedOrder.deliveryReview.damagePhotoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            View damage photo
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">No delivery review yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Status Selector */}
                                <div className="border-t border-slate-200 pt-4">
                                    <label className="text-slate-600 font-semibold block mb-2 text-sm">Update Order Status</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedOrder.status}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                try {
                                                    const token = await getToken(true);
                                                    if (!token) {
                                                        toast.error('Authentication failed. Please sign in again.');
                                                        return;
                                                    }
                                                    await axios.post('/api/store/orders/update-status', {
                                                        orderId: selectedOrder._id,
                                                        status: newStatus
                                                    }, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    toast.success('Order status updated!');
                                                    setSelectedOrder({...selectedOrder, status: newStatus});
                                                    fetchOrders();
                                                } catch (error) {
                                                    console.error('Update status error:', error);
                                                    toast.error(error?.response?.data?.error || 'Failed to update status');
                                                }
                                            }}
                                            className={`flex-1 border-slate-300 rounded-lg text-sm font-medium px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none transition ${getStatusColor(selectedOrder.status)}`}
                                        >
                                            {STATUS_OPTIONS.map(status => (
                                                <option key={status.value} value={status.value}>{status.label}</option>
                                            ))}
                                        </select>
                                        <span className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center ${getStatusColor(selectedOrder.status)}`}>
                                            {selectedOrder.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
                                        try {
                                            const token = await getToken();
                                            await axios.delete(`/api/store/orders/${selectedOrder._id}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            toast.success('Order deleted successfully');
                                            setIsModalOpen(false);
                                            fetchOrders();
                                        } catch (error) {
                                            toast.error(error?.response?.data?.error || 'Failed to delete order');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow backdrop-blur-sm"
                                    title="Delete Order"
                                >
                                    <X size={18} />
                                    <span className="text-sm">Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Reason Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectingReturnIndex(null);
                }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 transform transition-all" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Reject Request</h3>
                                <p className="text-sm text-slate-500">Provide a clear reason for the customer</p>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                                Rejection Reason <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Example: Product shows no defects upon inspection. Please contact support if you believe this is an error."
                                rows="5"
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-2">This message will be visible to the customer in their order dashboard</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                    setRejectingReturnIndex(null);
                                }}
                                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!rejectReason.trim()) {
                                        toast.error('Please provide a rejection reason');
                                        return;
                                    }
                                    try {
                                        const token = await getToken(true);
                                        await axios.post('/api/store/return-requests', {
                                            orderId: selectedOrder._id,
                                            returnIndex: rejectingReturnIndex,
                                            action: 'REJECT',
                                            rejectionReason: rejectReason.trim()
                                        }, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        toast.success('Return request rejected successfully');
                                        setShowRejectModal(false);
                                        setRejectReason('');
                                        setRejectingReturnIndex(null);
                                        fetchOrders();
                                        closeModal();
                                    } catch (error) {
                                        toast.error(error?.response?.data?.error || 'Failed to reject request');
                                    }
                                }}
                                disabled={!rejectReason.trim()}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/30"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New AWB Generation Form Modal */}
            {showAwbGenerateModal && selectedOrder && (
                <div onClick={() => {
                    setUseManualWeight(false)
                    setManualWeight('')
                    setPackageLength('10')
                    setPackageWidth('20')
                    setPackageHeight('20')
                    setAwbFormErrors({})
                    setShowAwbGenerateModal(false)
                }} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[60] p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Generate AWB</h2>
                            <button onClick={() => {
                                setUseManualWeight(false)
                                setManualWeight('')
                                setPackageLength('10')
                                setPackageWidth('20')
                                setPackageHeight('20')
                                setAwbFormErrors({})
                                setShowAwbGenerateModal(false)
                            }} className="p-2 hover:bg-white/20 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* AWB Details Preview */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                <h3 className="font-bold text-lg mb-4 text-slate-900">Order & Shipment Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-600">Order ID</p>
                                        <p className="font-semibold">{awbFormDetails.orderId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600">Date</p>
                                        <p className="font-semibold">{awbFormDetails.date}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-600 mb-1">📍 From (Seller Address)</p>
                                        <p className="font-semibold text-slate-900">{awbFormDetails.senderName}</p>
                                        <p className="text-xs text-slate-700 whitespace-pre-line">{awbFormDetails.senderAddress}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-600 mb-1">📍 To (Buyer Address)</p>
                                        <p className="font-semibold text-slate-900">{awbFormDetails.receiverName}</p>
                                        <p className="text-xs text-slate-700">{awbFormDetails.receiverAddress}</p>
                                        <p className="text-xs text-slate-600">{awbFormDetails.receiverPhone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600">Weight (g)</p>
                                        <p className="font-semibold">{awbFormDetails.weight}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600">Total Amount</p>
                                        <p className="font-semibold">₹{awbFormDetails.price}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-600 mb-1">📦 Product Details</p>
                                        <div className="bg-white border rounded-lg p-3 max-h-56 overflow-y-auto">
                                            {awbFormDetails.orderItems && awbFormDetails.orderItems.length > 0 ? (
                                                <div className="space-y-4">
                                                    {awbFormDetails.orderItems.map((item, idx) => (
                                                        <div key={idx} className="border-b pb-3 last:border-b-0 flex gap-3">
                                                            {/* Product Image */}
                                                            <div className="flex-shrink-0">
                                                                <img 
                                                                    src={getImageSrc(item.image || item.product?.image || item.productId?.image || item.product?.images?.[0] || item.productId?.images?.[0])} 
                                                                    alt={item.name || item.product?.name}
                                                                    className="w-16 h-16 object-cover rounded-lg border"
                                                                />
                                                            </div>
                                                            {/* Product Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-slate-900 truncate">{item.name || item.product?.name || 'Product'}</p>
                                                                {item.sku && <p className="text-xs text-slate-600">SKU: {item.sku}</p>}
                                                                <p className="text-xs text-slate-600">Qty: {item.quantity || 1}</p>
                                                                <p className="text-xs text-slate-600">Price: ₹{item.price || item.product?.price || '0'} each</p>
                                                                <p className="text-xs font-semibold text-slate-700 mt-1">Subtotal: ₹{((item.quantity || 1) * (item.price || item.product?.price || 0)).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-600">{awbFormDetails.contents || 'No items'}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-600 mb-1">📍 Return Address</p>
                                        <p className="text-xs text-slate-700 bg-red-50 border border-red-200 rounded-lg p-2">{awbFormDetails.returnAddress || 'Store return address not set'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-600 mb-1">💳 Payment Method</p>
                                        <p className="text-sm font-bold px-3 py-2 rounded-lg inline-block" style={{backgroundColor: awbFormDetails.paymentType === 'COD' ? '#fef3c7' : '#d1fae5', color: awbFormDetails.paymentType === 'COD' ? '#92400e' : '#065f46'}}>
                                            {awbFormDetails.paymentType === 'COD' ? '💵 COD - Surface' : '💳 Prepaid'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ⭐ WEIGHT & DIMENSIONS INPUT SECTION ⭐ */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">📦</div>
                                    <h3 className="font-bold text-lg text-slate-900">Package Weight & Dimensions <span className="text-red-600">*</span></h3>
                                </div>

                                {/* WEIGHT WITH TOGGLE */}
                                <div className="mb-5 pb-5 border-b border-amber-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="font-semibold text-slate-900">Weight (grams)</label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useManualWeight}
                                                onChange={(e) => {
                                                    setUseManualWeight(e.target.checked);
                                                    if (!e.target.checked) setManualWeight('');
                                                    setAwbFormErrors(prev => ({ ...prev, weight: '' }));
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-700">Use Custom Weight</span>
                                        </label>
                                    </div>

                                    {!useManualWeight ? (
                                        <div className="bg-white border-2 border-amber-300 rounded-lg p-3">
                                            <p className="text-lg font-bold text-slate-900">500g</p>
                                            <p className="text-xs text-slate-600 mt-1">📌 Default weight — check above to customise</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <input
                                                type="number"
                                                min="1"
                                                max="35000"
                                                value={manualWeight}
                                                onChange={(e) => {
                                                    setManualWeight(e.target.value);
                                                    setAwbFormErrors(prev => ({ ...prev, weight: '' }));
                                                }}
                                                placeholder="Enter custom weight in grams"
                                                className="w-full px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 bg-blue-50"
                                            />
                                            <p className="text-xs text-slate-600 mt-2">✏️ Editing custom weight</p>
                                        </div>
                                    )}
                                    {awbFormErrors.weight && <p className="text-red-600 text-sm mt-2">{awbFormErrors.weight}</p>}
                                </div>

                                {/* DIMENSIONS GRID */}
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-3">Dimensions</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* LENGTH */}
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 block mb-2">Length (cm)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="300"
                                                step="0.1"
                                                value={packageLength}
                                                onChange={(e) => {
                                                    setPackageLength(e.target.value);
                                                    setAwbFormErrors(prev => ({ ...prev, length: '' }));
                                                }}
                                                placeholder="e.g., 30"
                                                className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 bg-blue-50"
                                            />
                                            {awbFormErrors.length && <p className="text-red-600 text-xs mt-1">{awbFormErrors.length}</p>}
                                        </div>

                                        {/* WIDTH */}
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 block mb-2">Width (cm)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="300"
                                                step="0.1"
                                                value={packageWidth}
                                                onChange={(e) => {
                                                    setPackageWidth(e.target.value);
                                                    setAwbFormErrors(prev => ({ ...prev, width: '' }));
                                                }}
                                                placeholder="e.g., 20"
                                                className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 bg-blue-50"
                                            />
                                            {awbFormErrors.width && <p className="text-red-600 text-xs mt-1">{awbFormErrors.width}</p>}
                                        </div>

                                        {/* HEIGHT */}
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 block mb-2">Height (cm)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="300"
                                                step="0.1"
                                                value={packageHeight}
                                                onChange={(e) => {
                                                    setPackageHeight(e.target.value);
                                                    setAwbFormErrors(prev => ({ ...prev, height: '' }));
                                                }}
                                                placeholder="e.g., 10"
                                                className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 bg-blue-50"
                                            />
                                            {awbFormErrors.height && <p className="text-red-600 text-xs mt-1">{awbFormErrors.height}</p>}
                                        </div>
                                    </div>

                                    {/* VOLUMETRIC WEIGHT INFO */}
                                    {packageLength && packageWidth && packageHeight && (
                                        <div className="mt-4 bg-blue-100 border-l-4 border-blue-600 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-slate-900">📊 Volumetric Weight:</p>
                                            <p className="text-sm text-slate-800 mt-1">
                                                ({packageLength} × {packageWidth} × {packageHeight}) ÷ 5000 = <strong>{(packageLength * packageWidth * packageHeight / 5000).toFixed(2)} kg</strong>
                                            </p>
                                            <p className="text-xs text-slate-700 mt-2">💡 <strong>Charged weight = max(actual, volumetric)</strong></p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">🏢</div>
                                    <h3 className="font-bold text-lg text-slate-900">Select Contract ID <span className="text-red-600">*</span> (Required)</h3>
                                </div>
                                <p className="text-xs text-slate-600 mb-4">Choose which contract applies to this shipment:</p>
                                <div className="space-y-3">
                                    {storeContracts && storeContracts.length > 0 ? (
                                        storeContracts.map(c => (
                                            <label key={c.key} className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all" 
                                                style={{borderColor: selectedContract?.key === c.key ? '#3b82f6' : '#e5e7eb', backgroundColor: selectedContract?.key === c.key ? '#eff6ff' : '#ffffff'}}>
                                                <input
                                                    type="radio"
                                                    name="awb-contract"
                                                    value={c.key}
                                                    checked={selectedContract?.key === c.key}
                                                    onChange={() => setSelectedContract(c)}
                                                    className="w-5 h-5 text-blue-600 cursor-pointer"
                                                />
                                                <div className="ml-4 flex-1">
                                                    <p className="font-bold text-slate-900">{c.label || c.key}</p>
                                                    <p className="text-sm text-slate-600 font-mono">ID: {c.id}</p>
                                                </div>
                                                {selectedContract?.key === c.key && (
                                                    <span className="text-blue-600 font-bold text-lg">✓</span>
                                                )}
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-slate-600 text-sm">No contracts available</p>
                                    )}
                                </div>
                            </div>

                            {/* Preview & Download buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={async () => {
                                        // VALIDATION: Check weight & dimensions
                                        const errors = {};
                                        const effectiveWeight = useManualWeight ? manualWeight : 500;
                                        
                                        if (!effectiveWeight || effectiveWeight <= 0) {
                                            errors.weight = 'Weight must be greater than 0 grams';
                                        }
                                        if (effectiveWeight > 35000) {
                                            errors.weight = 'Weight must not exceed 35,000 grams (35 kg)';
                                        }
                                        
                                        if (!packageLength || packageLength <= 0) {
                                            errors.length = 'Length is required';
                                        } else if (packageLength > 300) {
                                            errors.length = 'Length max 300 cm';
                                        }
                                        
                                        if (!packageWidth || packageWidth <= 0) {
                                            errors.width = 'Width is required';
                                        } else if (packageWidth > 300) {
                                            errors.width = 'Width max 300 cm';
                                        }
                                        
                                        if (!packageHeight || packageHeight <= 0) {
                                            errors.height = 'Height is required';
                                        } else if (packageHeight > 300) {
                                            errors.height = 'Height max 300 cm';
                                        }
                                        
                                        if (!selectedContract) {
                                            errors.contract = 'Please select a contract first';
                                        }
                                        
                                        // Show errors if any
                                        if (Object.keys(errors).length > 0) {
                                            setAwbFormErrors(errors);
                                            if (errors.contract) {
                                                toast.error(errors.contract);
                                            } else {
                                                toast.error('Please fill in all required fields correctly');
                                            }
                                            return;
                                        }
                                        
                                        // Clear errors
                                        setAwbFormErrors({});
                                        
                                        try {
                                            setAwbPreviewGenerating(true)
                                            const detailsWithContract = {
                                                ...awbFormDetails,
                                                contractId: selectedContract.id,
                                                contractLabel: selectedContract.label,
                                                weight: useManualWeight ? parseInt(manualWeight) : 500,
                                                isManualWeight: useManualWeight,
                                                dimensions: {
                                                    length: parseFloat(packageLength),
                                                    width: parseFloat(packageWidth),
                                                    height: parseFloat(packageHeight)
                                                }
                                            }
                                            const doc = generateAwbBill(detailsWithContract)
                                            const blob = doc.output('blob')
                                            const url = URL.createObjectURL(blob)
                                            setAwbFormPreviewDoc(doc)
                                            setAwbFormPreviewUrl(url)
                                            // Mark AWB as generated for this order
                                            setAwbStatus(prev => ({
                                                ...prev,
                                                [selectedOrder._id]: { ...prev[selectedOrder._id], generated: true }
                                            }))
                                            toast.success('AWB preview generated')
                                        } catch (err) {
                                            console.error('AWB generation error', err)
                                            toast.error('Failed to generate AWB')
                                        } finally {
                                            setAwbPreviewGenerating(false)
                                        }
                                    }}
                                    className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                                        awbPreviewGenerating
                                            ? 'bg-gray-400 text-white cursor-wait'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {awbPreviewGenerating ? '⏳ Generating...' : '👁️ Preview AWB'}
                                </button>
                                
                                <button
                                    onClick={async () => {
                                        if (!awbFormPreviewDoc) {
                                            toast.error('Please preview AWB first')
                                            return
                                        }
                                        try {
                                            awbFormPreviewDoc.save(`AWB_${awbFormDetails.orderId}_${new Date().getTime()}.pdf`)
                                            // Mark AWB as downloaded for this order
                                            setAwbStatus(prev => ({
                                                ...prev,
                                                [selectedOrder._id]: { ...prev[selectedOrder._id], generated: true, downloaded: true }
                                            }))
                                            toast.success('AWB downloaded successfully')
                                            
                                            // Reset form and close
                                            setUseManualWeight(false)
                                            setManualWeight('')
                                            setPackageLength('10')
                                            setPackageWidth('20')
                                            setPackageHeight('20')
                                            setAwbFormErrors({})
                                            setShowAwbGenerateModal(false)
                                        } catch (err) {
                                            console.error('Download error', err)
                                            toast.error('Failed to download AWB')
                                        }
                                    }}
                                    disabled={!awbFormPreviewDoc}
                                    className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                                        !awbFormPreviewDoc
                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {!awbFormPreviewDoc ? '⬇️ Download (preview first)' : '⬇️ Download AWB'}
                                </button>

                                <button
                                    onClick={() => {
                                        // Reset form and close
                                        setUseManualWeight(false)
                                        setManualWeight('')
                                        setPackageLength('10')
                                        setPackageWidth('20')
                                        setPackageHeight('20')
                                        setAwbFormErrors({})
                                        setShowAwbGenerateModal(false)
                                    }}
                                    className="px-6 py-3 bg-gray-300 text-slate-700 rounded-lg font-semibold hover:bg-gray-400 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* AWB PDF Preview in iframe if available */}
                        {awbFormPreviewUrl && (
                            <div className="border-t p-6">
                                <h3 className="font-bold text-lg mb-3 text-slate-900">📄 AWB Preview</h3>
                                <iframe
                                    src={awbFormPreviewUrl}
                                    className="w-full h-96 border rounded-lg"
                                    title="AWB Preview"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

