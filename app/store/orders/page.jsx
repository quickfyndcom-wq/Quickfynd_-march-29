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
import { downloadAwbBill, generateAwbBill, generateCombinedAwbBill } from "@/lib/generateAwbBill"
import { schedulePickup } from '@/lib/delhivery'
import { getDisplayOrderNumber } from '@/lib/orderNumber'

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
    const AWB_STATUS_STORAGE_KEY = 'store-orders-awb-status-v1'
    const AWB_DETAILS_STORAGE_KEY = 'store-orders-awb-details-v1'
    const DEFAULT_RETURN_ADDRESS = 'Nilaas Shop, MLA Road, Near Police Station, Ambalamukku, Kunnamangalam, Kozhikode - 673571, Kerala, India'
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
        const isInvalidString = (value) => {
            const normalized = String(value || '').trim().toLowerCase()
            return !normalized || normalized === '[object object]' || normalized === 'null' || normalized === 'undefined'
        }

        if (Array.isArray(image)) return getImageSrc(image[0])
        if (typeof image === 'string' && !isInvalidString(image)) return image.trim()
        if (image && typeof image === 'object') {
            const candidate = image.url || image.src || image.secure_url || image.image || image.thumbnail || ''
            if (!isInvalidString(candidate)) return String(candidate).trim()
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
        courier: '',
        returnTrackingId: '',
        returnTrackingUrl: '',
        returnCourier: '',
        replacementTrackingId: '',
        replacementTrackingUrl: '',
        replacementCourier: ''
    });
    const [indiaPostAwb, setIndiaPostAwb] = useState('');
    const [indiaPostTracking, setIndiaPostTracking] = useState(null);
    const [fetchingIndiaPostTracking, setFetchingIndiaPostTracking] = useState(false);
    const [indiaPostNoKey, setIndiaPostNoKey] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDelivery, setFilterDelivery] = useState('ALL');
    const [filterCancel, setFilterCancel] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isEditingOrderDetails, setIsEditingOrderDetails] = useState(false);
    const [savingOrderDetails, setSavingOrderDetails] = useState(false);
    const [paymentLinkAmount, setPaymentLinkAmount] = useState('');
    const [generatedPaymentLink, setGeneratedPaymentLink] = useState('');
    const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
    const [pendingCancelStatus, setPendingCancelStatus] = useState(null);
    const [cancelModalReason, setCancelModalReason] = useState('');
    const [cancelModalBy, setCancelModalBy] = useState('SELLER');
    const [savingCancellationDetails, setSavingCancellationDetails] = useState(false);
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
    const [ltlLabelSize, setLtlLabelSize] = useState('thermal_4x6');
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
    const [awbModalMode, setAwbModalMode] = useState('generate');
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
    const [awbStatus, setAwbStatus] = useState(() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem('store-orders-awb-status-v1');
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {}
        return {};
    }); // { orderId: { generated: true, downloaded: true } }
    const [awbDetailsByOrder, setAwbDetailsByOrder] = useState(() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem('store-orders-awb-details-v1');
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {}
        return {};
    });
    const [selectedAwbOrderIds, setSelectedAwbOrderIds] = useState([]);
    const [bulkDownloadingAwbs, setBulkDownloadingAwbs] = useState(false);
    const [bulkLabelsPerPage, setBulkLabelsPerPage] = useState(4);
    
    const storeSettingsCacheRef = useRef(undefined);
    const refreshIntervalRef = useRef(null);
    const router = useRouter();

    const { user, getToken, loading: authLoading } = useAuth();

    const getOrderAwbNumber = (order) => {
        return String(order?.trackingId || order?.awb || order?.airwayBillNo || '').trim();
    };

    const getOrderStoreId = (order) => {
        const storeRef = order?.store;
        return order?.storeId || order?.sellerId || (typeof storeRef === 'string' ? storeRef : storeRef?._id) || '';
    };

    const hasGeneratedAwb = (order) => {
        const hasLocalAwbDetails = Boolean(
            awbDetailsByOrder?.[order?._id] && Object.keys(awbDetailsByOrder[order._id] || {}).length > 0
        );
        const localGenerated = Boolean(awbStatus?.[order?._id]?.generated);
        const orderStatus = String(order?.orderStatus || order?.status || '').toUpperCase();
        const awbWorkflowStatuses = new Set([
            'PENDING_ASSIGNMENT',
            'MANIFESTED',
            'PICKUP_SCHEDULED',
            'PICKUP_REQUESTED',
            'WAITING_FOR_PICKUP',
        ]);
        const courierQueued = Boolean(order?.sentToDelhivery || awbWorkflowStatuses.has(orderStatus));
        const hasServerAwbReference = Boolean(getOrderAwbNumber(order));
        return Boolean(localGenerated || hasLocalAwbDetails || courierQueued || hasServerAwbReference);
    };

    const hasGeneratedAwbMissingReference = (order) => {
        return Boolean(hasGeneratedAwb(order) && !getOrderAwbNumber(order));
    };

    const hasAwbQueuedWithoutReference = (order) => {
        const orderStatus = String(order?.orderStatus || order?.status || '').toUpperCase();
        const awbWorkflowStatuses = new Set([
            'PENDING_ASSIGNMENT',
            'MANIFESTED',
            'PICKUP_SCHEDULED',
            'PICKUP_REQUESTED',
            'WAITING_FOR_PICKUP',
        ]);
        const courierQueued = Boolean(order?.sentToDelhivery || awbWorkflowStatuses.has(orderStatus));
        const hasLocalAwbDetails = Boolean(
            awbDetailsByOrder?.[order?._id] && Object.keys(awbDetailsByOrder[order._id] || {}).length > 0
        );
        return Boolean((courierQueued || hasLocalAwbDetails) && !getOrderAwbNumber(order));
    };

    const hasReturnWithStatus = (order, status) => {
        return Boolean(order?.returns?.some((returnRequest) => returnRequest?.status === status));
    };

    const hasReturnByTypeAndStatus = (order, type, status) => {
        return Boolean(order?.returns?.some((returnRequest) => returnRequest?.type === type && returnRequest?.status === status));
    };

    const TRACKED_LIFECYCLE_STATUSES = new Set([
        'RETURNED',
        'RETURN_INITIATED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'REPLACEMENT_REQUESTED',
        'REPLACEMENT_APPROVED',
        'REPLACEMENT_SHIPPED',
        'REPLACEMENT_OUT_FOR_DELIVERY',
        'REPLACEMENT_DELIVERED',
        'REPLACED',
        'RETURNED_REFUNDED'
    ]);

    const getLifecycleBucket = (order) => {
        const normalizedOrderStatus = String(order?.status || '').toUpperCase();
        if (TRACKED_LIFECYCLE_STATUSES.has(normalizedOrderStatus)) {
            if (normalizedOrderStatus === 'REPLACEMENT_DELIVERED') {
                return 'REPLACED';
            }
            return normalizedOrderStatus;
        }

        const returnRequests = Array.isArray(order?.returns) ? order.returns : [];
        for (let index = returnRequests.length - 1; index >= 0; index -= 1) {
            const returnRequest = returnRequests[index];
            const label = getReturnRequestStatusLabel(returnRequest);
            if (label === 'UNKNOWN') continue;
            if (label === 'REQUESTED') {
                return returnRequest?.type === 'REPLACEMENT' ? 'REPLACEMENT_REQUESTED' : 'RETURN_REQUESTED';
            }
            if (label === 'REJECTED') {
                return returnRequest?.type === 'RETURN' ? 'RETURN_REJECTED' : null;
            }
            if (TRACKED_LIFECYCLE_STATUSES.has(label)) {
                return label;
            }
        }

        return null;
    };

    const hasLifecycleStatus = (order, status) => {
        return getLifecycleBucket(order) === status;
    };

    const getReturnRequestStatusLabel = (returnRequest) => {
        if (!returnRequest) return 'UNKNOWN';
        if (returnRequest.type === 'REPLACEMENT' && returnRequest.status === 'REQUESTED') return 'REPLACEMENT_REQUESTED';
        if (returnRequest.type === 'REPLACEMENT' && returnRequest.status === 'APPROVED') return 'REPLACEMENT_APPROVED';
        if (returnRequest.type === 'REPLACEMENT' && returnRequest.status === 'COMPLETED') return 'REPLACED';
        if (returnRequest.type === 'RETURN' && returnRequest.status === 'APPROVED') return 'RETURN_APPROVED';
        if (returnRequest.type === 'RETURN' && returnRequest.status === 'COMPLETED') return 'RETURNED_REFUNDED';
        return returnRequest.status;
    };

    const getReturnedRefundAmount = (order) => {
        if (!order?.returns?.length || !order?.orderItems?.length) return 0;

        return order.returns.reduce((sum, returnRequest) => {
            if (returnRequest?.type !== 'RETURN' || returnRequest?.status !== 'COMPLETED') {
                return sum;
            }

            const item = order.orderItems?.[returnRequest.itemIndex];
            if (!item) return sum;

            const itemAmount = Number(item.price || 0) * Number(item.quantity || 1);
            return sum + itemAmount;
        }, 0);
    };

    const getNetOrderAmount = (order) => {
        const orderTotal = Number(order?.total || 0);
        const refundedAmount = getReturnedRefundAmount(order);
        return Math.max(0, orderTotal - refundedAmount);
    };

    const hasAwbPendingDownload = (order) => {
        // Once an AWB/tracking reference exists on the order, remove it from
        // AWB Generated pending list.
        if (getOrderAwbNumber(order)) {
            return false;
        }

        const status = awbStatus?.[order?._id];
        if (status?.generated) {
            return Boolean(!status?.downloaded);
        }
        return false;
    };

    const openAwbEditor = async (order) => {
        try {
            setGeneratingAwb(true)
            setAwbModalMode(hasGeneratedAwb(order) ? 'edit' : 'generate')

            // Always try to load latest store details so logo/return address stay correct.
            let storeData = {}
            const storeId = getOrderStoreId(order)
            if (storeId) {
                const token = await getToken(true).catch(() => null)
                storeData = await getCurrentStoreSettings(order, token)

                if (!storeContracts || storeContracts.length === 0) {
                    let contracts = storeData?.contractIds || []
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

            const awbDetails = {
                ...buildAwbDetails(order, storeData),
                ...(awbDetailsByOrder?.[order._id] || {})
            }
            setAwbFormDetails(awbDetails)

            const contracts = (storeContracts && storeContracts.length > 0)
                ? storeContracts
                : (storeData?.contractIds || [])
            const preselectedContract = contracts.find((contract) => {
                return String(contract?.id || '') === String(awbDetails?.contractId || '')
            }) || null
            setSelectedContract(preselectedContract)
            setAwbFormPreviewUrl('')
            setAwbFormPreviewDoc(null)

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
    }

    const getCurrentStoreSettings = async (order, tokenOverride) => {
        if (storeSettingsCacheRef.current !== undefined) {
            return storeSettingsCacheRef.current || {};
        }

        const token = tokenOverride || await getToken().catch(() => null);
        const storeId = getOrderStoreId(order);
        if (!token) {
            if (!storeId) return {};
            try {
                const { data } = await axios.get(`/api/store/${storeId}`);
                storeSettingsCacheRef.current = data?.store || {};
                return storeSettingsCacheRef.current;
            } catch {
                return {};
            }
        }

        try {
            const { data } = await axios.get('/api/store/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            storeSettingsCacheRef.current = data?.store || {};
            return storeSettingsCacheRef.current;
        } catch (error) {
            if (storeId) {
                try {
                    const { data } = await axios.get(`/api/store/${storeId}`);
                    storeSettingsCacheRef.current = data?.store || {};
                    return storeSettingsCacheRef.current;
                } catch {
                    return {};
                }
            }
            return {};
        }
    };

    const buildAwbDetails = (order, storeData = {}) => ({
        awbNumber: getOrderAwbNumber(order) || order?._id,
        labelSize: ltlLabelSize,
        orderId: getDisplayOrderNumber(order),
        courier: order?.courier || '',
        date: new Date().toLocaleDateString(),
        senderName: resolveSellerName(order, storeData),
        senderAddress: DEFAULT_SELLER_ADDRESS,
        senderPhone: storeData.phone || order?.storePhone || '9526367551',
        receiverName: order?.shippingAddress?.name || order?.guestName || '',
        receiverAddress: order?.shippingAddress
            ? [order.shippingAddress.street, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip].filter(Boolean).join(', ')
            : '',
        receiverPhone: order?.shippingAddress?.phone || order?.guestPhone || order?.phone || '',
        alternatePhone: order?.alternatePhone || order?.shippingAddress?.alternatePhone || '',
        receiverPin: order?.shippingAddress?.zip || order?.shippingAddress?.pincode || '',
        contents: (order?.orderItems || []).map(i => `${i.quantity || 1} x ${(i.name || i.product?.name || '').substring(0, 40)}`).join('; '),
        weight: Math.max(1, Math.ceil((order?.total || 0) / 100)),
        dimensions: (awbManifestData.dimensions || []).map(d => `${d.length_cm}x${d.width_cm}x${d.height_cm} cm`).join('; '),
        price: order?.total || order?.amount || '',
        shippingCharge: Number(order?.shippingFee ?? order?.shipping ?? order?.deliveryCharge ?? 0),
        paymentMethod: order?.paymentMethod || order?.payment_method || '',
        orderItems: (order?.orderItems || []).map(item => ({
            ...item,
            image: resolveOrderItemImage(item)
        })),
        storeLogo: storeData.logo || order?.storeLogo || order?.logo || '/logo/logo1.png',
        returnAddress: resolveReturnAddress(order, storeData),
        customerId: order?.customerId || order?.userId || '',
        gst: storeData.gst || order?.gst || DEFAULT_GST,
        contractId: '',
        contractLabel: '',
        paymentType: (order?.paymentMethod || '').toUpperCase().includes('COD') ? 'COD' : 'Prepaid'
    });

    const toggleAwbSelection = (orderId) => {
        setSelectedAwbOrderIds((prev) => (
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
        ));
    };

    const downloadSelectedAwbs = async (ordersToDownload) => {
        if (!ordersToDownload.length) {
            toast.error('Select at least one AWB to download.');
            return;
        }

        try {
            setBulkDownloadingAwbs(true);
            const token = await getToken().catch(() => null);
            const storeData = await getCurrentStoreSettings(ordersToDownload[0], token);
            const awbDetailsList = [];

            for (const order of ordersToDownload) {
                try {
                    const perOrderDetails = awbDetailsByOrder?.[order._id] || {};
                    awbDetailsList.push({
                        ...buildAwbDetails(order, storeData),
                        ...perOrderDetails,
                        // Fall back to the currently selected contract if this order
                        // hasn't had an individual AWB preview generated yet
                        contractId: perOrderDetails.contractId || selectedContract?.id || selectedContract?.key || '',
                        contractLabel: perOrderDetails.contractLabel || selectedContract?.label || '',
                    });
                } catch (error) {
                    console.error('Bulk AWB generation failed:', order?._id, error);
                }
            }

            if (!awbDetailsList.length) {
                toast.error('Failed to download selected AWBs.');
                return;
            }

            const combinedDoc = generateCombinedAwbBill(awbDetailsList, { labelsPerPage: bulkLabelsPerPage });
            combinedDoc.save(`AWB_bulk_${new Date().getTime()}.pdf`);

            setAwbStatus((prev) => {
                const next = { ...prev };
                ordersToDownload.forEach((order) => {
                    next[order._id] = { ...next[order._id], generated: true, downloaded: true };
                });
                return next;
            });

            toast.success(`${awbDetailsList.length} AWB ${awbDetailsList.length === 1 ? 'added to the PDF' : 'added to one PDF'}`);
        } finally {
            setBulkDownloadingAwbs(false);
        }
    };

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
        { value: 'REPLACEMENT_REQUESTED', label: 'Replacement Requested', color: 'bg-violet-100 text-violet-700' },
        { value: 'REPLACEMENT_APPROVED', label: 'Replacement Approved', color: 'bg-violet-100 text-violet-700' },
        { value: 'REPLACEMENT_SHIPPED', label: 'Replacement Shipped', color: 'bg-purple-100 text-purple-700' },
        { value: 'REPLACEMENT_OUT_FOR_DELIVERY', label: 'Replacement Out For Delivery', color: 'bg-teal-100 text-teal-700' },
        { value: 'REPLACEMENT_DELIVERED', label: 'Replacement Delivered', color: 'bg-green-100 text-green-700' },
        { value: 'REPLACED', label: 'Replaced', color: 'bg-emerald-100 text-emerald-700' },
    ];

    const PAYMENT_METHOD_OPTIONS = [
        { value: 'COD', label: 'COD' },
        { value: 'CARD', label: 'CARD' },
        { value: 'RAZORPAY', label: 'RAZORPAY' },
        { value: 'WALLET', label: 'WALLET' },
        { value: 'STRIPE', label: 'STRIPE' },
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

        if (orderStatus === 'RETURNED' || orderStatus === 'RETURNED_REFUNDED') return false;
        if (orderStatus === 'PAYMENT_FAILED') return false;

        // Explicit paid markers should always show paid.
        if (orderStatus === 'PAID' || paymentMethod === 'paid' || paymentStatus === 'paid' || order?.isPaid) return true;

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

    const isConvertedOrder = (order) => {
        if (String(order?.convertedByEmployeeName || '').trim()) return true;
        if (Boolean(order?.convertedFromAbandonedCheckout)) return true;
        const notes = String(order?.notes || '').trim();
        return /converted from abandoned checkout by\s+(.+)$/i.test(notes);
    };

    // Calculate order statistics
    const getOrderStats = () => {
        const isRegularStatusOrder = (order) => !getLifecycleBucket(order);
        const stats = {
            TOTAL: orders.length,
            ORDER_PLACED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'ORDER_PLACED').length,
            PROCESSING: orders.filter(o => isRegularStatusOrder(o) && o.status === 'PROCESSING').length,
            MANIFESTED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'MANIFESTED').length,
            PICKUP_SCHEDULED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'PICKUP_SCHEDULED').length,
            SHIPPED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'SHIPPED').length,
            DELIVERED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'DELIVERED').length,
            CANCELLED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'CANCELLED').length,
            PAYMENT_FAILED: orders.filter(o => isRegularStatusOrder(o) && o.status === 'PAYMENT_FAILED').length,
            FAILED_ORDER: orders.filter(o => isRegularStatusOrder(o) && (o.status === 'PAYMENT_FAILED' || o.paymentStatus === 'FAILED')).length,
            RTO: orders.filter(o => isRegularStatusOrder(o) && o.status === 'RTO').length,
            RETURNED: orders.filter(o => hasLifecycleStatus(o, 'RETURNED')).length,
            RETURN_REQUESTED: orders.filter(o => hasLifecycleStatus(o, 'RETURN_REQUESTED')).length,
            RETURN_APPROVED: orders.filter(o => hasLifecycleStatus(o, 'RETURN_APPROVED')).length,
            RETURN_REJECTED: orders.filter(o => hasLifecycleStatus(o, 'RETURN_REJECTED')).length,
            REPLACEMENT_REQUESTED: orders.filter(o => hasLifecycleStatus(o, 'REPLACEMENT_REQUESTED')).length,
            REPLACEMENT_APPROVED: orders.filter(o => hasLifecycleStatus(o, 'REPLACEMENT_APPROVED')).length,
            REPLACED: orders.filter(o => hasLifecycleStatus(o, 'REPLACED')).length,
            RETURNED_REFUNDED: orders.filter(o => hasLifecycleStatus(o, 'RETURNED_REFUNDED')).length,
            DAMAGED_REVIEW: orders.filter(o => ['MINOR_DAMAGE', 'DAMAGED'].includes(o?.deliveryReview?.packageCondition)).length,
            AWB_GENERATED: orders.filter(o => hasAwbPendingDownload(o)).length,
            AWB_REFERENCE_MISSING: orders.filter(o => hasGeneratedAwbMissingReference(o)).length,
            CONVERTED: orders.filter(o => isConvertedOrder(o)).length,
            PENDING_PAYMENT: orders.filter(o => {
                // Exclude cancelled, returned, RTO, payment failed, and return-requested orders
                const hasReturn = hasReturnWithStatus(o, 'REQUESTED');
                return isRegularStatusOrder(o) && !isOrderPaid(o) && !hasReturn && o.status !== 'CANCELLED' && o.status !== 'RETURNED' && o.status !== 'RTO' && o.status !== 'PAYMENT_FAILED';
            }).length,
            PENDING_SHIPMENT: orders.filter(o => isRegularStatusOrder(o) && !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status)).length,
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
        let statusFiltered;
        if (filterStatus === 'ALL') statusFiltered = dateFiltered.filter(o => o.status !== 'PAYMENT_FAILED' && o.paymentStatus !== 'FAILED');
        else if (filterStatus === 'PENDING_PAYMENT') {
            const hasReturn = (o) => hasReturnWithStatus(o, 'REQUESTED');
            statusFiltered = dateFiltered.filter(o => !getLifecycleBucket(o) && !isOrderPaid(o) && !hasReturn(o) && o.status !== 'CANCELLED' && o.status !== 'RETURNED' && o.status !== 'RTO' && o.status !== 'PAYMENT_FAILED');
        }
        else if (filterStatus === 'PENDING_SHIPMENT') statusFiltered = dateFiltered.filter(o => !getLifecycleBucket(o) && !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status));
        else if (filterStatus === 'AWB_GENERATED') statusFiltered = dateFiltered.filter(o => hasAwbPendingDownload(o));
        else if (filterStatus === 'AWB_REFERENCE_MISSING') statusFiltered = dateFiltered.filter(o => hasGeneratedAwbMissingReference(o));
        else if (filterStatus === 'CONVERTED') statusFiltered = dateFiltered.filter(o => isConvertedOrder(o));
        else if (filterStatus === 'RETURN_REQUESTED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'RETURN_REQUESTED'));
        else if (filterStatus === 'RETURN_APPROVED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'RETURN_APPROVED'));
        else if (filterStatus === 'RETURN_REJECTED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'RETURN_REJECTED'));
        else if (filterStatus === 'REPLACEMENT_REQUESTED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'REPLACEMENT_REQUESTED'));
        else if (filterStatus === 'REPLACEMENT_APPROVED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'REPLACEMENT_APPROVED'));
        else if (filterStatus === 'REPLACED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'REPLACED'));
        else if (filterStatus === 'RETURNED_REFUNDED') statusFiltered = dateFiltered.filter(o => hasLifecycleStatus(o, 'RETURNED_REFUNDED'));
        else if (filterStatus === 'DAMAGED_REVIEW') statusFiltered = dateFiltered.filter(o => ['MINOR_DAMAGE', 'DAMAGED'].includes(o?.deliveryReview?.packageCondition));
        else if (filterStatus === 'FAILED_ORDER') statusFiltered = dateFiltered.filter(o => !getLifecycleBucket(o) && (o.status === 'PAYMENT_FAILED' || o.paymentStatus === 'FAILED'));
        else statusFiltered = dateFiltered.filter(o => !getLifecycleBucket(o) && o.status === filterStatus);

        if (filterDelivery === 'ALL') {
            // apply cancel filter
        } else {
            const today = new Date(); today.setHours(0,0,0,0);
            statusFiltered = statusFiltered.filter(o => {
                const edd = o?.delhivery?.expected_delivery_date;
                if (!edd) return filterDelivery === 'NO_DATE';
                const exp = new Date(edd); exp.setHours(0,0,0,0);
                const diff = Math.round((exp - today) / 86400000);
                if (filterDelivery === 'TODAY') return diff === 0;
                if (filterDelivery === 'TOMORROW') return diff === 1;
                if (filterDelivery === 'OVERDUE') return diff < 0;
                if (filterDelivery === 'UPCOMING') return diff > 1;
                return true;
            });
        }
        if (filterCancel !== 'ALL') {
            statusFiltered = statusFiltered.filter(o => {
                if (filterCancel === 'CUSTOMER') return o.cancelledBy === 'CUSTOMER';
                if (filterCancel === 'UNDELIVERABLE_PINCODE') return o.cancelledBy === 'UNDELIVERABLE_PINCODE';
                if (filterCancel === 'SELLER') return o.cancelledBy === 'SELLER' || (!o.cancelledBy && o.status === 'CANCELLED');
                return true;
            });
        }

        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return statusFiltered;
        }

        return statusFiltered.filter((order) => {
            const searchableFields = [
                order?._id,
                order?.id,
                order?.trackingId,
                order?.awb,
                order?.airwayBillNo,
                order?.guestEmail,
                order?.shippingAddress?.email,
                order?.userId?.email,
                getDisplayOrderNumber(order),
                order?.shortOrderNumber
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());

            return searchableFields.some((value) => value.includes(normalizedQuery));
        });
    };

    const stats = getOrderStats();
    const filteredOrders = getFilteredOrders();
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);
    const isAwbGeneratedFilter = filterStatus === 'AWB_GENERATED';
    const isAwbReferenceMissingFilter = filterStatus === 'AWB_REFERENCE_MISSING';
    const isAwbSelectionFilter = isAwbGeneratedFilter || isAwbReferenceMissingFilter;
    const selectedAwbOrders = filteredOrders.filter((order) => selectedAwbOrderIds.includes(order._id));

    useEffect(() => {
        if (!isAwbSelectionFilter) {
            setSelectedAwbOrderIds((prev) => (prev.length ? [] : prev));
            return;
        }

        const visibleIds = new Set(filteredOrders.map((order) => order._id));
        setSelectedAwbOrderIds((prev) => {
            const next = prev.filter((id) => visibleIds.has(id));
            if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
                return prev;
            }
            return next;
        });
    }, [filteredOrders, isAwbSelectionFilter]);


    const getOrderSourceLabel = (order) => {
        const normalized = String(order?.orderSource || '').trim().toUpperCase();
        return normalized === 'APP' ? 'APP' : 'WEB';
    };

    const getConvertedEmployeeName = (order) => {
        const explicitName = String(order?.convertedByEmployeeName || '').trim();
        if (explicitName) return explicitName;

        if (order?.convertedFromAbandonedCheckout) {
            const creatorName = String(order?.createdByName || '').trim();
            if (creatorName) return creatorName;
        }

        const notes = String(order?.notes || '').trim();
        const matched = notes.match(/converted from abandoned checkout by\s+(.+)$/i);
        if (matched?.[1]) return matched[1].trim();

        return '';
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

        // Return tracking fields
        const returnAwb = (trackingData.returnTrackingId || '').trim();
        const returnCourier = (trackingData.returnCourier || '').trim();
        const returnTrackingUrl = (trackingData.returnTrackingUrl || '').trim();

        // Replacement tracking fields
        const replacementAwb = (trackingData.replacementTrackingId || '').trim();
        const replacementCourier = (trackingData.replacementCourier || '').trim();
        const replacementTrackingUrl = (trackingData.replacementTrackingUrl || '').trim();

        const approvedReturnIndex = Array.isArray(selectedOrder?.returns)
            ? [...selectedOrder.returns]
                .map((ret, idx) => ({ ret, idx }))
                .reverse()
                .find(({ ret }) => String(ret?.type || '').toUpperCase() === 'RETURN' && String(ret?.status || '').toUpperCase().includes('APPROVED'))?.idx
            : undefined;

        const approvedReplacementIndex = Array.isArray(selectedOrder?.returns)
            ? [...selectedOrder.returns]
                .map((ret, idx) => ({ ret, idx }))
                .reverse()
                .find(({ ret }) => String(ret?.type || '').toUpperCase() === 'REPLACEMENT' && String(ret?.status || '').toUpperCase().includes('APPROVED'))?.idx
            : undefined;

        if (!awb && !returnAwb && !replacementAwb) {
            toast.error('At least one tracking ID (order, return, or replacement) is required');
            return;
        }

        // If courier is not set, assume Delhivery (for AWB-based tracking)
        if (!courierName && awb) {
            courierName = 'Delhivery';
        }

        // For Delhivery, if no tracking URL entered, auto-generate using AWB
        if (!trackingUrl && courierName.toLowerCase() === 'delhivery' && awb) {
            trackingUrl = `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
        }

        // Auto-generate return/replacement tracking URLs if not provided
        const computedReturnTrackingUrl = (!returnTrackingUrl && returnAwb && returnCourier.toLowerCase() === 'delhivery')
            ? `https://www.delhivery.com/track-v2/package/${encodeURIComponent(returnAwb)}`
            : returnTrackingUrl;

        const computedReplacementTrackingUrl = (!replacementTrackingUrl && replacementAwb && replacementCourier.toLowerCase() === 'delhivery')
            ? `https://www.delhivery.com/track-v2/package/${encodeURIComponent(replacementAwb)}`
            : replacementTrackingUrl;

        // Auto-move status forward when tracking is added
        // If the order is still ORDER_PLACED or PROCESSING, treat it as SHIPPED
        let nextStatus = selectedOrder.status;
        if (nextStatus === 'ORDER_PLACED' || nextStatus === 'PROCESSING') {
            nextStatus = 'SHIPPED';
        }
        
        try {
            const token = await getToken();
            const updatePayload = {
                status: nextStatus,
                ...(awb && { trackingId: awb, courier: courierName }),
                ...(trackingUrl && { trackingUrl }),
                ...(returnAwb && { returnTrackingId: returnAwb, returnCourier }),
                ...(computedReturnTrackingUrl && { returnTrackingUrl: computedReturnTrackingUrl }),
                ...(replacementAwb && { replacementTrackingId: replacementAwb, replacementCourier }),
                ...(computedReplacementTrackingUrl && { replacementTrackingUrl: computedReplacementTrackingUrl }),
                ...(typeof approvedReturnIndex === 'number' && { returnRequestIndex: approvedReturnIndex }),
                ...(typeof approvedReplacementIndex === 'number' && { replacementRequestIndex: approvedReplacementIndex })
            };

            let { data } = await axios.put(`/api/store/orders/${selectedOrder._id}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const hasValueInReturns = (orderObj, field, value) => Array.isArray(orderObj?.returns)
                ? orderObj.returns.some(r => String(r?.[field] || '') === String(value || ''))
                : false;

            const returnSaved = !returnAwb || String(data?.order?.returnTrackingId || '') === String(returnAwb) || hasValueInReturns(data?.order, 'returnTrackingId', returnAwb);
            const replacementSaved = !replacementAwb || String(data?.order?.replacementTrackingId || '') === String(replacementAwb) || hasValueInReturns(data?.order, 'replacementTrackingId', replacementAwb);

            // Rare fallback: if first response still misses entered values, retry once with explicit payload.
            if (!returnSaved || !replacementSaved) {
                const retryPayload = {
                    ...(returnAwb && { returnTrackingId: returnAwb, returnCourier }),
                    ...(computedReturnTrackingUrl && { returnTrackingUrl: computedReturnTrackingUrl }),
                    ...(replacementAwb && { replacementTrackingId: replacementAwb, replacementCourier }),
                    ...(computedReplacementTrackingUrl && { replacementTrackingUrl: computedReplacementTrackingUrl }),
                    ...(typeof approvedReturnIndex === 'number' && { returnRequestIndex: approvedReturnIndex }),
                    ...(typeof approvedReplacementIndex === 'number' && { replacementRequestIndex: approvedReplacementIndex })
                };
                const retry = await axios.put(`/api/store/orders/${selectedOrder._id}`, retryPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (retry?.data) data = retry.data;
            }
            
            toast.success('Tracking details updated and customer notified!');

            if (data?.order) {
                const savedOrder = data.order;
                const latestReturnRequest = Array.isArray(savedOrder.returns)
                    ? [...savedOrder.returns].reverse().find(r => String(r?.type || '').toUpperCase() === 'RETURN' && String(r?.status || '').toUpperCase().includes('APPROVED'))
                    : null;
                const latestReplacementRequest = Array.isArray(savedOrder.returns)
                    ? [...savedOrder.returns].reverse().find(r => String(r?.type || '').toUpperCase() === 'REPLACEMENT' && String(r?.status || '').toUpperCase().includes('APPROVED'))
                    : null;

                setSelectedOrder(savedOrder);
                setOrders(prev => prev.map(o => o._id === savedOrder._id ? { ...o, ...savedOrder } : o));
                setTrackingData({
                    trackingId: savedOrder.trackingId || awb || '',
                    trackingUrl: savedOrder.trackingUrl || trackingUrl || '',
                    courier: savedOrder.courier || courierName || '',
                    returnTrackingId: latestReturnRequest?.returnTrackingId || savedOrder.returnTrackingId || returnAwb || '',
                    returnTrackingUrl: latestReturnRequest?.returnTrackingUrl || savedOrder.returnTrackingUrl || computedReturnTrackingUrl || '',
                    returnCourier: latestReturnRequest?.returnCourier || savedOrder.returnCourier || returnCourier || '',
                    replacementTrackingId: latestReplacementRequest?.replacementTrackingId || savedOrder.replacementTrackingId || replacementAwb || '',
                    replacementTrackingUrl: latestReplacementRequest?.replacementTrackingUrl || savedOrder.replacementTrackingUrl || computedReplacementTrackingUrl || '',
                    replacementCourier: latestReplacementRequest?.replacementCourier || savedOrder.replacementCourier || replacementCourier || ''
                });
            }

            // Refresh orders list
            await fetchOrders();

            // Update selectedOrder locally so UI + Delhivery auto-refresh work immediately
            setSelectedOrder(prev => prev ? {
                ...prev,
                status: nextStatus,
                trackingId: awb || prev.trackingId,
                courier: courierName || prev.courier,
                trackingUrl: trackingUrl || prev.trackingUrl,
                returnTrackingId: returnAwb || prev.returnTrackingId,
                returnCourier: returnCourier || prev.returnCourier,
                returnTrackingUrl: computedReturnTrackingUrl || prev.returnTrackingUrl,
                replacementTrackingId: replacementAwb || prev.replacementTrackingId,
                replacementCourier: replacementCourier || prev.replacementCourier,
                replacementTrackingUrl: computedReplacementTrackingUrl || prev.replacementTrackingUrl
            } : prev);

            setTrackingData(prev => ({
                ...prev,
                trackingId: awb || prev.trackingId,
                courier: courierName || prev.courier,
                trackingUrl: trackingUrl || prev.trackingUrl,
                returnTrackingId: returnAwb || prev.returnTrackingId,
                returnCourier: returnCourier || prev.returnCourier,
                returnTrackingUrl: computedReturnTrackingUrl || prev.returnTrackingUrl,
                replacementTrackingId: replacementAwb || prev.replacementTrackingId,
                replacementCourier: replacementCourier || prev.replacementCourier,
                replacementTrackingUrl: computedReplacementTrackingUrl || prev.replacementTrackingUrl
            }));

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

    // Save India Post AWB and auto-fetch tracking
    const saveIndiaPostTracking = async () => {
        const awb = (indiaPostAwb || '').trim();
        if (!awb) {
            toast.error('India Post AWB number is required');
            return;
        }
        const trackingUrl = `https://t.17track.net/en#nums=${encodeURIComponent(awb)}`;
        let nextStatus = selectedOrder.status;
        if (nextStatus === 'ORDER_PLACED' || nextStatus === 'PROCESSING') {
            nextStatus = 'SHIPPED';
        }
        try {
            const token = await getToken();
            await axios.put(`/api/store/orders/${selectedOrder._id}`, {
                status: nextStatus,
                trackingId: awb,
                courier: 'India Post',
                trackingUrl,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('India Post AWB saved! Customer can track on India Post website.');
            await fetchOrders();
            setSelectedOrder(prev => prev ? { ...prev, status: nextStatus, trackingId: awb, courier: 'India Post', trackingUrl } : prev);
            // Auto-fetch tracking after saving
            fetchIndiaPostTracking(awb);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to save India Post AWB');
        }
    };

    // Fetch live India Post tracking via 17track API
    const fetchIndiaPostTracking = async (awbOverride) => {
        const awb = (awbOverride || selectedOrder?.trackingId || '').trim();
        if (!awb) return;
        setFetchingIndiaPostTracking(true);
        setIndiaPostNoKey(false);
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/india-post-tracking?awb=${encodeURIComponent(awb)}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (data.success && data.tracking) {
                setIndiaPostTracking(data.tracking);
                // Write tracking back into orders list so the Latest Update column shows
                if (selectedOrder?._id) {
                    setOrders(prev => prev.map(o =>
                        o._id === selectedOrder._id ? { ...o, indiaPost: data.tracking } : o
                    ));
                }
                // Auto-update order status in DB if delivered
                if (data.tracking.isDelivered && selectedOrder?.status !== 'DELIVERED') {
                    const token = await getToken();
                    if (token) {
                        await axios.put(`/api/store/orders/${selectedOrder._id}`, { status: 'DELIVERED' }, {
                            headers: { Authorization: `Bearer ${token}` }
                        }).catch(() => {});
                        setSelectedOrder(prev => prev ? { ...prev, status: 'DELIVERED' } : prev);
                        await fetchOrders();
                        toast.success('Status auto-updated to DELIVERED based on India Post tracking!');
                    }
                }
            } else if (data.noKey) {
                // No API key configured — silently ignore
                setIndiaPostTracking(null);
                setIndiaPostNoKey(true);
            } else {
                setIndiaPostTracking(null);
            }
        } catch {
            setIndiaPostTracking(null);
        } finally {
            setFetchingIndiaPostTracking(false);
        }
    };

    // Trigger automatic status sync from latest courier tracking
    const autoSyncStatusFromTracking = async (targetOrder, options = {}) => {
        const { silent = false } = options;
        const order = targetOrder || selectedOrder;

        if (!order || !order.trackingId) {
            if (!silent) toast.error('Add a tracking ID first');
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

            if (!data.order) {
                if (!silent) toast.error('No live courier status found yet. Try again later.');
                return;
            }

            const currentStatus = data.order.status || order.status;
            let mappedStatus = currentStatus;

            const statusText = String(data.order.status || '').toLowerCase();
            const looksDelivered = statusText.includes('delivered');

            // India Post: map from indiaPost statusCode
            if (data.order.indiaPost) {
                const ip = data.order.indiaPost;
                if (ip.isDelivered) {
                    mappedStatus = 'DELIVERED';
                } else if (ip.statusCode === 10) {
                    mappedStatus = 'SHIPPED';
                } else if (ip.statusCode === 30) {
                    mappedStatus = 'DELIVERY_EXCEPTION';
                } else if (ip.statusCode === 70) {
                    mappedStatus = 'RETURNED';
                }
                // Also push tracking events into local state so timeline is visible immediately
                if (ip.events?.length > 0) {
                    setIndiaPostTracking(ip);
                }
            } else {
                // Delhivery
                mappedStatus = mapDelhiveryStatusToOrderStatus(data.order.delhivery, currentStatus);
                // Fallback: if backend already returned delivered text status, force DELIVERED.
                if (!mappedStatus && looksDelivered) {
                    mappedStatus = 'DELIVERED';
                }
            }

            if (!mappedStatus || mappedStatus === currentStatus) {
                if (!silent) toast.error('Status is already up to date with tracking.');
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

            if (!silent) toast.success(`Order status set to "${mappedStatus}" from tracking.`);
        } catch (error) {
            if (axios.isCancel(error) || error.name === 'AbortError' || error.name === 'CanceledError') {
                console.warn('Auto status sync aborted (timeout)');
                if (!silent) toast.error('Request timeout. Courier API took too long. Please try again.');
            } else {
                console.error('Auto status sync failed:', error);
                if (!silent) toast.error(error?.response?.data?.error || 'Failed to auto-sync status from tracking');
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
        setIsEditingOrderDetails(false);
        setPaymentLinkAmount(String(order?.paymentLinkAmount || order?.total || ''));
        setGeneratedPaymentLink(order?.paymentLinkUrl || '');
        // Pre-fill tracking data if it exists
        // Auto-fix old India Post URLs (indiapost.gov.in) to 17track
        const isIndiaPost = (order.courier || '').toLowerCase().includes('india post');
        const hasOldUrl = (order.trackingUrl || '').includes('indiapost.gov.in');
        const correctedTrackingUrl = isIndiaPost && order.trackingId
            ? `https://t.17track.net/en#nums=${encodeURIComponent(order.trackingId)}`
            : (order.trackingUrl || '');
        if (isIndiaPost && (hasOldUrl || !order.trackingUrl) && order.trackingId) {
            // Silently persist the corrected URL to DB
            getToken().then(token => {
                if (token) {
                    axios.put(`/api/store/orders/${order._id}`, {
                        trackingUrl: correctedTrackingUrl
                    }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                }
            });
        }
        const latestReturnRequest = Array.isArray(order.returns)
            ? [...order.returns].reverse().find(r => String(r?.type || '').toUpperCase() === 'RETURN' && String(r?.status || '').toUpperCase().includes('APPROVED'))
            : null;
        const latestReplacementRequest = Array.isArray(order.returns)
            ? [...order.returns].reverse().find(r => String(r?.type || '').toUpperCase() === 'REPLACEMENT' && String(r?.status || '').toUpperCase().includes('APPROVED'))
            : null;

        setTrackingData({
            trackingId: order.trackingId || '',
            trackingUrl: isIndiaPost ? correctedTrackingUrl : (order.trackingUrl || ''),
            courier: order.courier || '',
            returnTrackingId: latestReturnRequest?.returnTrackingId || order.returnTrackingId || '',
            returnTrackingUrl: latestReturnRequest?.returnTrackingUrl || order.returnTrackingUrl || '',
            returnCourier: latestReturnRequest?.returnCourier || order.returnCourier || '',
            replacementTrackingId: latestReplacementRequest?.replacementTrackingId || order.replacementTrackingId || '',
            replacementTrackingUrl: latestReplacementRequest?.replacementTrackingUrl || order.replacementTrackingUrl || '',
            replacementCourier: latestReplacementRequest?.replacementCourier || order.replacementCourier || ''
        });
        // Reset India Post state for new order
        setIndiaPostAwb(order.courier?.toLowerCase().includes('india post') ? (order.trackingId || '') : '');
        setIndiaPostTracking(null);
        setIndiaPostNoKey(false);
        // Auto-fetch India Post tracking if it's an India Post order with an AWB
        if ((order.courier || '').toLowerCase().includes('india post') && order.trackingId) {
            // Defer so selectedOrder state is set first
            setTimeout(() => fetchIndiaPostTracking(order.trackingId), 100);
        }

        // Auto-sync status silently for any tracked order when modal opens
        if (order.trackingId) {
            setTimeout(() => autoSyncStatusFromTracking(order, { silent: true }), 250);
        }

        // Turn off Delhivery auto-refresh if switching to a non-Delhivery order
        if (!(order.courier || '').toLowerCase().includes('delhivery')) {
            setAutoRefreshEnabled(false);
        }
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
        setIsEditingOrderDetails(false);
        setPaymentLinkAmount('');
        setGeneratedPaymentLink('');
        // Reset tracking data
        setTrackingData({
            trackingId: '',
            trackingUrl: '',
            courier: '',
            returnTrackingId: '',
            returnTrackingUrl: '',
            returnCourier: '',
            replacementTrackingId: '',
            replacementTrackingUrl: '',
            replacementCourier: ''
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
            return 'Returned (Unpaid)';
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

    const saveCancellationDetails = async () => {
        try {
            setSavingCancellationDetails(true);
            const token = await getToken(true);
            if (!token) {
                toast.error('Authentication failed.');
                return;
            }

            const { data } = await axios.post('/api/store/orders/update-cancellation', {
                orderId: selectedOrder._id,
                cancelledBy: selectedOrder.cancelledBy || 'SELLER',
                cancelReason: selectedOrder.cancelReason || ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const savedOrder = data?.order || {};

            setSelectedOrder(prev => prev ? {
                ...prev,
                status: savedOrder.status || 'CANCELLED',
                cancelledBy: savedOrder.cancelledBy ?? prev.cancelledBy,
                cancelReason: savedOrder.cancelReason ?? prev.cancelReason
            } : prev);

            setOrders(prev => prev.map(order => order._id === selectedOrder._id ? {
                ...order,
                status: savedOrder.status || 'CANCELLED',
                cancelledBy: savedOrder.cancelledBy ?? order.cancelledBy,
                cancelReason: savedOrder.cancelReason ?? order.cancelReason
            } : order));

            toast.success('Cancellation details saved');
            await fetchOrders();
        } catch (err) {
            console.error('Failed to save cancellation details:', err);
            toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save cancellation details');
        } finally {
            setSavingCancellationDetails(false);
        }
    };

    const saveEditedOrderDetails = async () => {
        if (!selectedOrder?._id) return;

        const normalizedPaymentMethod = String(selectedOrder.paymentMethod || '').toUpperCase().trim();
        const shippingAddress = {
            ...(selectedOrder.shippingAddress || {}),
            zip: String(selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '').trim(),
            pincode: String(selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '').trim(),
        };

        const resolvedName = selectedOrder.isGuest
            ? String(selectedOrder.guestName || shippingAddress.name || '').trim()
            : String(shippingAddress.name || selectedOrder.userId?.name || '').trim();
        const resolvedEmail = selectedOrder.isGuest
            ? String(selectedOrder.guestEmail || shippingAddress.email || '').trim()
            : String(shippingAddress.email || selectedOrder.userId?.email || '').trim();
        const resolvedPhone = selectedOrder.isGuest
            ? String(selectedOrder.guestPhone || shippingAddress.phone || '').trim()
            : String(shippingAddress.phone || '').trim();

        if (!resolvedName || !resolvedPhone || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.country || !shippingAddress.zip) {
            toast.error('Please fill name, phone and complete address before saving.');
            return;
        }

        const payload = {
            paymentMethod: normalizedPaymentMethod,
            shippingAddress: {
                ...shippingAddress,
                name: resolvedName,
                email: resolvedEmail,
                phone: resolvedPhone,
            },
            alternatePhone: selectedOrder.alternatePhone || shippingAddress.alternatePhone || '',
            alternatePhoneCode:
                selectedOrder.alternatePhoneCode ||
                shippingAddress.alternatePhoneCode ||
                shippingAddress.phoneCode ||
                '+91',
        };

        if (selectedOrder.isGuest) {
            payload.guestName = resolvedName;
            payload.guestEmail = resolvedEmail;
            payload.guestPhone = resolvedPhone;
        }

        try {
            setSavingOrderDetails(true);
            const token = await getToken(true);
            if (!token) {
                toast.error('Authentication failed. Please sign in again.');
                return;
            }

            const { data } = await axios.put(`/api/store/orders/${selectedOrder._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const updated = data?.order;
            if (!updated) {
                toast.error('No updated order returned from server.');
                return;
            }

            setSelectedOrder((prev) => {
                if (!prev) return prev;
                const updatedOrderItems = Array.isArray(updated?.orderItems) ? updated.orderItems : [];
                const hasUsableProductData = updatedOrderItems.some((item) => item?.productId && typeof item.productId === 'object');
                return {
                    ...prev,
                    ...updated,
                    orderItems: hasUsableProductData ? updatedOrderItems : prev.orderItems,
                };
            });
            setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? { ...o, ...updated } : o)));
            setIsEditingOrderDetails(false);
            toast.success('Order details updated successfully');
        } catch (error) {
            console.error('Failed to update order details:', error);
            toast.error(error?.response?.data?.error || 'Failed to update order details');
        } finally {
            setSavingOrderDetails(false);
        }
    };

    const createCustomerPaymentLink = async () => {
        if (!selectedOrder?._id) return;

        const amount = Number(paymentLinkAmount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Please enter a valid payment amount.');
            return;
        }

        try {
            setCreatingPaymentLink(true);
            const token = await getToken(true);
            if (!token) {
                toast.error('Authentication failed. Please sign in again.');
                return;
            }

            const { data } = await axios.post(`/api/store/orders/${selectedOrder._id}/payment-link`, {
                amount,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const url = data?.paymentLink?.url || '';
            if (!url) {
                toast.error('Payment link was not returned by server.');
                return;
            }

            setGeneratedPaymentLink(url);
            if (data?.order) {
                setSelectedOrder((prev) => prev ? { ...prev, ...data.order } : prev);
                setOrders((prev) => prev.map((o) => o._id === selectedOrder._id ? { ...o, ...data.order } : o));
            } else {
                setSelectedOrder((prev) => prev ? {
                    ...prev,
                    paymentMethod: 'CARD',
                    paymentStatus: 'PENDING',
                    isPaid: false,
                    total: amount,
                    paymentLinkUrl: url,
                    paymentLinkAmount: amount,
                } : prev);
            }

            toast.success('Payment link created. Share it with customer.');
        } catch (error) {
            console.error('Payment link creation failed:', error);
            toast.error(error?.response?.data?.error || 'Failed to create payment link');
        } finally {
            setCreatingPaymentLink(false);
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

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.localStorage.setItem(AWB_STATUS_STORAGE_KEY, JSON.stringify(awbStatus || {}))
        } catch (error) {
            console.error('Failed to persist AWB status cache:', error)
        }
    }, [awbStatus]);

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.localStorage.setItem(AWB_DETAILS_STORAGE_KEY, JSON.stringify(awbDetailsByOrder || {}))
        } catch (error) {
            console.error('Failed to persist AWB details cache:', error)
        }
    }, [awbDetailsByOrder]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterDelivery, filterCancel, searchQuery, datePreset, fromDate, toDate, pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

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

    // Background poll every 60s to catch customer cancellations and other updates
    useEffect(() => {
        const bgPoll = setInterval(() => {
            fetchOrders();
        }, 60000);
        return () => clearInterval(bgPoll);
    }, []);

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
        // Don't run Delhivery refresh for India Post orders
        if ((selectedOrder.courier || '').toLowerCase().includes('india post')) return;
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
                <div 
                    onClick={() => setFilterStatus('FAILED_ORDER')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'FAILED_ORDER' ? 'bg-rose-700 text-white shadow-lg' : 'bg-white border border-rose-200 text-rose-700'}`}
                >
                    <p className="text-xs opacity-75">Failed Orders</p>
                    <p className="text-2xl font-bold">{stats.FAILED_ORDER}</p>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-3 flex flex-wrap gap-2">
                {['ALL', 'PROCESSING', 'MANIFESTED', 'PICKUP_SCHEDULED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'FAILED_ORDER', 'RTO', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REPLACEMENT_REQUESTED', 'REPLACEMENT_APPROVED', 'REPLACED', 'RETURNED_REFUNDED', 'DAMAGED_REVIEW', 'AWB_GENERATED', 'AWB_REFERENCE_MISSING', 'CONVERTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                            filterStatus === status
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                    >
                        <span>{status === 'ALL' ? 'All Orders' : status === 'PAYMENT_FAILED' ? 'Payment Failed' : status === 'FAILED_ORDER' ? 'Failed Orders' : status === 'RETURN_REQUESTED' ? 'Return Requested' : status === 'RETURN_APPROVED' ? 'Return Approved' : status === 'RETURN_REJECTED' ? 'Return Rejected' : status === 'REPLACEMENT_REQUESTED' ? 'Replacement Requested' : status === 'REPLACEMENT_APPROVED' ? 'Replacement Approved' : status === 'REPLACED' ? 'Replaced' : status === 'RETURNED_REFUNDED' ? 'Returned & Refunded' : status === 'DAMAGED_REVIEW' ? 'Damaged Review' : status === 'AWB_GENERATED' ? 'AWB Generated' : status === 'AWB_REFERENCE_MISSING' ? 'AWB Ref Missing' : status === 'CONVERTED' ? 'Converted' : status.replace(/_/g, ' ')}</span>
                        {(['FAILED_ORDER', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REPLACEMENT_REQUESTED', 'REPLACEMENT_APPROVED', 'REPLACED', 'RETURNED_REFUNDED', 'DAMAGED_REVIEW', 'AWB_GENERATED', 'AWB_REFERENCE_MISSING', 'CONVERTED'].includes(status)) && (status === 'FAILED_ORDER' ? stats.FAILED_ORDER : status === 'RETURN_REQUESTED' ? stats.RETURN_REQUESTED : status === 'RETURN_APPROVED' ? stats.RETURN_APPROVED : status === 'RETURN_REJECTED' ? stats.RETURN_REJECTED : status === 'REPLACEMENT_REQUESTED' ? stats.REPLACEMENT_REQUESTED : status === 'REPLACEMENT_APPROVED' ? stats.REPLACEMENT_APPROVED : status === 'REPLACED' ? stats.REPLACED : status === 'RETURNED_REFUNDED' ? stats.RETURNED_REFUNDED : status === 'DAMAGED_REVIEW' ? stats.DAMAGED_REVIEW : status === 'AWB_GENERATED' ? stats.AWB_GENERATED : status === 'AWB_REFERENCE_MISSING' ? stats.AWB_REFERENCE_MISSING : stats.CONVERTED) > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                filterStatus === status ? 'bg-blue-800' : status === 'AWB_GENERATED' ? 'bg-emerald-500 text-white' : status === 'AWB_REFERENCE_MISSING' ? 'bg-amber-500 text-white' : status === 'RETURN_APPROVED' ? 'bg-green-500 text-white' : status === 'REPLACEMENT_APPROVED' ? 'bg-violet-600 text-white' : status === 'REPLACED' ? 'bg-green-500 text-white' : status === 'RETURNED_REFUNDED' ? 'bg-cyan-500 text-white' : status === 'CONVERTED' ? 'bg-cyan-600 text-white' : status === 'RETURN_REJECTED' ? 'bg-rose-500 text-white' : status === 'REPLACEMENT_REQUESTED' ? 'bg-violet-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                                {status === 'FAILED_ORDER' ? stats.FAILED_ORDER : status === 'FAILED_ORDER' ? stats.FAILED_ORDER : status === 'RETURN_REQUESTED' ? stats.RETURN_REQUESTED : status === 'RETURN_APPROVED' ? stats.RETURN_APPROVED : status === 'RETURN_REJECTED' ? stats.RETURN_REJECTED : status === 'REPLACEMENT_REQUESTED' ? stats.REPLACEMENT_REQUESTED : status === 'REPLACEMENT_APPROVED' ? stats.REPLACEMENT_APPROVED : status === 'REPLACED' ? stats.REPLACED : status === 'RETURNED_REFUNDED' ? stats.RETURNED_REFUNDED : status === 'DAMAGED_REVIEW' ? stats.DAMAGED_REVIEW : status === 'AWB_GENERATED' ? stats.AWB_GENERATED : status === 'AWB_REFERENCE_MISSING' ? stats.AWB_REFERENCE_MISSING : stats.CONVERTED}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Delivery Date Filter */}
            <div className="mb-6 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Exp. Delivery:</span>
                {[
                    { key: 'ALL', label: 'All', color: 'bg-slate-600' },
                    { key: 'TODAY', label: '🟢 Today', color: 'bg-green-600' },
                    { key: 'TOMORROW', label: '🔵 Tomorrow', color: 'bg-blue-600' },
                    { key: 'OVERDUE', label: '🔴 Overdue', color: 'bg-red-600' },
                    { key: 'UPCOMING', label: '🟡 Upcoming', color: 'bg-yellow-500' },
                    { key: 'NO_DATE', label: 'No Date', color: 'bg-gray-400' },
                ].map(({ key, label, color }) => (
                    <button
                        key={key}
                        onClick={() => setFilterDelivery(key)}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                            filterDelivery === key
                                ? `${color} text-white shadow-md`
                                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Cancel Reason Filter */}
            <div className="mb-6 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Cancel Reason:</span>
                {[
                    { key: 'ALL', label: 'All' },
                    { key: 'CUSTOMER', label: '👤 By Customer' },
                    { key: 'UNDELIVERABLE_PINCODE', label: '📍 Pincode Issue' },
                    { key: 'SELLER', label: '🏪 By Seller' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilterCancel(key)}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                            filterCancel === key
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
                <label className="text-xs text-slate-500">Search Orders</label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by AWB, Order ID, Order Number, or Email"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
            </div>

            {isAwbSelectionFilter && filteredOrders.length > 0 && (
                <div className="mb-4 flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-sky-900">{isAwbReferenceMissingFilter ? 'AWB Reference Missing Orders' : 'AWB Generated Orders'}</p>
                        <p className="text-xs text-sky-700">{isAwbReferenceMissingFilter ? 'These orders are AWB queued or generated, but still have no saved AWB/reference number.' : 'This list shows AWBs generated but not downloaded yet, so you can bulk download them.'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                            {selectedAwbOrderIds.length} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedAwbOrderIds(paginatedOrders.map((order) => order._id))}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                        >
                            Select Page
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedAwbOrderIds(filteredOrders.map((order) => order._id))}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                        >
                            Select All Filtered
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedAwbOrderIds([])}
                            disabled={selectedAwbOrderIds.length === 0}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                selectedAwbOrderIds.length === 0
                                    ? 'bg-sky-100 text-sky-300 cursor-not-allowed border border-sky-100'
                                    : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-100'
                            }`}
                        >
                            Clear
                        </button>
                        <div className="flex items-center gap-1 border border-sky-200 rounded-lg overflow-hidden">
                            <span className="px-2 text-xs text-sky-600 font-medium">Per page:</span>
                            <button
                                type="button"
                                onClick={() => setBulkLabelsPerPage(2)}
                                className={`px-3 py-2 text-sm font-semibold transition ${
                                    bulkLabelsPerPage === 2 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 hover:bg-sky-50'
                                }`}
                            >2</button>
                            <button
                                type="button"
                                onClick={() => setBulkLabelsPerPage(4)}
                                className={`px-3 py-2 text-sm font-semibold transition ${
                                    bulkLabelsPerPage === 4 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 hover:bg-sky-50'
                                }`}
                            >4</button>
                        </div>
                        <button
                            type="button"
                            onClick={() => downloadSelectedAwbs(selectedAwbOrders)}
                            disabled={selectedAwbOrders.length === 0 || bulkDownloadingAwbs}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                selectedAwbOrders.length === 0 || bulkDownloadingAwbs
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm'
                            }`}
                        >
                            <Download size={16} />
                            <span>{bulkDownloadingAwbs ? 'Downloading...' : `Download (${bulkLabelsPerPage}/page)`}</span>
                        </button>
                    </div>
                </div>
            )}

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
                        <div>
                            <label className="text-xs text-slate-500">Rows Per Page</label>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                                {[10, 20, 50, 100].map(size => (
                                    <option key={size} value={size}>{size} / page</option>
                                ))}
                            </select>
                        </div>
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
                <div className="w-full rounded-md shadow border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {isAwbSelectionFilter && <th className="px-4 py-3">Select</th>}
                                <th className="px-4 py-3">Sr. No.</th>
                                <th className="px-4 py-3">Order No.</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Delivery Rating</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Payment</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Latest Update</th>
                                <th className="px-4 py-3">Tracking</th>
                                <th className="px-4 py-3">Exp. Delivery</th>
                                <th className="px-4 py-3">Order Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedOrders.map((order, index) => {
                                                                const awbPendingDownload = hasAwbPendingDownload(order);
                                                                const awbReferenceMissing = hasGeneratedAwbMissingReference(order);
                                                                const awbQueuedWithoutReference = hasAwbQueuedWithoutReference(order);
                                                                // Show 'Yes' in Need to Pick if pickup is scheduled (from Delhivery events) and not yet picked up or delivered/cancelled
                                                                let needToPick = false;
                                                                let latestTrackingStatus = '';
                                                                let latestTrackingTime = '';
                                                                {
                                                                    if (order.delhivery && Array.isArray(order.delhivery.events) && order.delhivery.events.length > 0) {
                                                                        // Get the latest event (by time)
                                                                        const sortedEvents = [...order.delhivery.events].sort((a, b) => new Date(b.time) - new Date(a.time));
                                                                        const latestDelhiveryEvent = sortedEvents[0];
                                                                        latestTrackingStatus = latestDelhiveryEvent?.status || '';
                                                                        if (latestDelhiveryEvent?.time) {
                                                                            latestTrackingTime = new Date(latestDelhiveryEvent.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
                                                                        }
                                                                        const scheduledEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('pickup scheduled'));
                                                                        const pickedEvent = order.delhivery.events.find(e => (e.status || '').toLowerCase().includes('picked up'));
                                                                        needToPick = !!scheduledEvent && !pickedEvent;
                                                                    } else if (order.indiaPost) {
                                                                        // India Post: events[0] is newest (sorted desc), latestEvent may have empty strings
                                                                        const ip = order.indiaPost;
                                                                        const ipEvents = Array.isArray(ip.events) ? ip.events : [];
                                                                        // Pick the best event source: prefer events[0] (freshest), fall back to latestEvent
                                                                        const bestEvt = ipEvents.find(e => (e.description || e.location || e.status))
                                                                            || (ip.latestEvent?.description || ip.latestEvent?.location ? ip.latestEvent : null);
                                                                        if (bestEvt) {
                                                                            const ipLoc = (bestEvt.location || '').trim();
                                                                            const ipDesc = (bestEvt.description || bestEvt.status || '').trim();
                                                                            latestTrackingStatus = ipLoc && ipDesc ? `${ipLoc}, ${ipDesc}` : (ipDesc || ipLoc || ip.statusLabel || '');
                                                                            latestTrackingTime = (bestEvt.time || '').trim();
                                                                        } else {
                                                                            latestTrackingStatus = [ip.currentLocation, ip.statusLabel].filter(Boolean).join(', ');
                                                                        }
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
                                                                                                                                                className={`${awbReferenceMissing ? 'bg-amber-50 hover:bg-amber-100' : awbPendingDownload ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'} transition-colors duration-150 cursor-pointer`}
                                    onClick={() => openModal(order)}
                                  >
                                                                        {isAwbSelectionFilter && (
                                                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                                                        <input
                                                                                                type="checkbox"
                                                                                                checked={selectedAwbOrderIds.includes(order._id)}
                                                                                                onChange={() => toggleAwbSelection(order._id)}
                                                                                                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                                                                aria-label={`Select order ${getDisplayOrderNumber(order)} for AWB download`}
                                                                                        />
                                                                                </td>
                                                                        )}
                                    <td className="pl-6 text-green-600 font-medium">{startIndex + index + 1}</td>
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
                                            {getConvertedEmployeeName(order) && (
                                                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full w-fit font-semibold">
                                                    Converted by {getConvertedEmployeeName(order)}
                                                </span>
                                            )}
                                            {order?.createdByName && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit font-semibold">
                                                    Created by {order.createdByName}
                                                </span>
                                            )}
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
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const refundedAmount = getReturnedRefundAmount(order);
                                            const netAmount = getNetOrderAmount(order);
                                            return refundedAmount > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-slate-400 line-through">{currency}{order.total}</span>
                                                    <span className="font-bold text-slate-800">{currency}{netAmount}</span>
                                                    <span className="text-[10px] font-semibold text-cyan-700">Refunded: {currency}{refundedAmount}</span>
                                                </div>
                                            ) : (
                                                <span className="font-medium text-slate-800">{currency}{order.total}</span>
                                            );
                                        })()}
                                    </td>
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
                                            const cancelBadge = mappedStatus === 'CANCELLED' && order.cancelledBy ? (
                                                <span className={`mt-1 block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                    order.cancelledBy === 'CUSTOMER' ? 'bg-orange-100 text-orange-700' :
                                                    order.cancelledBy === 'UNDELIVERABLE_PINCODE' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {order.cancelledBy === 'CUSTOMER' ? '👤 Customer' :
                                                     order.cancelledBy === 'UNDELIVERABLE_PINCODE' ? '📍 Pincode' :
                                                     order.cancelledBy === 'SELLER' ? '🏪 Seller' : order.cancelledBy}
                                                </span>
                                            ) : null;
                                            return (
                                                <div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mappedStatus)}`}>{mappedStatusLabel}</span>
                                                    {cancelBadge}
                                                    {(mappedStatus === 'PAYMENT_FAILED' || order.paymentStatus === 'FAILED') && order.notes && (
                                                        <span className="mt-1 block text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-medium leading-snug">
                                                            ⚠ {order.notes.replace(/^Payment failed:\s*/i, '')}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {latestTrackingStatus ? (
                                            <div className="flex flex-col gap-0.5">
                                                {latestTrackingTime && (
                                                    <span className="text-[11px] text-slate-500">{latestTrackingTime}</span>
                                                )}
                                                <span className="text-xs font-semibold text-orange-600">{latestTrackingStatus}</span>
                                            </div>
                                        ) : needToPick ? (
                                            <span className="text-xs font-bold text-orange-600">Yes</span>
                                        ) : ''}
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.trackingId ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                                                    {order.trackingId.substring(0, 8)}...
                                                </span>
                                                {awbPendingDownload && (
                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-full font-semibold w-fit">
                                                        AWB Ready
                                                    </span>
                                                )}
                                            </div>
                                        ) : awbReferenceMissing ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-amber-700 text-xs font-medium">{awbQueuedWithoutReference ? 'AWB queued' : 'AWB generated'}</span>
                                                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-semibold w-fit">
                                                    Queued / Ref Missing
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">Not shipped</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        {(() => {
                                            const edd = order?.delhivery?.expected_delivery_date || order?.delhivery?.expected_return_date;
                                            if (!edd) return <span className="text-slate-400">—</span>;
                                            const today = new Date(); today.setHours(0,0,0,0);
                                            const exp = new Date(edd); exp.setHours(0,0,0,0);
                                            const diffDays = Math.round((exp - today) / 86400000);
                                            const dateLabel = new Date(edd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                                            if (diffDays === 0) {
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold w-fit">Today</span>
                                                        <span className="text-slate-500 font-medium">{dateLabel}</span>
                                                    </div>
                                                );
                                            }
                                            if (diffDays === 1) {
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold w-fit">Tomorrow</span>
                                                        <span className="text-slate-500 font-medium">{dateLabel}</span>
                                                    </div>
                                                );
                                            }
                                            if (diffDays === -1) {
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold w-fit">Yesterday</span>
                                                        <span className="text-slate-500 font-medium">{dateLabel}</span>
                                                    </div>
                                                );
                                            }
                                            if (diffDays < -1) {
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold w-fit">{Math.abs(diffDays)}d late</span>
                                                        <span className="text-slate-500 font-medium">{dateLabel}</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold w-fit">Upcoming</span>
                                                    <span className="text-slate-700 font-semibold">{dateLabel}</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                                  </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-slate-500">
                            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredOrders.length)} of {filteredOrders.length} orders
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-lg font-medium transition ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                            >
                                Previous
                            </button>
                            <span className="px-3 py-2 text-slate-600 font-medium">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-2 rounded-lg font-medium transition ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-slate-700 text-sm z-50 p-2 sm:p-4" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6 rounded-t-2xl">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-1">Order Details</h2>
                                    <p className="text-blue-100 text-xs">Order No: <span className='font-mono text-white'>{getDisplayOrderNumber(selectedOrder)}</span></p>
                                </div>
                                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full transition-colors shrink-0">
                                    <X size={22} />
                                </button>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                                    <button
                                        onClick={() => downloadInvoice(selectedOrder)}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Download Invoice"
                                    >
                                        <Download size={18} />
                                        <span className="text-xs sm:text-sm whitespace-nowrap">Download</span>
                                    </button>
                                    <button
                                        onClick={() => openAwbEditor(selectedOrder)}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title={hasGeneratedAwb(selectedOrder) ? 'Edit AWB' : 'Generate AWB'}
                                    >
                                        <Download size={18} />
                                        <span className="text-xs sm:text-sm whitespace-nowrap">{hasGeneratedAwb(selectedOrder) ? 'Edit AWB' : 'Generate AWB'}</span>
                                    </button>
                                    <button
                                        onClick={() => printInvoice(selectedOrder)}
                                        className="col-span-2 sm:col-span-1 w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Print Invoice"
                                    >
                                        <Printer size={18} />
                                        <span className="text-xs sm:text-sm whitespace-nowrap">Print</span>
                                    </button>
                                </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
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
                                                {selectedOrder.trackingId ? (
                                                    <a
                                                        href={
                                                            (selectedOrder.courier || '').toLowerCase().includes('india post')
                                                                ? `https://t.17track.net/en#nums=${encodeURIComponent(selectedOrder.trackingId)}`
                                                                : selectedOrder.trackingUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline font-medium"
                                                    >
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

                                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                                    <h4 className="text-lg font-semibold text-orange-900 mb-4 flex items-center gap-2">
                                        <span>📦</span> Tracking Information
                                    </h4>

                                    {/* Order Tracking Section */}
                                    <div className="space-y-4">
                                        <div>
                                            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <span>📮</span> Order Tracking (Customer to Warehouse)
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 block mb-1">Tracking ID *</label>
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
                                        </div>

                                        {/* Return Tracking Section */}
                                        {selectedOrder?.returns && selectedOrder.returns.some(r => String(r?.type || '').toUpperCase() === 'RETURN' && String(r?.status || '').toUpperCase().includes('APPROVED')) && (
                                            <div className="border-t pt-4">
                                                <h5 className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                                                    <span>↩️</span> Return Tracking (Customer to Seller)
                                                </h5>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Return Tracking ID</label>
                                                        <input
                                                            type="text"
                                                            value={trackingData.returnTrackingId}
                                                            onChange={e => setTrackingData({...trackingData, returnTrackingId: e.target.value})}
                                                            placeholder="Enter return AWB or tracking ID"
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Return Courier</label>
                                                        <input
                                                            type="text"
                                                            value={trackingData.returnCourier}
                                                            onChange={e => setTrackingData({...trackingData, returnCourier: e.target.value})}
                                                            placeholder="e.g., DHL, Delhivery"
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Return Tracking URL</label>
                                                        <input
                                                            type="url"
                                                            value={trackingData.returnTrackingUrl}
                                                            onChange={e => setTrackingData({...trackingData, returnTrackingUrl: e.target.value})}
                                                            placeholder="https://..."
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Replacement Tracking Section (only for REPLACEMENT type) */}
                                        {selectedOrder?.returns && selectedOrder.returns.some(r => String(r?.type || '').toUpperCase() === 'REPLACEMENT' && String(r?.status || '').toUpperCase().includes('APPROVED')) && (
                                            <div className="border-t pt-4">
                                                <h5 className="text-sm font-bold text-violet-700 mb-3 flex items-center gap-2">
                                                    <span>📦</span> Replacement Tracking (Seller to Customer)
                                                </h5>
                                                <p className="text-xs text-slate-500 mb-3">Added after return is inspected and approved for replacement</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Replacement Tracking ID</label>
                                                        <input
                                                            type="text"
                                                            value={trackingData.replacementTrackingId}
                                                            onChange={e => setTrackingData({...trackingData, replacementTrackingId: e.target.value})}
                                                            placeholder="Enter replacement tracking ID"
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Replacement Courier</label>
                                                        <input
                                                            type="text"
                                                            value={trackingData.replacementCourier}
                                                            onChange={e => setTrackingData({...trackingData, replacementCourier: e.target.value})}
                                                            placeholder="e.g., Delhivery, DHL"
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-700 block mb-1">Replacement Tracking URL</label>
                                                        <input
                                                            type="url"
                                                            value={trackingData.replacementTrackingUrl}
                                                            onChange={e => setTrackingData({...trackingData, replacementTrackingUrl: e.target.value})}
                                                            placeholder="https://..."
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <button
                                            onClick={updateTrackingDetails}
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                                        >
                                            Update Tracking & Notify Customer
                                        </button>

                                        <button
                                            onClick={autoSyncStatusFromTracking}
                                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                                        >
                                            Auto Status from Tracking
                                        </button>
                                    </div>

                                    {/* Delhivery Pickup Controls */}
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
                                </div>

                                {/* India Post Tracking Section */}
                                <div className="mt-5 border border-red-200 rounded-xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3 flex items-center gap-2">
                                        <span className="text-xl">📮</span>
                                        <h4 className="text-white font-semibold text-sm">India Post Tracking</h4>
                                        {selectedOrder?.courier?.toLowerCase().includes('india post') && (
                                            <span className="ml-auto bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
                                        )}
                                    </div>
                                    <div className="bg-red-50 p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                value={indiaPostAwb}
                                                onChange={e => setIndiaPostAwb(e.target.value)}
                                                placeholder="Enter India Post AWB (e.g. EB468827991IN)"
                                                className="flex-1 px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                            />
                                            <button
                                                onClick={saveIndiaPostTracking}
                                                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
                                            >
                                                Save &amp; Track
                                            </button>
                                        </div>

                                        {/* If already India Post, show current AWB + refresh + link */}
                                        {selectedOrder?.courier?.toLowerCase().includes('india post') && selectedOrder?.trackingId && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between bg-white border border-red-200 rounded-lg px-3 py-2">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Current AWB</p>
                                                        <p className="font-mono font-semibold text-slate-800 text-sm">{selectedOrder.trackingId}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => fetchIndiaPostTracking()}
                                                            disabled={fetchingIndiaPostTracking}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            {fetchingIndiaPostTracking ? '⏳ Fetching...' : '🔄 Refresh'}
                                                        </button>
                                                        <a
                                                            href={`https://t.17track.net/en#nums=${selectedOrder.trackingId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            📦 17track
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Live tracking data from 17track */}
                                                {indiaPostTracking && (
                                                    <div className="space-y-2">
                                                        {/* Current status */}
                                                        <div className={`p-3 rounded-lg border ${indiaPostTracking.isDelivered ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                                            <p className="text-xs text-slate-500 font-semibold">Current Status</p>
                                                            <p className={`font-bold text-lg mt-0.5 ${indiaPostTracking.isDelivered ? 'text-green-700' : 'text-blue-700'}`}>
                                                                {indiaPostTracking.isDelivered ? '✅' : '📦'} {indiaPostTracking.statusLabel}
                                                            </p>
                                                        </div>

                                                        {/* Official carrier message */}
                                                        {indiaPostTracking.providerTips && (
                                                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                                                <p className="text-xs text-slate-500 font-semibold">Carrier Message</p>
                                                                <p className="text-sm font-medium text-amber-800 mt-0.5">{indiaPostTracking.providerTips}</p>
                                                            </div>
                                                        )}

                                                        {/* Delivered time */}
                                                        {indiaPostTracking.deliveredAt && (
                                                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                                                <p className="text-xs text-slate-500 font-semibold">Delivered On</p>
                                                                <p className="font-bold text-green-700 mt-0.5">{indiaPostTracking.deliveredAt}</p>
                                                            </div>
                                                        )}

                                                        {/* Current location */}
                                                        {indiaPostTracking.currentLocation && (
                                                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg text-white">
                                                                <p className="text-xs font-semibold opacity-90">📍 Current Location</p>
                                                                <p className="font-bold text-base mt-0.5">{indiaPostTracking.currentLocation}</p>
                                                            </div>
                                                        )}

                                                        {/* Events timeline */}
                                                        {indiaPostTracking.events && indiaPostTracking.events.length > 0 && (
                                                            <div className="border-t border-red-200 pt-3">
                                                                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">📦 Tracking History ({indiaPostTracking.events.length} events)</p>
                                                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                                                    {indiaPostTracking.events.map((evt, idx) => (
                                                                        <div key={idx} className={`border-l-2 ${idx === 0 ? 'border-red-500' : 'border-red-200'} pl-3 py-1.5 bg-white rounded-r`}>
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <div className="flex-1">
                                                                                    {evt.location && <div className="font-semibold text-slate-800 text-xs">📍 {evt.location}</div>}
                                                                                    {evt.description && <div className={`text-xs mt-0.5 ${idx === 0 ? 'font-bold text-red-700' : 'text-slate-600'}`}>{evt.description}</div>}
                                                                                </div>
                                                                                <div className="text-xs text-slate-400 whitespace-nowrap">{evt.time}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Loading state */}
                                                {fetchingIndiaPostTracking && !indiaPostTracking && (
                                                    <div className="text-center py-4 text-sm text-slate-500">⏳ Fetching live tracking...</div>
                                                )}

                                                {/* No key configured */}
                                                {!fetchingIndiaPostTracking && !indiaPostTracking && indiaPostNoKey && (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                                                        <p className="text-xs text-yellow-900">
                                                            ℹ️ 17track API key is not configured.
                                                        </p>
                                                        <p className="text-[11px] text-slate-600">
                                                            Go to Dashboard Settings and add your 17track API key.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Return/Replacement Request Section */}
                            {selectedOrder.returns && selectedOrder.returns.length > 0 && (
                                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-pink-900 mb-1">Return/Replacement Request History</h3>
                                    <p className="text-xs text-pink-700 mb-4">
                                        This section shows what the customer originally requested. The live order lifecycle is the status selected below in Update Order Status.
                                    </p>
                                    
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
                                                        getReturnRequestStatusLabel(returnRequest) === 'REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                                                        getReturnRequestStatusLabel(returnRequest) === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        getReturnRequestStatusLabel(returnRequest) === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        getReturnRequestStatusLabel(returnRequest) === 'REPLACEMENT_REQUESTED' ? 'bg-violet-100 text-violet-700' :
                                                        getReturnRequestStatusLabel(returnRequest) === 'REPLACED' ? 'bg-emerald-100 text-emerald-700' :
                                                        getReturnRequestStatusLabel(returnRequest) === 'RETURNED_REFUNDED' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {getReturnRequestStatusLabel(returnRequest).replace(/_/g, ' ')}
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

                                                    {returnRequest.type === 'RETURN' && returnRequest.status === 'COMPLETED' && (
                                                        <div>
                                                            <p className="text-slate-600 font-medium">Refund Amount:</p>
                                                            <p className="text-cyan-700 font-semibold">{currency}{(() => {
                                                                const item = selectedOrder.orderItems?.[returnRequest.itemIndex];
                                                                return Number(item?.price || 0) * Number(item?.quantity || 1);
                                                            })()}</p>
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
                                <div className="flex items-center justify-between mb-3 gap-3">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                        Customer Details
                                        {selectedOrder.isGuest && (
                                            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                                GUEST ORDER
                                            </span>
                                        )}
                                    </h3>

                                    <button
                                        type="button"
                                        onClick={() => setIsEditingOrderDetails((prev) => !prev)}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                                    >
                                        {isEditingOrderDetails ? 'Cancel Edit' : 'Edit Details'}
                                    </button>
                                </div>
                                
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
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                value={selectedOrder.isGuest ? (selectedOrder.guestName || '') : (selectedOrder.shippingAddress?.name || '')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSelectedOrder({
                                                        ...selectedOrder,
                                                        ...(selectedOrder.isGuest ? { guestName: value } : {}),
                                                        shippingAddress: { ...(selectedOrder.shippingAddress || {}), name: value }
                                                    });
                                                }}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.isGuest
                                                    ? (selectedOrder.guestName || '—')
                                                    : (selectedOrder.shippingAddress?.name || selectedOrder.userId?.name || '—')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Email</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="email"
                                                value={selectedOrder.isGuest ? (selectedOrder.guestEmail || '') : (selectedOrder.shippingAddress?.email || '')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSelectedOrder({
                                                        ...selectedOrder,
                                                        ...(selectedOrder.isGuest ? { guestEmail: value } : {}),
                                                        shippingAddress: { ...(selectedOrder.shippingAddress || {}), email: value }
                                                    });
                                                }}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.isGuest
                                                    ? (selectedOrder.guestEmail || '—')
                                                    : (selectedOrder.shippingAddress?.email || selectedOrder.userId?.email || '—')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Phone</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={selectedOrder.isGuest ? (selectedOrder.guestPhone || '') : (selectedOrder.shippingAddress?.phone || '')}
                                                onChange={(e) => {
                                                    const value = String(e.target.value || '').replace(/[^0-9]/g, '').slice(0, 15);
                                                    setSelectedOrder({
                                                        ...selectedOrder,
                                                        ...(selectedOrder.isGuest ? { guestPhone: value } : {}),
                                                        shippingAddress: { ...(selectedOrder.shippingAddress || {}), phone: value }
                                                    });
                                                }}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.isGuest
                                                    ? ([selectedOrder.shippingAddress?.phoneCode, selectedOrder.guestPhone].filter(Boolean).join(' ') || '—')
                                                    : ([selectedOrder.shippingAddress?.phoneCode, selectedOrder.shippingAddress?.phone].filter(Boolean).join(' ') || '—')}
                                            </p>
                                        )}
                                    </div>
                                    {(selectedOrder.shippingAddress?.alternatePhone || selectedOrder.alternatePhone || isEditingOrderDetails) && (
                                        <div>
                                            <p className="text-slate-500">Alternate Phone</p>
                                            {isEditingOrderDetails ? (
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={selectedOrder.alternatePhone || selectedOrder.shippingAddress?.alternatePhone || ''}
                                                    onChange={(e) => {
                                                        const value = String(e.target.value || '').replace(/[^0-9]/g, '').slice(0, 15);
                                                        setSelectedOrder({
                                                            ...selectedOrder,
                                                            alternatePhone: value,
                                                            shippingAddress: { ...(selectedOrder.shippingAddress || {}), alternatePhone: value }
                                                        });
                                                    }}
                                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <p className="font-medium text-slate-900">
                                                    {selectedOrder.isGuest
                                                        ? [selectedOrder.alternatePhoneCode || selectedOrder.shippingAddress?.phoneCode || '+91', selectedOrder.alternatePhone || selectedOrder.shippingAddress?.alternatePhone].filter(Boolean).join(' ')
                                                        : [selectedOrder.shippingAddress?.alternatePhoneCode || selectedOrder.shippingAddress?.phoneCode || '+91', selectedOrder.shippingAddress?.alternatePhone || selectedOrder.alternatePhone].filter(Boolean).join(' ')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Street</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                value={selectedOrder.shippingAddress?.street || ''}
                                                onChange={(e) => setSelectedOrder({
                                                    ...selectedOrder,
                                                    shippingAddress: { ...(selectedOrder.shippingAddress || {}), street: e.target.value }
                                                })}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.street || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">City</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                value={selectedOrder.shippingAddress?.city || ''}
                                                onChange={(e) => setSelectedOrder({
                                                    ...selectedOrder,
                                                    shippingAddress: { ...(selectedOrder.shippingAddress || {}), city: e.target.value }
                                                })}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.city || '—'}</p>
                                        )}
                                    </div>
                                    {(selectedOrder.shippingAddress?.district || isEditingOrderDetails) && (
                                        <div>
                                            <p className="text-slate-500">District</p>
                                            {isEditingOrderDetails ? (
                                                <input
                                                    type="text"
                                                    value={selectedOrder.shippingAddress?.district || ''}
                                                    onChange={(e) => setSelectedOrder({
                                                        ...selectedOrder,
                                                        shippingAddress: { ...(selectedOrder.shippingAddress || {}), district: e.target.value }
                                                    })}
                                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <p className="font-medium text-slate-900">{selectedOrder.shippingAddress.district}</p>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">State</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                value={selectedOrder.shippingAddress?.state || ''}
                                                onChange={(e) => setSelectedOrder({
                                                    ...selectedOrder,
                                                    shippingAddress: { ...(selectedOrder.shippingAddress || {}), state: e.target.value }
                                                })}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.state || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Pincode</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || ''}
                                                onChange={(e) => {
                                                    const value = String(e.target.value || '').replace(/[^0-9]/g, '').slice(0, 10);
                                                    setSelectedOrder({
                                                        ...selectedOrder,
                                                        shippingAddress: { ...(selectedOrder.shippingAddress || {}), zip: value, pincode: value }
                                                    });
                                                }}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Country</p>
                                        {isEditingOrderDetails ? (
                                            <input
                                                type="text"
                                                value={selectedOrder.shippingAddress?.country || ''}
                                                onChange={(e) => setSelectedOrder({
                                                    ...selectedOrder,
                                                    shippingAddress: { ...(selectedOrder.shippingAddress || {}), country: e.target.value }
                                                })}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.country || '—'}</p>
                                        )}
                                    </div>
                                </div>

                                {isEditingOrderDetails && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={saveEditedOrderDetails}
                                            disabled={savingOrderDetails}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${savingOrderDetails ? 'bg-blue-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {savingOrderDetails ? 'Saving...' : 'Save Details'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingOrderDetails(false)}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
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
                                                src={resolveOrderItemImage(item)}
                                                alt={item.productId?.name || item.product?.name || item.name || 'Product'}
                                                className="w-20 h-20 object-cover rounded-lg border border-slate-100"
                                                onError={(e) => {
                                                    if (e.currentTarget.src !== '/placeholder.png') {
                                                        e.currentTarget.src = '/placeholder.png'
                                                    }
                                                }}
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">{item.productId?.name || item.product?.name || item.name || item.productName || 'Unknown Product'}</p>
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
                                        {(() => {
                                            const refundedAmount = getReturnedRefundAmount(selectedOrder);
                                            const netAmount = getNetOrderAmount(selectedOrder);
                                            return refundedAmount > 0 ? (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 line-through">{currency}{selectedOrder.total}</p>
                                                    <p className="text-xl font-bold text-slate-900">{currency}{netAmount}</p>
                                                    <p className="text-xs font-semibold text-cyan-700">Refunded: {currency}{refundedAmount}</p>
                                                </div>
                                            ) : (
                                                <p className="text-xl font-bold text-slate-900">{currency}{selectedOrder.total}</p>
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Method</p>
                                        {isEditingOrderDetails ? (
                                            <select
                                                value={String(selectedOrder.paymentMethod || '').toUpperCase()}
                                                onChange={(e) => setSelectedOrder({ ...selectedOrder, paymentMethod: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            >
                                                {PAYMENT_METHOD_OPTIONS.map((method) => (
                                                    <option key={method.value} value={method.value}>{method.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="font-medium text-slate-900">{selectedOrder.paymentMethod}</p>
                                        )}
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
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-blue-900">Generate Customer Payment Link</p>
                                            <p className="text-xs text-blue-700 mt-0.5">Use this when you want customer to pay updated amount online (card/UPI/netbanking).</p>

                                            <div className="mt-3 flex flex-col md:flex-row gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={paymentLinkAmount}
                                                    onChange={(e) => setPaymentLinkAmount(e.target.value)}
                                                    className="w-full md:w-56 px-3 py-2 rounded-lg border border-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Amount"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={createCustomerPaymentLink}
                                                    disabled={creatingPaymentLink}
                                                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${creatingPaymentLink ? 'bg-blue-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {creatingPaymentLink ? 'Generating...' : 'Generate Link'}
                                                </button>
                                            </div>

                                            {generatedPaymentLink && (
                                                <div className="mt-3 flex flex-col md:flex-row gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={generatedPaymentLink}
                                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs md:text-sm text-slate-700 bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await navigator.clipboard.writeText(generatedPaymentLink);
                                                                toast.success('Payment link copied');
                                                            } catch {
                                                                toast.error('Could not copy payment link');
                                                            }
                                                        }}
                                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900 transition"
                                                    >
                                                        Copy Link
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                                                if (newStatus === 'CANCELLED') {
                                                    setPendingCancelStatus(newStatus);
                                                    setCancelModalBy('SELLER');
                                                    setCancelModalReason('');
                                                    setShowCancelModal(true);
                                                    return;
                                                }
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

                                    {/* Cancel reason editor — shown only when order is CANCELLED */}
                                    {selectedOrder.status === 'CANCELLED' && (
                                        <div className="mt-4 relative z-10 bg-red-50 border border-red-200 rounded-xl p-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                            <p className="text-sm font-semibold text-red-800 mb-3">🚫 Cancellation Details</p>
                                            <div className="space-y-2 mb-3">
                                                {[
                                                    { value: 'SELLER', label: '🏪 Cancelled by Seller' },
                                                    { value: 'CUSTOMER', label: '👤 Requested by Customer' },
                                                    { value: 'UNDELIVERABLE_PINCODE', label: '📍 Pincode Not Deliverable' },
                                                    { value: 'OTHER', label: '📝 Other' },
                                                ].map(opt => (
                                                    <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                                                        (selectedOrder.cancelledBy || 'SELLER') === opt.value ? 'border-red-500 bg-white' : 'border-transparent hover:bg-white'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="editCancelBy"
                                                            value={opt.value}
                                                            checked={(selectedOrder.cancelledBy || 'SELLER') === opt.value}
                                                            onChange={() => setSelectedOrder({...selectedOrder, cancelledBy: opt.value})}
                                                            className="w-4 h-4 text-red-600"
                                                        />
                                                        <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={selectedOrder.cancelReason || ''}
                                                onChange={e => setSelectedOrder({...selectedOrder, cancelReason: e.target.value})}
                                                placeholder="Cancel note (optional)"
                                                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={saveCancellationDetails}
                                                disabled={savingCancellationDetails}
                                                className={`w-full py-2 text-white font-semibold rounded-lg text-sm transition cursor-pointer ${savingCancellationDetails ? 'bg-red-300 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                {savingCancellationDetails ? 'Saving...' : 'Save Cancellation Details'}
                                            </button>
                                        </div>
                                    )}
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
            {showCancelModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowCancelModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">🚫</div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Cancel Order</h3>
                                <p className="text-sm text-slate-500">Select why this order is being cancelled</p>
                            </div>
                        </div>

                        <div className="mb-5 space-y-2">
                            {[
                                { value: 'SELLER', label: '🏪 Cancelled by Seller', desc: 'Stock issue, seller decision, etc.' },
                                { value: 'CUSTOMER', label: '👤 Requested by Customer', desc: 'Customer asked to cancel' },
                                { value: 'UNDELIVERABLE_PINCODE', label: '📍 Pincode Not Deliverable', desc: 'Delivery not available at this location' },
                                { value: 'OTHER', label: '📝 Other Reason', desc: 'Specify below' },
                            ].map(opt => (
                                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${cancelModalBy === opt.value ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="cancelBy" value={opt.value} checked={cancelModalBy === opt.value} onChange={() => setCancelModalBy(opt.value)} className="w-4 h-4 text-red-600" />
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{opt.label}</p>
                                        <p className="text-xs text-slate-500">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Additional Note (optional)</label>
                            <textarea
                                value={cancelModalReason}
                                onChange={e => setCancelModalReason(e.target.value)}
                                placeholder="e.g. Customer called and requested cancellation"
                                rows="3"
                                className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition font-semibold">
                                Back
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const token = await getToken(true);
                                        if (!token) { toast.error('Authentication failed.'); return; }
                                        await axios.post('/api/store/orders/update-status', {
                                            orderId: selectedOrder._id,
                                            status: 'CANCELLED',
                                            cancelledBy: cancelModalBy,
                                            cancelReason: cancelModalReason.trim() || cancelModalBy
                                        }, { headers: { Authorization: `Bearer ${token}` } });
                                        toast.success('Order cancelled');
                                        setSelectedOrder({ ...selectedOrder, status: 'CANCELLED', cancelledBy: cancelModalBy, cancelReason: cancelModalReason.trim() });
                                        setShowCancelModal(false);
                                        fetchOrders();
                                    } catch (error) {
                                        toast.error(error?.response?.data?.error || 'Failed to cancel order');
                                    }
                                }}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-lg shadow-red-600/30"
                            >
                                Confirm Cancel
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
                            <h2 className="text-2xl font-bold">{awbModalMode === 'edit' ? 'Edit AWB' : 'Generate AWB'}</h2>
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
                                                                    src={resolveOrderItemImage(item)} 
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
                                                labelSize: ltlLabelSize,
                                                contractId: selectedContract.id || selectedContract.key || '',
                                                contractLabel: selectedContract.label || '',
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
                                            setAwbFormDetails(detailsWithContract)
                                            setAwbFormPreviewDoc(doc)
                                            setAwbFormPreviewUrl(url)
                                            setAwbDetailsByOrder(prev => ({
                                                ...prev,
                                                [selectedOrder._id]: detailsWithContract
                                            }))
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

