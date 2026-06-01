# Delhivery Auto-Refresh & Pickup Scheduling Guide

## Overview
This document explains the new auto-refresh and pickup scheduling features added to the Delhivery integration.

## Features Added

### 1. Auto-Refresh Tracking Data
**Location:** `app/store/orders/page.jsx` - Order Details Modal

**What it does:**
- Automatically refreshes Delhivery tracking data at configurable intervals
- Fetches latest status, location, and delivery updates
- Default interval: 30 seconds (adjustable via `refreshInterval` state)
- Only refreshes when a Delhivery order is selected
- Shows "Auto-Refresh ON/OFF" toggle button in tracking section

**How it works:**
1. User clicks "Auto-Refresh ON/OFF" button to toggle
2. When enabled, `useEffect` sets up a `setInterval` that calls `refreshTrackingData()` every N seconds
3. `refreshTrackingData()` calls `/api/track-order?awb={trackingId}` to fetch latest data
4. Fresh tracking info updates the selected order state
5. Interval is cleared on component unmount or when toggled off

**Code:**
```javascript
// In store/orders component
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
const [refreshInterval, setRefreshInterval] = useState(30); // seconds
const refreshIntervalRef = useRef(null);

useEffect(() => {
    if (autoRefreshEnabled && selectedOrder?.trackingId) {
        refreshIntervalRef.current = setInterval(() => {
            refreshTrackingData();
        }, refreshInterval * 1000);

        return () => clearInterval(refreshIntervalRef.current);
    }
}, [autoRefreshEnabled, selectedOrder?.trackingId, refreshInterval]);

const refreshTrackingData = async () => {
    try {
        if (!selectedOrder?.trackingId) return;
        
        const response = await fetch(
            `/api/track-order?awb=${selectedOrder.trackingId}`
        );
        const data = await response.json();
        
        if (data.success) {
            setSelectedOrder(prev => ({
                ...prev,
                delhivery: data.data
            }));
        }
    } catch (error) {
        console.error('Error refreshing tracking:', error);
    }
};
```

### 2. Schedule Delhivery Pickup
**Location:** `app/store/orders/page.jsx` - Order Details Modal
**Backend:** `app/api/store/schedule-pickup/route.js`

**What it does:**
- Allows sellers to schedule pickups directly from Delhivery
- Shows "Schedule Delhivery Pickup" button for Delhivery orders
- Automatically gathers order details and calls Delhivery API
- Updates order with pickup scheduling confirmation
- Shows loading state while scheduling

**How it works:**
1. User clicks "Schedule Delhivery Pickup" button
2. `schedulePickupWithDelhivery()` function validates order has trackingId
3. POSTs to `/api/store/schedule-pickup` with order details:
   ```javascript
   {
       orderId: selectedOrder._id,
       trackingId: selectedOrder.trackingId,
       courier: selectedOrder.courier,
       shippingAddress: selectedOrder.shippingAddress,
       shipmentWeight: selectedOrder.shipmentWeight,
       packageCount: selectedOrder.items?.length || 1
   }
   ```
4. Backend endpoint verifies seller ownership and calls `schedulePickup()` from `lib/delhivery.js`
5. Delhivery API confirms pickup scheduling
6. Order document updated with `delhivery.pickupScheduled = true` and `pickupId`

**Code:**
```javascript
// In store/orders component
const [schedulingPickup, setSchedulingPickup] = useState(false);

const schedulePickupWithDelhivery = async () => {
    if (!selectedOrder?.trackingId) {
        toast.error('Tracking ID is required');
        return;
    }

    try {
        setSchedulingPickup(true);
        const response = await fetch('/api/store/schedule-pickup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: selectedOrder._id,
                trackingId: selectedOrder.trackingId,
                courier: selectedOrder.courier,
                shippingAddress: selectedOrder.shippingAddress,
                shipmentWeight: selectedOrder.shipmentWeight,
                packageCount: selectedOrder.items?.length || 1
            })
        });

        const result = await response.json();
        
        if (result.success) {
            toast.success(result.message);
            // Refresh order data
            await fetchOrders();
        } else {
            toast.error(result.error || 'Failed to schedule pickup');
        }
    } catch (error) {
        toast.error(error.message);
    } finally {
        setSchedulingPickup(false);
    }
};
```

