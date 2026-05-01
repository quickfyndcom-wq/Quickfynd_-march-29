# COD-to-Prepaid Conversion with 5% Discount — Implementation Guide

**Date:** April 30, 2026  
**Feature:** Allow customers to convert pending COD orders to online payment with 5% discount  
**Status:** Specification & Implementation Roadmap

---

## Feature Overview

### Problem

Customers who place COD (Cash on Delivery) orders may want to **pay online later** instead of waiting for the courier. Currently, there's no way to convert a COD order to prepaid with incentive.

### Solution

Offer customers a **5% discount** if they convert a pending COD order to Razorpay/online payment within a time window (e.g., 24 hours of order placement).

### Expected User Flow

1. Customer places COD order → order status = `pending` or `processing`
2. Customer views order in app → sees "Pay Online & Save 5%" option
3. Customer clicks "Pay Now" → Razorpay overlay
4. Payment succeeds → order status changes to `paid`, discount is applied to refund/wallet

---

## Requirements

### Functional Requirements

- [ ] COD orders in `pending` or `processing` status can be converted
- [ ] Only within **24 hours** of order placement (configurable)
- [ ] 5% discount applied automatically when payment succeeds
- [ ] Discount can be:
  - Applied as **wallet credit**, OR
  - Shown as **refund** back to payment method, OR
  - Deducted from new total before Razorpay charge
- [ ] Order status transitions: `pending` → `processing` (payment initiated) → `paid` (after Razorpay verify)
- [ ] Email confirmation sent when conversion succeeds

### Non-Functional Requirements

- [ ] No changes to existing COD flow (backward compatible)
- [ ] Payment conversion timeout must be configurable per store
- [ ] Audit log every conversion attempt
- [ ] Works for both WEB and APP orders

---

## Data Model Changes

### Order Schema Addition

```javascript
// In models/Order.js, add to OrderSchema:

codConversion: {
  availableUntil: { type: Date },     // Deadline for conversion (24h after order)
  convertedAt: { type: Date },        // When user converted to prepaid
  discountApplied: { type: Number, default: 0 },  // 5% discount amount in ₹
  conversionPaymentId: { type: String }, // Razorpay payment ID of conversion
  conversionStatus: {
    type: String,
    enum: ['eligible', 'expired', 'converted', 'failed'],
    default: 'eligible'
  }
}
```

### Indexes

```javascript
// Add to Order model:
OrderSchema.index({
  "codConversion.availableUntil": 1,
  isGuest: 1,
});
```

---

## API Endpoints

### 1. Check Conversion Eligibility

```
GET /api/orders/:orderId/cod-conversion-status
```

**Headers:**

```
Authorization: Bearer <idToken>
```

**Response (200):**

```json
{
  "orderId": "order_id_123",
  "status": "pending",
  "paymentMethod": "COD",
  "total": 1000,
  "discountAmount": 50,
  "newTotal": 950,
  "codConversion": {
    "eligible": true,
    "reason": "Order is within 24h window",
    "availableUntil": "2026-05-01T10:00:00Z",
    "hoursRemaining": 23.5,
    "discountPercent": 5,
    "discountAmount": 50
  }
}
```

**Response (400) - Not Eligible:**

```json
{
  "eligible": false,
  "reason": "Conversion window expired (order placed 2 days ago)",
  "codConversion": {
    "expiredAt": "2026-04-30T10:00:00Z"
  }
}
```

### 2. Initiate COD-to-Prepaid Conversion

```
POST /api/orders/:orderId/convert-to-prepaid
```

**Headers:**

```
Authorization: Bearer <idToken>
x-order-source: APP
```

**Request:**

```json
{
  "discountApplication": "wallet" // or "refund", "deduct_from_total"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Conversion initiated. Proceed to payment.",
  "razorpayOrder": {
    "orderId": "order_razorpay_456",
    "amount": 950, // New total with 5% discount
    "currency": "INR",
    "key": "rzp_live_abc123"
  },
  "discountApplied": 50,
  "discountNote": "5% off for online payment"
}
```

**Response (400) - Not Eligible:**

```json
{
  "error": {
    "code": "COD_CONVERSION_NOT_ELIGIBLE",
    "message": "Order conversion window has expired or order is not COD"
  }
}
```

### 3. Verify COD-to-Prepaid Payment (Backend)

**Extend existing:** `POST /api/razorpay/verify`

