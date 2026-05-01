# Mobile App Guide: Order History, Tracking, and Account Details

Last Updated: 2026-04-30
Owner: Quickfynd Backend Team

Standalone companion doc:

- `MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md`

## 1) Purpose

This document is for mobile app developers to implement:

- Order placement (COD + prepaid)
- Correct source tagging as APP (not WEB)
- Order history after login (including previous guest orders)
- Full order tracking details (status, timeline/history, delivered time, current location)
- Account details (profile + addresses)

Base URL: `https://quickfynd.com`
API prefix: `/api`

---

## 2) Authentication

Protected endpoints require Firebase ID token:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Public tracking endpoint does not require token.

---

## 3) IMPORTANT: Mark Mobile Orders as APP

To ensure orders are saved as `orderSource: APP`, pass APP markers in both body and headers.

### 3.1 Required headers for order-related calls

```http
x-order-source: APP
x-client-platform: APP
```

### 3.2 Recommended body fields

```json
{
  "orderSource": "APP",
  "source": "APP",
  "platform": "APP",
  "isApp": true,
  "clientApp": "android"
}
```

Use at least one body marker + the two headers above.

### 3.4 Do we need a separate API for app source?

No. A separate API is not required.

Use the same endpoints and always send source markers from app code.

### 3.5 App code snippet (required in mobile client)

Use this request config for both COD (`/api/orders`) and prepaid verify (`/api/razorpay/verify`):

```javascript
const sourceHeaders = {
  "Content-Type": "application/json",
  "x-order-source": "APP",
  "x-client-platform": "APP",
  "x-app-platform": Platform.OS, // android or ios
  "x-mobile-app": "quickfynd-app",
};

const sourceBody = {
  orderSource: "APP",
  source: "APP",
  platform: "APP",
  isApp: true,
  isMobileApp: true,
  clientApp: Platform.OS,
  channel: "mobile_app",
  meta: {
    isApp: true,
    platform: "APP",
    clientApp: Platform.OS,
  },
};
```

For prepaid verify, include these in `paymentPayload` too.

### 3.3 Why mobile order may still show as WEB

Common reasons:

- App request did not send `x-order-source: APP` and `x-client-platform: APP`.
- App payload did not include source markers (`orderSource`, `source`, `platform`, `isApp`, `clientApp`).
- `isApp` sent as string (`"true"`) instead of boolean (`true`).
- Razorpay verify call (`POST /api/razorpay/verify`) was sent without APP markers in headers/body.
- App is placing order via an intermediate proxy/cloud function/webview layer that strips custom headers.
- Older orders were created before APP source markers were added in app.

Backend now also accepts these APP signals:

- `isApp`/`isMobileApp` as boolean OR string (`true`, `"true"`, `1`, `"1"`, `yes`)
- Alternate headers: `x-app-platform`, `x-mobile-platform`, `x-mobile-app`
- Nested payload markers under `meta` (example: `meta.platform`, `meta.orderSource`, `meta.isApp`)

Important:

- For prepaid flow, source must be marked on the verify call itself because final order is created from that request.

---

## 4) Place Order (COD and Guest/Logged-In)

Endpoint:

- `POST /api/orders`

### 4.1 Logged-in COD example

```json
{
  "addressId": "<address_id>",
  "items": [{ "id": "<product_id>", "quantity": 1 }],
  "paymentMethod": "COD",
  "isGuest": false,
  "orderSource": "APP",
  "source": "APP",
  "isApp": true
}
```

### 4.2 Guest COD example

```json
{
  "isGuest": true,
  "paymentMethod": "COD",
  "items": [{ "id": "<product_id>", "quantity": 1 }],
  "guestInfo": {
    "name": "Guest User",
    "email": "guest@example.com",
    "phone": "9876543210",
    "address": "Street address",
    "city": "City",
    "state": "State",
    "country": "India",
    "pincode": "560001"
  },
  "orderSource": "APP",
  "source": "APP",
  "isApp": true
}
```

Guest `guestInfo` required fields:

- `name`
- `email`
- `phone`
- `address` (or `street`)
- `city`
- `state`
- `country`
- `pincode` or `zip` (must be valid, not blank/zero)

### 4.3 Success response

```json
{
  "message": "Orders Placed Successfully",
  "id": "<order_id>",
  "orderId": "<order_id>",
  "order": {
    "_id": "<order_id>",
    "shortOrderNumber": 55234,
    "status": "ORDER_PLACED",
    "paymentMethod": "COD",
    "orderSource": "APP"
  }
}
```