## UI Buttons

### Auto-Refresh Toggle
- **Location:** Tracking Information section, below "Update Tracking & Notify Customer" button
- **Status:** ON = Green with checkmark, OFF = Gray
- **Shows:** Current interval in seconds when enabled
- **Only visible:** For Delhivery orders

### Schedule Pickup Button
- **Location:** Tracking Information section, below auto-refresh button
- **Shows loading state:** "Scheduling Pickup..." with spinner
- **Disabled when:** No tracking ID or already scheduling
- **Only visible:** For Delhivery orders with tracking ID

## API Endpoint: POST /api/store/schedule-pickup

**Authentication:** Firebase ID token required

**Request Body:**
```json
{
    "orderId": "507f1f77bcf86cd799439011",
    "trackingId": "DELHIVERY123456",
    "courier": "Delhivery",
    "shippingAddress": {
        "name": "John Doe",
        "phone": "9876543210",
        "street": "123 Main St",
        "city": "New Delhi",
        "pincode": "110001"
    },
    "shipmentWeight": 0.5,
    "packageCount": 1
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Pickup scheduled successfully",
    "pickupId": "PICKUP123456",
    "pickupData": {
        "pickupLocationId": "1",
        "expectedPackageCount": 1,
        "pickupDate": "2024-01-15",
        "address": "123 Main St",
        "city": "New Delhi",
        "pincode": "110001",
        "phone": "9876543210",
        "name": "John Doe",
        "waybill": "DELHIVERY123456",
        "weight": 0.5
    }
}
```

**Error Response (400/401/404):**
```json
{
    "error": "Error message",
    "details": "Additional details if available"
}
```

## Database Changes

When pickup is scheduled, the order document is updated with:
```javascript
{
    "delhivery.pickupScheduled": true,
    "delhivery.pickupId": "PICKUP123456",
    "delhivery.pickupScheduledAt": "2024-01-15T10:30:00Z",
    "delhivery.pickupMessage": "Pickup scheduled successfully"
}
```

## Configuration

### Refresh Interval
- Default: 30 seconds
- To change: Modify `refreshInterval` state value
- Can be made user-configurable with a dropdown/input

### Pickup Location ID
- Stored in: `process.env.DELHIVERY_PICKUP_LOCATION_ID`
- Default: '1'
- Required: Set in `.env.local`

### Pickup Time Slot
- Default: '12:00-18:00'
- Can be customized in `/api/store/schedule-pickup/route.js`
- Format: 'HH:MM-HH:MM' in 24-hour format

## Troubleshooting

### Auto-Refresh not working
- ✅ Check: Order courier is "Delhivery"
- ✅ Check: Order has valid trackingId
- ✅ Check: Browser console for errors
- ✅ Check: Delhivery API token is valid

### Schedule Pickup button disabled
- ✅ Reason: trackingId is missing
- ✅ Solution: Enter tracking ID and save

### Pickup schedule fails
- ✅ Common: Missing `DELHIVERY_PICKUP_LOCATION_ID` environment variable
- ✅ Common: Invalid shipping address data
- ✅ Solution: Check backend logs for detailed error

## Testing

### Test Auto-Refresh:
1. Open store/orders page
2. Click on a Delhivery order
3. Click "Auto-Refresh OFF" to enable
4. Should show "Auto-Refresh ON (Every 30s)"
5. Wait 30 seconds - tracking data should update automatically
6. Toggle OFF to stop refreshing

### Test Schedule Pickup:
1. Open store/orders page
2. Click on a Delhivery order with trackingId
3. Click "Schedule Delhivery Pickup"
4. Button should show "Scheduling Pickup..." with spinner
5. Should complete within 2-3 seconds
6. Order should now have `delhivery.pickupScheduled = true`

## Future Enhancements
- [ ] Configurable refresh interval UI (dropdown/number input)
- [ ] Pickup status tracking (scheduled, confirmed, picked up)
- [ ] Cancel pickup button
- [ ] Batch pickup scheduling for multiple orders
- [ ] Pickup history timeline
- [ ] Webhook integration for real-time Delhivery events

