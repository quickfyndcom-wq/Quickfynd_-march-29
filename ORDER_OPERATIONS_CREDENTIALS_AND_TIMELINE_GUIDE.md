# Order Operations, Credentials, and Tracking Timeline Guide

This guide documents the current backend implementation for:

- Order cancellation
- Return / replacement requests
- Tickets (customer support)
- Wallet credit/deduct flows
- Stock correction rules
- Delivery tracking timeline (Delhivery + India Post + 17track fallback)

It is intended for backend, web, and mobile teams.

---

## 1. Authentication Model

Most protected APIs require:

- Header: `Authorization: Bearer <firebase_id_token>`

Identity validation:

- Customer APIs verify Firebase user identity (`getAuth().verifyIdToken`)
- Seller APIs additionally verify store ownership via `authSeller(...)`

---

## 2. Credentials / Environment Variables

### Firebase (required)

Used for token verification and seller/customer authorization.

Required across protected routes:

- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) OR equivalent Firebase Admin config
- `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT` (auto-derived in some routes)

Some seller return-request routes explicitly use:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Tracking Providers

Delhivery:

- `DELHIVERY_API_TOKEN`

India Post direct API:

- `INDIAPOST_USERNAME`
- `INDIAPOST_PASSWORD`
- Optional:
  - `INDIAPOST_API_BASE_URL`
  - `INDIAPOST_MASTERDATA_BASE_URL`

17track fallback:

- `SEVENTEENTRACK_API_KEY`
- Optional:
  - `SEVENTEENTRACK_API_URL`
- Also supports per-store integration keys from store settings:
  - `baseUrl`, `apiKey`, `publicKey`, `secretKey`

### App base URL (notification calls)

Some seller update flows call internal notification routes using:

- `NEXT_PUBLIC_APP_URL`

---

## 3. Order Cancel Flow

### Customer cancel API

- Route: `POST /api/orders/cancel`
- File: `app/api/orders/cancel/route.js`

Inputs:

- `orderId` (required)
- `reason` (optional)

Rules:

- Only order owner/guest-email owner can cancel
- Allowed statuses: `ORDER_PLACED`, `CONFIRMED`, `PROCESSING`, `PICKUP_REQUESTED`, `WAITING_FOR_PICKUP`

Effects:

- `order.status = CANCELLED`
- `order.cancelledBy = CUSTOMER`
- `order.cancelReason = reason` (if provided)
- Inventory restock is executed once (see stock rules)
- Cancel email sent (best effort)

---

## 4. Return / Replacement Flow

### Customer request

- Route: `POST /api/orders/return-request`
- File: `app/api/orders/return-request/route.js`

Inputs:

- `orderId`
- `itemIndex`
- `reason`
- `type` (`RETURN` or `REPLACEMENT`, default `RETURN`)
- `description` (optional)
- `images` (optional)

Rules:

- Order must belong to user
- Order status must be `DELIVERED`

Data update:

- Appends to `order.returns[]` with `status = REQUESTED`

### Customer fetch returns

- Route: `GET /api/orders/return-request`

---

## 5. Seller Return Approval/Rejection

### Primary seller route (order-embedded returns)

- Route: `POST /api/store/return-requests`
- File: `app/api/store/return-requests/route.js`

Action payload:

- `orderId`
- `returnIndex`
- `action` = `APPROVE` or `REJECT`
- `rejectionReason` (required for reject)

Effects:

- Updates `order.returns[returnIndex].status`
- Adds timestamps (`approvedAt` / `rejectedAt`)

### Alternate seller route (ReturnRequest model)

- Route: `PUT /api/store/return-requests/[id]`
- File: `app/api/store/return-requests/[id]/route.js`

Note:

- This updates `ReturnRequest` model status directly.
- Project currently has both order-embedded and separate return-request model paths.

---

## 6. Seller Order Status Update (Cancel/Return Impact)

- Route: `POST /api/store/orders/update-status`
- File: `app/api/store/orders/update-status/route.js`

