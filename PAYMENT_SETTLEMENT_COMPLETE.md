# Complete Payment Settlement System - Overview

**Last Updated:** February 10, 2026  
**Status:** ✅ Fully Implemented and Live

## System Overview

This document provides a high-level overview of the complete payment settlement system covering:
1. **COD (Cash on Delivery)** - Delhivery Collection Tracking
2. **Card Payments** - Razorpay Settlement Tracking

## Payment Method Matrix

| Payment Method | Collection By | When Marked as PAID | Auto-Update Trigger | UI Display |
|---|---|---|---|---|
| COD | Delhivery Rider | When delivered OR rider collects | Status = DELIVERED or `Delhivery.payment.is_cod_recovered` | "✓ Collected by Delhivery" or "⏳ Awaiting delivery" |
| Card (Razorpay) | Instant | When payment captured | `payment.captured` webhook | "✓ Transferred to Bank" or "⏳ Pending transfer" |

## Feature Comparison

### COD Payment (Delhivery)
```
┌─ Customer Places Order (COD)
│  ├─ Status: ORDER_PLACED
│  └─ Payment: Pending (rider will collect)
│
├─ Order Shipped (Tracking Added)
│  ├─ Status: SHIPPED/IN_TRANSIT
│  └─ Delhivery tracks package
│
├─ Out for Delivery
│  ├─ Status: OUT_FOR_DELIVERY
│  ├─ Rider receives package
│  └─ Payment: Still Pending
│
└─ Payment Collection (One of two ways):
   ├─ METHOD A: Admin updates status to DELIVERED
   │  └─ System auto-marks: isPaid = true ✓
   │
   └─ METHOD B: Delhivery API reports collection
      ├─ Rider collects ₹X from customer
      ├─ Delhivery API: is_cod_recovered = true
      ├─ Auto-fetch updates order
      └─ System auto-marks: isPaid = true ✓
```

**Key Files:**
- `lib/delhivery.js` - Extracts `payment.is_cod_recovered`
- `app/api/store/orders/update-status/route.js` - Auto-mark on status update
- `app/(public)/orders/OrdersClient.jsx` - Auto-mark on fetch
- Display: Green badge "✓ Payment Collected by Delhivery" with amount

---

### Card Payment (Razorpay)
```
┌─ Customer Initiates Payment
│  ├─ Selects Card/NetBanking/Wallet
│  └─ Redirected to Razorpay
│
├─ Payment Captured (Instant)
│  ├─ Amount: ₹X from customer account
│  ├─ Status: CAPTURED (in Razorpay)
│  ├─ [WEBHOOK] payment.captured event
│  ├─ Order updated: isPaid = true ✓
│  └─ Payment Status: CAPTURED (green badge)
│
└─ Settlement to Bank Account (T+1 to T+2 days)
   ├─ Razorpay processes settlement
   ├─ Deducts processing fee (approx ₹30-40 per transaction)
   ├─ [WEBHOOK] transfer.created event
   ├─ Order updated: is_transferred = true ✓
   ├─ Settlement Status: TRANSFERRED (green badge)
   └─ Amount reaches merchant bank account
```

**Key Files:**
- `lib/razorpay.js` - Razorpay API integration
- `app/api/orders/check-razorpay-settlement/route.js` - Customer check
- `app/api/store/orders/check-razorpay-settlement/route.js` - Admin check
- `app/api/webhooks/razorpay/route.js` - Real-time webhook handler
- Display: Blue badge "💳 Card Payment" with "✓ Transferred" or "⏳ Pending"

---

## Admin Dashboard Features

### Store Orders Page (`/store/orders`)

#### Order List View
Shows payment status for each order:
- **COD Orders**
  - Status badge: "Pending" (red) or "✓ Paid" (green)
  - Condition: COD + DELIVERED = Paid
  
- **Card Payment Orders**
  - Status badge: "Pending" (red) or "✓ Paid" (green)
  - Condition: payment.captured = Paid

#### Order Detail Modal
When clicking on an order:

1. **Payment Method & Status Section**
   ```
   Payment Method: [COD / Card Payment]
   Payment Status: [Pending / ✓ Paid]
   ```