---

## 5) Prepaid Flow (Razorpay)

### 5.1 Create Razorpay order

- `POST /api/razorpay/order`

Body:

```json
{
  "amount": 1499,
  "currency": "INR",
  "receipt": "order_123"
}
```

### 5.2 Verify payment and create real order

- `POST /api/razorpay/verify`

Pass APP markers in headers (`x-order-source`, `x-client-platform`) and in `paymentPayload` fields.

Body example:

```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "paymentPayload": {
    "token": "<firebase_id_token>",
    "addressId": "<address_id>",
    "items": [{ "id": "<product_id>", "quantity": 1 }],
    "paymentMethod": "CARD",
    "orderSource": "APP",
    "source": "APP",
    "isApp": true,
    "clientApp": "android"
  }
}
```

For guest prepaid flow, set:

- `paymentPayload.isGuest = true`
- `paymentPayload.guestInfo = {...}`

Prepaid source note:

- Always send APP markers in `POST /api/razorpay/verify` headers and inside `paymentPayload`.
- If omitted, backend may fall back to WEB.

---

## 6) Order History API (Includes Guest Orders After Login)

Endpoint:

- `GET /api/orders?limit=20&offset=0` (Protected)

What backend does automatically:

- Reads logged-in token email and phone
- Finds matching guest orders
- Auto-links them to logged-in `userId`
- Returns merged order history

Result:

- If user placed guest orders earlier with same email/phone, those orders appear in account history after login

### 6.1 Order list response shape

```json
{
  "orders": [
    {
      "_id": "...",
      "shortOrderNumber": 55234,
      "status": "DELIVERED",
      "paymentMethod": "COD",
      "paymentStatus": "PAID",
      "isPaid": true,
      "orderSource": "APP",
      "shippingAddress": {
        "name": "...",
        "phone": "...",
        "street": "...",
        "city": "...",
        "state": "...",
        "zip": "..."
      },
      "trackingId": "...",
      "courier": "Delhivery",
      "trackingUrl": "...",
      "orderItems": [
        {
          "productId": { "_id": "...", "name": "...", "images": ["..."] },
          "price": 499,
          "quantity": 1
        }
      ]
    }
  ]
}
```

### 6.2 Optional manual fallback endpoint

- `POST /api/user/link-guest-orders` (Protected)

Body:

```json
{
  "email": "user@example.com",
  "phone": "9876543210"
}
```

Use only as fallback if your app wants explicit linking action. Normal history API already auto-links.

---

## 7) Tracking API (History + Delivered Time + Current Place)

Endpoint (Public):

- `GET /api/track-order?orderId=<order_id_or_short_order_number>`
- `GET /api/track-order?awb=<awb>`
- `GET /api/track-order?phone=<phone>`

### 7.1 Delhivery fields to show in app

From `order.delhivery`:

- `current_status`
- `current_status_time`
- `current_status_location`
- `events[]`
- `payment.is_cod_recovered`

`events[]` item:

- `time`
- `status`
- `location`
- `remarks`

### 7.2 India Post fields to show in app

From `order.indiaPost`:

- `statusLabel`
- `isDelivered`
- `deliveredAt`
- `currentLocation`
- `events[]`

`events[]` item:

- `time`
- `description`
- `location`
- `country`

Backend behavior:

- For India Post live delivery, backend can update order status to `DELIVERED` when tracking confirms delivery.

---

## 8) Account Details APIs (Profile + Address)

### 8.1 Profile

- `GET /api/profile` (Protected)
- `PATCH /api/profile` (Protected)

GET response:

```json
{
  "profile": {
    "name": "User Name",
    "email": "user@example.com",
    "phone": "9876543210",
    "image": "https://..."
  }
}
```

PATCH body example:

```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "image": "https://..."
}
```

### 8.2 Address Book

- `GET /api/address` (Protected)
- `POST /api/address` (Protected)
- `PUT /api/address` (Protected)
- `DELETE /api/address?id=<address_id>` (Protected)

Create address body:

```json
{
  "address": {
    "name": "User Name",
    "email": "user@example.com",
    "street": "Street 1",
    "city": "Bengaluru",
    "state": "Karnataka",
    "district": "Bangalore Urban",
    "zip": "560001",
    "country": "India",
    "phone": "9876543210",
    "phoneCode": "+91"
  }
}
```