**Additional fields in request:**

```json
{
  "razorpay_order_id": "order_razorpay_456",
  "razorpay_payment_id": "pay_xyz",
  "razorpay_signature": "...",
  "isApp": true,
  "orderSource": "APP",
  "codConversionOrderId": "order_id_123", // ← Reference to original COD order
  "discountApplication": "wallet"
}
```

**Backend logic:**

1. Verify Razorpay signature
2. Find original order by `codConversionOrderId`
3. Check conversion eligibility (still within 24h)
4. Create new Razorpay order record (or link to existing)
5. Mark original order: `codConversion.convertedAt`, `discountApplied = 50`, `status = paid`
6. Apply discount per `discountApplication`:
   - `wallet`: Add 50 to user's wallet
   - `refund`: Save for post-delivery refund
   - `deduct_from_total`: Reduce total by 50 (already done in Razorpay amount)
7. Send confirmation email

---

## Frontend Changes

### Mobile App (Flutter / React Native)

**Order Detail Screen:**

```dart
// Show COD-to-Prepaid offer if eligible
if (order.paymentMethod == "COD" &&
    order.status == "pending" &&
    order.codConversion?.eligible == true) {

  showCODConversionBanner(
    title: "Pay Online & Save 5%",
    savings: order.codConversion.discountAmount,
    newTotal: order.codConversion.newTotal,
    expiresIn: order.codConversion.hoursRemaining,
    onTapPayNow: () => initiateConversion(order.id),
  );
}
```

**Conversion Flow:**

```dart
void initiateConversion(String orderId) async {
  // 1. Get Razorpay order
  final response = await apiClient.post(
    '/api/orders/$orderId/convert-to-prepaid',
    body: {"discountApplication": "wallet"},
  );

  final razorpayOrder = response.data['razorpayOrder'];

  // 2. Open Razorpay checkout
  final result = await Razorpay.openCheckout(options: {
    'key': razorpayOrder.key,
    'order_id': razorpayOrder.orderId,
    'amount': razorpayOrder.amount,
    'name': 'Quickfynd',
    'description': 'Convert COD to Prepaid - 5% Off',
    'prefill': {
      'email': userEmail,
      'contact': userPhone,
    }
  });

  // 3. On success, verify with backend
  if (result.success) {
    await apiClient.post(
      '/api/razorpay/verify',
      body: {
        'razorpay_order_id': result.orderId,
        'razorpay_payment_id': result.paymentId,
        'razorpay_signature': result.signature,
        'codConversionOrderId': orderId,
        'discountApplication': 'wallet',
      }
    );

    showSnackbar('Order payment successful! 5% discount applied.');
    navigateTo('/orders/$orderId');
  }
}
```

### Web (React)

**Similar flow in checkout/order status page:**

```jsx
{
  order.paymentMethod === "COD" && order.codConversion?.eligible && (
    <Card className="cod-conversion-offer">
      <h3>💰 Save 5% by Paying Online Now</h3>
      <p>Save ₹{order.codConversion.discountAmount}</p>
      <p>New Total: ₹{order.codConversion.newTotal}</p>
      <p>
        Offer expires in {order.codConversion.hoursRemaining.toFixed(1)} hours
      </p>
      <button onClick={handlePayNow}>Pay Now with 5% Off</button>
    </Card>
  );
}
```

---

## Backend Implementation

### Step 1: Update Order Model

**File:** `models/Order.js`

```javascript
const OrderSchema = new mongoose.Schema(
  {
    // ... existing fields ...

    codConversion: {
      availableUntil: { type: Date },
      convertedAt: { type: Date },
      discountApplied: { type: Number, default: 0 },
      conversionPaymentId: { type: String },
      conversionStatus: {
        type: String,
        enum: ["eligible", "expired", "converted", "failed"],
        default: "eligible",
      },
    },
  },
  { timestamps: true },
);

OrderSchema.index({ "codConversion.availableUntil": 1, isGuest: 1 });
```

### Step 2: Create Conversion Check Endpoint

**File:** `app/api/orders/[orderId]/cod-conversion-status/route.js`