Payload:

- `orderId`
- `status`
- Optional for cancel:
  - `cancelledBy`
  - `cancelReason`

Important stock effects:

- If status transitions to `CANCELLED`: restock once
- If status transitions to `RETURNED`: restock once

Payment effects:

- `CANCELLED` / `PAYMENT_FAILED` mark payment failed/unpaid
- COD delivered can mark paid

---

## 7. Dedicated Cancellation Metadata Save

- Route: `POST /api/store/orders/update-cancellation`
- File: `app/api/store/orders/update-cancellation/route.js`

Purpose:

- Update cancellation metadata for already cancelled orders

Payload:

- `orderId`
- `cancelledBy` (`CUSTOMER`, `SELLER`, `SYSTEM`, `UNDELIVERABLE_PINCODE`, `OTHER`)
- `cancelReason`

Rule:

- Order must already be `CANCELLED`

---

## 8. Ticket / Support Flows

### Customer

- `GET /api/tickets` -> list own tickets
- `POST /api/tickets` -> create ticket
- `GET /api/tickets/[ticketId]` -> ticket details (if route used)

File(s):

- `app/api/tickets/route.js`

Ticket fields:

- `subject`
- `category` (normalized to valid labels)
- `description`
- `priority`
- optional `orderId`

### Seller/Admin

- `GET /api/store/tickets` -> fetch all tickets
- `PATCH /api/store/tickets/[ticketId]/status` -> status update
- `POST /api/store/tickets/[ticketId]/reply` -> reply to customer

---

## 9. Wallet Flows

### Customer wallet

- `GET /api/wallet` -> coins + rupee value + transactions
- `POST /api/wallet/bonus` -> one-time welcome bonus

### Seller/admin wallet operations

- `POST /api/store/customers/wallet` -> credit customer wallet
- `POST /api/store/customers/wallet/deduct` -> deduct customer wallet

All wallet updates are transaction-logged in `Wallet.transactions`.

---

## 10. Stock Correction Rules (Current Implementation)

Implemented via:

- `lib/orderInventory.js`
- Order flags in `models/Order.js`:
  - `inventoryRestock.cancelled`
  - `inventoryRestock.returned`

Rules:

1. Order placement reduces stock (existing checkout flow)
2. Cancel restores stock once
3. Returned restores stock once
4. Duplicate status updates do not double-restock because of flags

Variant handling:

- If item has `variantOptions`, matching variant stock is increased
- Otherwise `product.stockQuantity` is increased
- `inStock` recalculated after update

---

## 11. Delivery Tracking Timeline (Operational)

Primary read route:

- `GET /api/track-order`
- File: `app/api/track-order/route.js`

Lookup sequence:

1. If `carrier=delhivery` + `awb` -> direct Delhivery fetch
2. Else try order lookup by:
   - `trackingId`, `awb`, `airwayBillNo`
   - ObjectId
   - `shortOrderNumber`
   - phone fallback
3. If order found and courier is Delhivery -> normalized Delhivery tracking
4. If courier is India Post:
   - India Post direct API first (if creds available)
   - fallback to 17track

Timeline fields returned:

- Delhivery: `order.delhivery.events[]` (newest first)
- India Post/17track: `order.indiaPost.events[]` (newest first)

Expected date fields:

- `delhivery.expected_delivery_date`
- fallback: `delhivery.expected_return_date`

Recommended UI status progression:

- `ORDER_PLACED`
- `PROCESSING`
- `MANIFESTED`
- `PICKUP_SCHEDULED`
- `SHIPPED`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- Exception paths: `CANCELLED`, `RTO`, `RETURNED`

---

## 12. Suggested Mobile Implementation Sequence

1. Use `/api/orders` (or relevant order list API) for base order data
2. For tracking screen, call `/api/track-order?awb=<trackingId>`
3. Render timeline from normalized events
4. Render expected date using delivery then return fallback
5. For cancel action, call `/api/orders/cancel`
6. For returns, call `/api/orders/return-request`
7. For support, use `/api/tickets`
8. For wallet, use `/api/wallet` and `/api/wallet/bonus`