2. **COD Payment Info (if applicable)**
   ```
   ✓ Payment Collected by Delhivery
   Amount: ₹[value]
   Collected: [date]
   ```
   (Only shows if Delhivery reports collection)

3. **Card Payment Info (if applicable)**
   ```
   💳 Card Payment (Razorpay)
   Payment ID: [last 8 chars]
   ✓ Transferred to Bank Account    [or]  ⏳ Pending transfer
   [Check Settlement Status] button
   ```

### Admin Actions

#### Check Razorpay Settlement
Clicking "Check Settlement Status" button:
- Fetches latest status from Razorpay API
- Auto-updates database if new info available
- Shows detailed toast:
  ```
  💳 Razorpay Payment Status
  Amount: ₹5000
  Status: ✓ Captured
  Fee: ₹297
  Settlement: TRANSFERRED
  Transfer ID: trf_xxx
  Amount: ₹4703
  ```

#### Auto-Sync from Delhivery
"Sync Status from Tracking" button:
- Fetches live tracking from Delhivery
- Updates order status (DELIVERED, etc.)
- Auto-marks COD as PAID if delivered
- Shows timeout handling (10 sec limit)

---

## Customer View Features

### Order Pages (`/orders`, `/dashboard/orders`)

#### Payment Summary Card
Shows for each order:
1. **Payment Method**
   - COD: "💵 Cash on Delivery"
   - Card: Card type / Provider

2. **Payment Status Badge**
   - Red "⏳ PENDING": Still awaiting payment
   - Green "✓ PAID": Payment collected/confirmed

3. **COD Status Details (if COD)**
   - "✓ Payment collected from customer"
   - "⏳ Awaiting payment at delivery"
   - "Rider will collect ₹[X] during delivery"

4. **Delhivery Collection Alert (if applicable)**
   - Green box: "✓ Payment Confirmed by Delhivery"
   - Shows amount collected by courier

5. **Bank Transfer Info (if card payment)**
   - Shows transfer status
   - Shows transfer date/ID when available

---

## Data Fields Storage

### Order Database Schema

```javascript
// Core payment fields
paymentMethod: "COD" | "CARD" | "STRIPE"
paymentStatus: "CAPTURED" | "PENDING" | "FAILED"
isPaid: boolean  // Main flag for payment collection

// Delhivery COD tracking
delhivery: {
  payment: {
    is_cod_recovered: boolean,         // Has rider collected?
    cod_amount: number,                // Amount collected
    payment_method: string,  
    payment_status: string,
    payment_collected_at: date         // When collected
  }
}

// Razorpay settlement tracking
razorpayPaymentId: string              // Payment ID from Razorpay
razorpayOrderId: string                // Order ID from Razorpay
razorpaySettlement: {
  paymentId: string,
  status: "TRANSFERRED" | "PENDING" | "FAILED",
  captured_at: date,                   // When payment captured
  amount: number,                      // Amount captured
  fee: number,                         // Processing fee
  is_transferred: boolean,             // Transferred to bank?
  transferred_at: date,                // When transferred
  transfer_id: string,                 // Transfer ID
  amount_transferred: number,          // Amount reached bank
  recipient_id: string                 // Bank account ID
}
```

---

## Automatic Update Mechanisms

### 1. **Order Status Page Load**
When order page loads:
- Fetch latest tracking from Delhivery API
- Extract payment collection status
- Auto-mark COD orders as PAID if `is_cod_recovered = true`
- Auto-mark COD orders as PAID if status = DELIVERED

### 2. **Auto-Refresh Every 30 Seconds**
When customer expands an order:
- Every 30 seconds, fetch fresh Delhivery tracking
- Update payment collection status silently
- Auto-mark as PAID if rider collected
- Update UI without page reload

### 3. **Razorpay Webhooks (Real-Time)**
When events occur on Razorpay side:
- `payment.captured` → Order marked as PAID
- `transfer.created` → Settlement tracked, amount recorded
- `payment.failed` → Order marked as failed
- All automatic, no manual intervention needed

### 4. **Manual Admin Check**
Admin can click "Check Settlement Status":
- Fetches latest from Razorpay API
- Updates database if new info
- Shows detailed status to admin
- Useful for troubleshooting or verification

---

## Payment Status Decision Tree

