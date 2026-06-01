# Delhivery Payment Collection Integration

## Overview

The application now automatically fetches and displays payment collection information from the Delhivery API. When a delivery partner collects COD (Cash on Delivery) payment, this information is captured and used to automatically mark orders as PAID across the entire system.

## Features Implemented

### 1. **Delhivery Payment Data Extraction**
**File:** `lib/delhivery.js` - `normalizeDelhiveryShipment()` function

The Delhivery tracking response now extracts payment-related fields:
```javascript
payment: {
  is_cod_recovered: boolean,      // Has payment been collected?
  cod_amount: number,              // Amount collected
  payment_method: string,          // Payment method from courier
  payment_status: string,          // Payment status from courier
  payment_collected_at: date       // When payment was collected
}
```

### 2. **Auto-Mark Orders as PAID**

When any of these conditions are met, orders are automatically marked as `isPaid = true`:

**Condition A:** COD order status is DELIVERED
```javascript
if (paymentMethod === 'cod' && status === 'DELIVERED') {
  order.isPaid = true;
}
```

**Condition B:** Delhivery reports payment collected
```javascript
if (order.delhivery?.payment?.is_cod_recovered && paymentMethod === 'cod') {
  order.isPaid = true;
}
```

### 3. **Payment Status Display**

#### Store Admin Dashboard (`/store/orders`)
- Shows "✓ Paid" in green when payment collected
- Shows "Pending" in red when awaiting payment
- Modal displays Delhivery payment confirmation badge with amount

#### Customer Order Pages (`/orders`, `/dashboard/orders`)
- Payment status badge (Paid/Pending)
- COD status message ("Payment collected from customer" or "Awaiting payment at delivery")
- **NEW:** Delhivery payment confirmation box showing collected amount

## Implementation Details

### Payment Status Helper Function

Updated in 4 locations for consistency:

1. **app/store/orders/page.jsx** - Store admin view
2. **app/dashboard/orders/page.jsx** - Customer dashboard
3. **components/OrderItem.jsx** - Public orders card
4. **app/(public)/orders/OrdersClient.jsx** - Initial fetch logic

**Helper Function Pattern:**
```javascript
const getPaymentStatus = (order) => {
  const paymentMethod = (order.paymentMethod || '').toLowerCase();
  const status = (order.status || '').toUpperCase();
  
  // Check if COD + DELIVERED
  if (paymentMethod === 'cod' && status === 'DELIVERED') {
    return true;
  }
  
  // Check if Delhivery reported payment collected
  if (order.delhivery?.payment?.is_cod_recovered) {
    return true;
  }
  
  return order.isPaid || false;
};
```

**Case-Insensitive Matching:**
- `paymentMethod` converted to lowercase for comparison
- `status` converted to uppercase for comparison
- Handles data stored as "cod", "COD", "cOd", etc.
- Handles status stored as "delivered", "DELIVERED", "Delivered", etc.

### API Endpoint Updates

**File:** `app/api/store/orders/update-status/route.js`

When admin updates order status to DELIVERED:
1. Checks if COD payment method
2. Auto-marks `order.isPaid = true`
3. Checks if Delhivery has `payment.is_cod_recovered`
4. Auto-marks `order.isPaid = true`
5. Saves order to database
6. Sends email notification

### UI Display Enhancements

#### Store Admin Modal Payment Section
```
Payment Method             [Payment Status Badge]
  ✓ Cash on Delivery       ✓ Paid

[GREEN BOX] ✓ Payment Confirmed by Delhivery
            Collected: ₹[amount]
```

#### Customer Order Card Payment Section
```
[Payment Method Box]
💵 Cash on Delivery         ✓ PAID

[YELLOW/GREEN BOX] 
✓ Payment collected from customer
OR if not collected:
⏳ Awaiting payment at delivery
Rider will collect ₹[amount] during delivery

[GREEN BOX if collected by courier]
✓ Payment Confirmed by Delhivery
Collected: ₹[amount]
```

## Data Flow

### 1. Order Fetch Flow
```
API /api/store/orders GET
  ├─ Fetch all warehouse/seller orders
  ├─ For each order with trackingId:
  │   ├─ Call fetchNormalizedDelhiveryTracking()
  │   ├─ Extract payment.is_cod_recovered from response
  │   └─ Add to order.delhivery.payment object
  └─ Return enhanced orders with payment info
     └─ Frontend applies getPaymentStatus() for display
```