---

## 9) Checkout Pincode Behavior (Updated)

- Deliverability hard-block is removed at checkout level.
- User can continue checkout with a valid pincode even if courier location API does not resolve.
- Checkout now auto-fetches location from pincode (city/district/state) when a valid 6-digit pincode is entered.

Recommended app behavior:

- On pincode input length 6, call pincode lookup and auto-fill city/state.
- If lookup fails, keep pincode and allow manual city/state entry.
- Do not block order placement only because serviceability API failed.

Lookup endpoint:

- `GET /api/indiapost/pincode?pincode=<PINCODE>&limit=1`

Fallback (if needed):

- `https://api.postalpincode.in/pincode/<PINCODE>`

---

## 10) Mobile UI Mapping (What to Render)

Order History list item:

- short order number
- order date
- final amount
- payment method + paid/unpaid state
- order status
- first product image/name

Order Details screen:

- shipping address full block
- product line items
- payment summary
- courier + tracking id
- current tracking status
- timeline/events list
- delivered timestamp (if delivered)
- current location / latest scan location

Account tab:

- profile card (name/email/phone/image)
- address list CRUD

---

## 11) Error Handling Recommendations

- `401`: token missing/expired -> force re-login
- `400`: invalid payload -> show backend message directly
- `404` on tracking -> show "Order not found"
- `429` on Razorpay order create -> retry after returned `retryAfter`
- `500/503` tracking provider failure -> show "Tracking temporarily unavailable"

---

## 12) How to identify source (APP vs WEB) quickly

Use this exact checklist when debugging.

### 11.1 Confirm what backend saved

After order success, fetch that order and check `orderSource`:

- `GET /api/orders?orderId=<ORDER_ID>`

Expected:

```json
{
  "order": {
    "_id": "...",
    "orderSource": "APP"
  }
}
```

If `orderSource` is `WEB`, the source markers did not reach backend for that flow.

### 11.2 Verify outgoing request from mobile app

In app network logs (Axios interceptor/Flipper/Charles/Proxyman), confirm for:

- `POST /api/orders` (COD)
- `POST /api/razorpay/verify` (prepaid)

Required headers:

```http
x-order-source: APP
x-client-platform: APP
```

Required body markers (at least one strongly recommended to send all):

```json
{
  "orderSource": "APP",
  "source": "APP",
  "platform": "APP",
  "isApp": true,
  "clientApp": "android"
}
```

For prepaid, these markers must be inside `paymentPayload` as well.

### 11.3 One-minute smoke test

Run from Postman/cURL with explicit APP headers and confirm result is APP.

COD example:

```bash
curl -X POST "https://quickfynd.com/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "x-order-source: APP" \
  -H "x-client-platform: APP" \
  -d '{
    "addressId":"<address_id>",
    "items":[{"id":"<product_id>","quantity":1}],
    "paymentMethod":"COD",
    "isGuest":false,
    "orderSource":"APP",
    "source":"APP",
    "isApp":true,
    "clientApp":"android"
  }'
```

If this stores APP but mobile app stores WEB, issue is in mobile request construction or header forwarding.

### 11.4 Dashboard verification

In seller orders table, `Source` column should show APP for new mobile orders.

If old rows show WEB, that is expected for previously created orders.

---

## 13) Implementation Checklist for Mobile Team

- Send `Authorization: Bearer <token>` for protected APIs.
- Send APP source headers on COD and prepaid verification calls.
- Include APP source body markers (`orderSource/source/isApp`).
- Use `GET /api/orders` for account order history.
- Use `GET /api/track-order` for full live tracking details per order.
- Build tracking timeline UI from `delhivery.events` or `indiaPost.events`.
- Implement profile API integration (`/api/profile`).
- Implement address CRUD (`/api/address`).
- Verify guest-to-login order history merge by using same email/phone.

---

## 14) QA Scenarios (Must Test)

1. Guest COD order -> login with same email -> order appears in history.
2. Guest prepaid order -> login with same phone -> order appears in history.
3. APP order source saved as `APP` for both COD and prepaid.
4. India Post order shows delivered status/time/location correctly.
5. Delhivery order shows current status and timeline scans.
6. Profile update reflects correctly on next fetch.
7. Address create/edit/delete works and is usable in checkout.