```javascript
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getAuth } from "@/lib/firebase-admin";

async function getAuthFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const userId = await getAuthFromRequest(request);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const order = await Order.findById(params.orderId).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.userId !== userId && !order.isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check eligibility
    const now = new Date();
    const isEligible =
      order.paymentMethod === "COD" &&
      (order.status === "pending" || order.status === "processing") &&
      order.codConversion?.conversionStatus !== "converted" &&
      (!order.codConversion?.availableUntil ||
        order.codConversion.availableUntil > now);

    if (isEligible) {
      const discountAmount = Math.round(order.total * 0.05);
      const hoursRemaining = order.codConversion?.availableUntil
        ? (order.codConversion.availableUntil - now) / (1000 * 60 * 60)
        : 24;

      return NextResponse.json({
        orderId: order._id,
        status: order.status,
        paymentMethod: "COD",
        total: order.total,
        discountAmount,
        newTotal: order.total - discountAmount,
        codConversion: {
          eligible: true,
          reason: "Order is within conversion window",
          availableUntil:
            order.codConversion?.availableUntil ||
            new Date(now.getTime() + 24 * 60 * 60 * 1000),
          hoursRemaining: Math.max(0, hoursRemaining),
          discountPercent: 5,
          discountAmount,
        },
      });
    } else {
      return NextResponse.json(
        {
          orderId: order._id,
          eligible: false,
          reason:
            order.paymentMethod !== "COD"
              ? "Order is not COD"
              : order.codConversion?.conversionStatus === "converted"
                ? "Order already converted to prepaid"
                : "Conversion window has expired",
          codConversion: {
            eligible: false,
            expiredAt: order.codConversion?.availableUntil,
          },
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 3: Create Conversion Initiate Endpoint

**File:** `app/api/orders/[orderId]/convert-to-prepaid/route.js`

```javascript
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getAuth } from "@/lib/firebase-admin";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function getAuthFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  try {
    const userId = await getAuthFromRequest(request);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const order = await Order.findById(params.orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify ownership
    if (order.userId !== userId && !order.isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check eligibility
    const now = new Date();
    const isEligible =
      order.paymentMethod === "COD" &&
      (order.status === "pending" || order.status === "processing") &&
      (!order.codConversion?.availableUntil ||
        order.codConversion.availableUntil > now);

    if (!isEligible) {
      return NextResponse.json(
        {
          error: {
            code: "COD_CONVERSION_NOT_ELIGIBLE",
            message: "Order is not eligible for COD conversion",
          },
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const discountAmount = Math.round(order.total * 0.05);
    const newTotal = order.total - discountAmount;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: newTotal * 100, // paise
      currency: "INR",
      receipt: `cod-convert-${order._id}`,
      notes: {
        orderId: order._id.toString(),
        discount: discountAmount,
        originalTotal: order.total,
      },
    });

    // Update order with conversion info
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        "codConversion.conversionStatus": "initiated",
        "codConversion.discountApplied": discountAmount,
        "codConversion.conversionPaymentId": razorpayOrder.id,
      },
    });

    console.info("[CODConversion] Initiated", {
      orderId: order._id,
      userId,
      originalTotal: order.total,
      discountAmount,
      newTotal,
      razorpayOrderId: razorpayOrder.id,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Conversion initiated. Proceed to payment.",
      razorpayOrder: {
        orderId: razorpayOrder.id,
        amount: newTotal,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      },
      discountApplied: discountAmount,
      discountNote: "5% off for online payment",
    });
  } catch (error) {
    console.error("[CODConversion] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 4: Update Razorpay Verify Endpoint

**File:** `app/api/razorpay/verify/route.js` (extend existing)

```javascript
// In the existing verify function, after payment verification:

if (body.codConversionOrderId) {
  // This is a COD-to-prepaid conversion
  const originalOrder = await Order.findById(body.codConversionOrderId);

  if (originalOrder) {
    const discountAmount = originalOrder.codConversion?.discountApplied || 0;

    // Apply discount based on preference
    if (body.discountApplication === "wallet") {
      // Add to user wallet
      await Wallet.findOneAndUpdate(
        { userId: userId },
        { $inc: { coins: Math.round(discountAmount / 10) } }, // e.g., 50 rupees = 5 coins
        { upsert: true },
      );
    }

    // Mark original order as converted
    await Order.findByIdAndUpdate(body.codConversionOrderId, {
      $set: {
        status: "paid",
        paymentMethod: "Razorpay",
        paymentStatus: "paid",
        isPaid: true,
        "codConversion.convertedAt": new Date(),
        "codConversion.conversionStatus": "converted",
        "codConversion.conversionPaymentId": razorpayPaymentId,
      },
    });

    console.info("[CODConversion] Completed", {
      orderId: originalOrder._id,
      userId,
      discountApplied: discountAmount,
      razorpayPaymentId,
      discountApplication: body.discountApplication,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Step 5: Add Order Initialization Logic

**File:** `app/api/orders/route.js` (extend existing POST handler)

```javascript
// When creating a COD order, set availableUntil:

if (paymentMethod === "COD") {
  const now = new Date();
  const availableUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  createdOrder.codConversion = {
    availableUntil,
    conversionStatus: "eligible",
  };
}
```

---

## QA & Testing Checklist

### Unit Tests

- [ ] Eligibility check: COD order within 24h → eligible = true
- [ ] Eligibility check: COD order > 24h → eligible = false
- [ ] Eligibility check: Non-COD order → eligible = false
- [ ] Eligibility check: Already converted order → eligible = false
- [ ] Discount calculation: 5% of ₹1000 = ₹50 ✓
- [ ] New total: ₹1000 - ₹50 = ₹950 ✓

### Integration Tests

- [ ] POST `/api/orders/:id/convert-to-prepaid` returns Razorpay order with new amount
- [ ] Razorpay charge amount = (originalTotal - discount) \* 100 (paise)
- [ ] After payment verify, order.status = 'paid'
- [ ] After payment verify, order.paymentMethod = 'Razorpay'
- [ ] Discount is added to wallet (if discountApplication = 'wallet')

### E2E Tests (Mobile App)

1. **Scenario: Place COD → Convert within 6 hours**
   - [ ] App shows "Pay Online & Save 5%" banner
   - [ ] User taps "Pay Now"
   - [ ] Razorpay opens with discounted amount
   - [ ] Payment succeeds
   - [ ] Order status changes to "Paid"
   - [ ] Confirmation email sent
   - [ ] Wallet shows +50 coins/rupees (if applicable)

2. **Scenario: Place COD → Try to convert after 25 hours**
   - [ ] App shows error: "Conversion window expired"
   - [ ] "Pay Now" button is disabled

3. **Scenario: Place COD → Cancel conversion**
   - [ ] User backs out of Razorpay
   - [ ] Order remains COD, no charge
   - [ ] "Pay Now" banner still visible

### Production Monitoring

- [ ] Track COD conversion attempts (success/failure rate)
- [ ] Monitor Razorpay errors during conversion
- [ ] Alert if >10% of conversion attempts fail
- [ ] Audit log all conversions with uid, amount, timestamp

---

## Deployment Steps

### Pre-Deployment

- [ ] Code reviewed and tested on staging
- [ ] Database migration tested (codConversion fields added)
- [ ] No backward compatibility issues

### Deployment

```bash
# 1. Update code
git pull origin main
npm run build

# 2. Deploy code
npm start  # or restart pod/container

# 3. Run DB migration to add codConversion indexes (optional, can be done in background)
# Or let MongoDB create indexes on first query (auto-created if not sparse)
```

### Post-Deployment

- [ ] Test on staging: Place COD → convert to prepaid
- [ ] Verify Razorpay integration works
- [ ] Check audit logs for conversions
- [ ] Monitor error rates

---

## Configuration

Add to `.env`:

```
# COD Conversion
COD_CONVERSION_WINDOW_HOURS=24
COD_CONVERSION_DISCOUNT_PERCENT=5
```

Use in code:

```javascript
const CONVERSION_WINDOW_HOURS = parseInt(
  process.env.COD_CONVERSION_WINDOW_HOURS || "24",
);
const DISCOUNT_PERCENT = parseInt(
  process.env.COD_CONVERSION_DISCOUNT_PERCENT || "5",
);
```

---

## Success Criteria

After deployment:

✅ Customers can see "Pay Online & Save 5%" offer on COD orders  
✅ Conversion completes without errors  
✅ 5% discount is applied correctly  
✅ Order status transitions from COD → Paid  
✅ Email confirmation sent  
✅ Audit logs show all conversions  
✅ <100ms API response time for eligibility check  
✅ No impact on existing COD flow (backward compatible)

---

## Questions?

Refer to:

- Razorpay Integration: See IMPLEMENTATION_PAYMENT_SYSTEM.md
- Order API: See MOBILE_API_HANDOFF.md
- Wallet System: Check models/Wallet.js