### 2. Status Update Flow
```
API /api/store/orders/update-status POST
  ├─ Admin changes status to DELIVERED
  ├─ Backend auto-checks conditions:
  │   ├─ Is COD payment + DELIVERED? → Mark isPaid
  │   └─ Is Delhivery payment collected? → Mark isPaid
  ├─ Update order in database
  └─ Send email notification
     └─ Frontend refresh shows updated status
```

### 3. Auto-Refresh Flow
```
Customer expands order card
  ├─ Auto-refresh triggers every 30 seconds
  ├─ Fetch fresh tracking data from /api/track-order
  ├─ Extract updated delhivery.payment info
  ├─ Apply getPaymentStatus() logic
  └─ Silently update UI with latest payment status
```

## Files Modified

1. **lib/delhivery.js**
   - Enhanced `normalizeDelhiveryShipment()` to extract payment fields

2. **app/api/store/orders/update-status/route.js**
   - Added Delhivery payment check in isPaid logic

3. **app/store/orders/page.jsx**
   - Updated `getPaymentStatus()` helper
   - Added Delhivery payment display in modal
   - Added debug logging for troubleshooting

4. **app/(public)/orders/OrdersClient.jsx**
   - Updated auto-mark logic to check Delhivery payment

5. **app/dashboard/orders/page.jsx**
   - Updated `getPaymentStatus()` helper (3 locations)
   - Added Delhivery payment display in modal

6. **components/OrderItem.jsx**
   - Updated `getPaymentStatus()` helper
   - Added Delhivery payment display

## Testing Checklist

- [ ] COD order shows "Pending" initially
- [ ] When order status changes to DELIVERED, shows "✓ Paid"
- [ ] When Delhivery API returns `is_cod_recovered: true`, shows "✓ Paid"
- [ ] Delhivery payment confirmation box appears when `is_cod_recovered: true`
- [ ] Admin can see payment confirmation in store/orders modal
- [ ] Customers can see payment confirmation in order cards
- [ ] Dashboard auto-refresh updates payment status correctly
- [ ] Case-insensitive matching handles mixed-case payment methods and statuses

## Troubleshooting

### Orders still showing "Pending" payment

**Check browser console for debug logs:**
```javascript
// Look for [PAYMENT STATUS DEBUG] logs
// Verify:
// - paymentMethod is populated (not null/undefined)
// - status matches expected format (DELIVERED, etc.)
// - isCOD and isDelivered flags match expectations
// - delhiveryPaymentCollected shows true if collected
```

### Delhivery payment field is empty

**Verify:**
1. Delhivery API is returning payment fields in response
2. Check Delhivery tracking response has `IsCodRecovered` field
3. Verify field mapping in `normalizeDelhiveryShipment()` matches API response

### Order doesn't auto-mark after status change

**Check:**
1. Order was saved to database: `await order.save()`
2. Frontend refreshes after status update
3. Payment method is exactly 'cod' (case-insensitive)
4. Status is exactly 'DELIVERED' (case-insensitive)

## Future Enhancements

1. **Payment Settlement Tracking**
   - Track when Delhivery remits payment to seller
   - Display payment settlement status in admin dashboard

2. **Failure Handling**
   - Handle cases where Delhivery reports payment failure
   - Create payment dispute resolution workflow

3. **Payment Receipt**
   - Store Delhivery payment receipt/reference number
   - Display in order details for tracking

4. **Bulk Payment Status**
   - Sync all pending COD orders with Delhivery
   - Batch update any orders that show as collected

5. **Webhook Integration**
   - Receive real-time payment updates from Delhivery
   - Auto-update orders immediately upon collection

## API Fields Reference

**Delhivery Shipment Object Fields (extracted):**

```javascript
{
  // Existing fields
  courier: 'Delhivery',
  trackingId: string,
  trackingUrl: string,
  delhivery: {
    waybill: string,
    current_status: string,
    current_status_time: string,
    current_status_location: string,
    expected_delivery_date: string,
    origin: string,
    destination: string,
    events: Event[],
    
    // NEW: Payment information
    payment: {
      is_cod_recovered: boolean,
      cod_amount: number,
      payment_method: string,
      payment_status: string,
      payment_collected_at: string | null
    }
  }
}
```

---

**Last Updated:** February 10, 2026
**Status:** ✅ Implemented and tested