### For COD Orders:
```
Is order.paymentMethod === "COD"?
├─ YES: Check multiple conditions
│   ├─ Is status = "DELIVERED"?
│   │  └─ YES: PAID ✓
│   ├─ Is delhivery.payment.is_cod_recovered = true?
│   │  └─ YES: PAID ✓
│   └─ Otherwise: PENDING ✗
└─ NO: Not a COD order
```

### For Card Orders:
```
Is order.paymentMethod = "CARD"?
├─ YES: Check payment status
│   ├─ Has razorpayPaymentId?
│   │  ├─ YES: Fetch from Razorpay API
│   │  │   ├─ Payment captured?
│   │  │   │  └─ YES: PAID ✓
│   │  │   └─ Otherwise: PENDING ✗
│   │  └─ NO: Check order.isPaid flag
│   │     ├─ TRUE: PAID ✓
│   │     └─ FALSE: PENDING ✗
└─ NO: Not a card order
```

---

## Error Handling

### Timeout Issues
- Fixed 10-second timeout for Delhivery API calls
- Shows user-friendly error if timeout occurs
- Allows retry without page reload

### Missing Razorpay ID
- Error message: "This order does not have a Razorpay payment"
- Button disabled/hidden for non-card orders

### Webhook Failures
- Signature validation prevents invalid requests
- Detailed logging for debugging
- System retries webhook delivery (Razorpay standard)

### API Failures
- Graceful error handling with user feedback
- Order data not lost even if API fails
- Manual check button allows retry

---

## Integration Points

### Checkout Flow
When customer selects payment method:
1. **COD Selected** → Order created with `paymentMethod = "COD"`
2. **Card Selected** → Redirected to Razorpay gateway
   - Customer pays → Razorpay returns payment ID
   - Payment ID stored in `razorpayPaymentId`
   - Order created with `paymentMethod = "CARD"`

### Order Status Updates
Admin updates order status:
- Auto-checks if COD + DELIVERED
- Auto-marks `isPaid = true`
- Checks if Delhivery reported collection
- Auto-marks `isPaid = true`

### Email Notifications
When payment status changes:
- "Payment Confirmed" email sent to customer
- Shows payment method and status
- Links to order tracking

### Rewards Program
When order marked as PAID:
- Coins credited to customer wallet (5% of order value)
- Visible in customer dashboard

---

## Monitoring & Analytics

### What Admins Can See
- Total PAID vs PENDING payments
- PENDING_PAYMENT filter in order list
- Settlement status for each order
- Payment method breakdown
- Processing fees deducted

### What Customers Can See
- Payment status on each order
- When COD will be collected
- When bank transfer will occur
- Collection confirmation from Delhivery
- Transfer confirmation from Razorpay

---

## Testing Checklist

- [ ] COD order shows "Pending" initially
- [ ] COD order marked as PAID when status = DELIVERED
- [ ] COD order marked as PAID when Delhivery reports collection
- [ ] Card payment shows "Pending" before capture
- [ ] Card payment marked as PAID when payment.captured
- [ ] Admin can click "Check Settlement Status"
- [ ] Settlement status button updates UI correctly
- [ ] Auto-refresh updates COD payment status every 30 seconds
- [ ] Razorpay webhooks auto-update orders in real-time
- [ ] Timeout errors handled gracefully
- [ ] Case-insensitive matching works for mixed-case data
- [ ] Both COD and Card payment badges display correctly

---

## Performance Considerations

- **Auto-refresh**: Batched to 1 request per 30 seconds per order
- **Webhook processing**: Non-blocking, async
- **API calls**: Uses AbortController for timeout management
- **Database queries**: Indexed on payment IDs for fast lookup
- **Cache**: Settlement data stored locally, reduces API calls

---

## Compliance & Security

- **Razorpay**: PCI DSS Level 1 compliant
- **Webhook verification**: HMAC-SHA256 signature validation
- **Data privacy**: No sensitive card data stored locally
- **Audit trail**: Payment IDs logged for troubleshooting
- **Encryption**: Settlement amounts encrypted at rest

---

**Next Steps:**

1. Test both payment methods in production
2. Monitor webhook delivery logs
3. Verify settlements reach bank account within 2 days
4. Set up automated alerts for payment failures
5. Train admin team on "Check Settlement Status" feature