---

## 13. Quick QA Checklist

Cancel and stock:

- Place order qty 1 -> stock down by 1
- Cancel -> stock up by 1
- Repeat cancel update -> stock should not increase again

Return and stock:

- Delivered order qty 1 -> return request -> approve -> set `RETURNED`
- Stock increases by 1 once

Tracking:

- Delhivery AWB returns events + expected date
- India Post works with direct creds
- If direct fails, 17track fallback returns normalized events

Ticket:

- Customer can create ticket
- Seller can update status and reply

Wallet:

- Admin credit/deduct reflected in customer wallet transaction list

---

## 14. Customer Order Details Page Parity (For App)

This section lists all details currently shown in the customer order details UI so mobile can match web behavior.

Source UI:

- `app/dashboard/orders/OrdersPageClient.jsx`

### 14.1 Top Summary Card (Collapsed State)

Show these fields for each order card:

- Display order number (5-digit display helper)
- Full order ID copy action
- Order date
- Total item count
- Order total amount
- Order status badge
- Payment badge:
  - `Paid`
  - `Pending`
  - `N/A` for `CANCELLED`, `RETURNED`, `RTO`, `PAYMENT_FAILED`
- Track Order button (only when `trackingUrl` exists)
- View Details / Hide Details toggle

### 14.2 Expanded Order Details Blocks

When user opens an order, show all blocks below.

#### A. Return/Replacement Request Status

If `order.returns[]` exists:

- For each return request:
  - Type (`RETURN` / `REPLACEMENT`)
  - Requested date-time
  - Current status (`REQUESTED`, `APPROVED`, `REJECTED`)
  - Reason
  - Optional description
  - If rejected: rejection reason + quick actions

Status helper messages:

- `REQUESTED`: under review message
- `APPROVED`: approved message
- `REJECTED`: show rejection reason and support CTA

#### B. Return/Replace Action Button

Show `Return/Replace Item` when:

- order status is `DELIVERED` or `OUT_FOR_DELIVERY`
- no active return in `REQUESTED` or `APPROVED`

#### C. Cancel Order Action

Show `Cancel This Order` only when cancellable:

- order status in: `ORDER_PLACED`, `CONFIRMED`, `PROCESSING`, `PICKUP_REQUESTED`, `WAITING_FOR_PICKUP`
- and tracking status does not indicate shipped/transit/delivered/returned/cancelled

Cancel modal fields:

- reason (required)
- additional note (optional)

Submission API:

- `POST /api/orders/cancel`

#### D. Payment Summary Block

Show:

- subtotal (`total - shippingFee`)
- shipping fee (if > 0)
- coupon discount (if applied)
- final total
- payment method
- payment status badge (`PAID`, `PENDING`, `N/A`)

COD-specific behavior:

- show `Awaiting payment at delivery` when unpaid COD and eligible status
- show CTA to convert COD to online payment
- show Delhivery COD recovered confirmation when available

#### E. Delivered-Only Actions

For `DELIVERED` orders show:

- download invoice
- rate delivery (if not yet reviewed)
- create support ticket
- open ticket details page

#### F. Delivery Review (If Submitted)

If `order.deliveryReview.reviewed` is true, show:

- rating (1-5)
- feedback text
- agent behavior
- package condition
- optional damage photo URL
- submitted date
- edit rating action

#### G. Order Items Block

For each item:

- product image
- product name
- SKU (if present)
- quantity
- unit price
- line total

Delivered order item actions:

- write product review
- create item-level support ticket

#### H. Live Delivery Tracking Block

Show block when any exists:

- `trackingId`
- `trackingUrl`
- `courier`
- `delhivery`

Display elements:

- current location (`delhivery.current_status_location`)
- current status (`delhivery.current_status` or order status)
- status remarks (if any)
- expected delivery date
- courier name
- tracking ID
- track external link

Tracking timeline:

- Use `order.delhivery.events[]` in newest-first display
- each event: status, timestamp, location, remarks

Fallback message:

- show waiting message if no events/location available yet

#### I. India Post Specific Tracking Block

When courier includes India Post:

- AWB number
- status label and delivered flag
- provider tips message (if provided)
- delivered time
- current location
- timeline events from `order.indiaPost.events[]`
- external links:
  - India Post tracking page
  - 17track page

#### J. Shipping Address Block

Show:

- recipient name
- street
- city/state/zip
- country
- phone

Fallback:

- if address object missing and `addressId` exists, show address ID

### 14.3 Customer Order Details API Dependencies

Mobile order-details page should call and combine these APIs:

1. `GET /api/orders` for base order list/details
2. `GET /api/track-order?awb=<trackingId>` for live tracking refresh
3. `POST /api/orders/cancel` for cancel action
4. `POST /api/orders/return-request` for return/replacement requests
5. `POST /api/tickets` for support ticket creation
6. `POST /api/orders/delivery-review` for delivery experience rating

Optional related:

- `/api/razorpay/order` + `/api/razorpay/verify` for COD-to-online conversion
- `/api/upload` for return proof files and delivery damage photo

### 14.4 Mobile Rendering Priority (Recommended)

Load order details in this order for better UX:

1. Summary card (instant)
2. Payment summary + items + shipping address
3. Return/cancel/support actions
4. Tracking block and timeline
5. Delivery review and secondary actions

### 14.5 Data Contract Snapshot For App Team

Use this as a reference shape (fields may be optional based on order state):

```json
{
  "_id": "orderId",
  "shortOrderNumber": 54213,
  "status": "OUT_FOR_DELIVERY",
  "total": 999,
  "shippingFee": 40,
  "paymentMethod": "cod",
  "paymentStatus": "pending",
  "isPaid": false,
  "trackingId": "46671410006252",
  "trackingUrl": "https://...",
  "courier": "Delhivery",
  "shippingAddress": {
    "name": "Customer Name",
    "street": "Address line",
    "city": "City",
    "state": "State",
    "zip": "000000",
    "country": "India",
    "phone": "9999999999"
  },
  "orderItems": [
    {
      "quantity": 1,
      "price": 499,
      "productId": {
        "_id": "productId",
        "name": "Product Name",
        "sku": "SKU001",
        "images": ["https://..."]
      }
    }
  ],
  "returns": [
    {
      "type": "RETURN",
      "status": "REQUESTED",
      "reason": "Defective Product",
      "description": "...",
      "requestedAt": "2026-01-01T10:00:00.000Z",
      "rejectionReason": "..."
    }
  ],
  "deliveryReview": {
    "reviewed": true,
    "rating": 5,
    "feedback": "Great",
    "agentBehavior": "POLITE",
    "packageCondition": "INTACT",
    "damagePhotoUrl": "",
    "submittedAt": "2026-01-01T10:00:00.000Z"
  },
  "delhivery": {
    "current_status": "OUT_FOR_DELIVERY",
    "current_status_location": "Mumbai",
    "current_status_remarks": "Out for delivery",
    "expected_delivery_date": "2026-01-02T11:00:00.000Z",
    "events": [
      {
        "status": "OUT_FOR_DELIVERY",
        "time": "2026-01-02T08:30:00.000Z",
        "location": "Mumbai",
        "remarks": "Reached destination hub"
      }
    ],
    "payment": {
      "is_cod_recovered": false,
      "cod_amount": 999
    }
  },
  "indiaPost": {
    "statusLabel": "In Transit",
    "isDelivered": false,
    "providerTips": "...",
    "deliveredAt": null,
    "currentLocation": "...",
    "events": [
      {
        "time": "...",
        "description": "...",
        "location": "..."
      }
    ]
  }
}
```
