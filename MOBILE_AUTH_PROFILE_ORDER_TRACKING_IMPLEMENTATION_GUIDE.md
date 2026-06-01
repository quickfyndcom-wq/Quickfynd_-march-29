# Mobile App Implementation Guide: Google Sign-In, Profile, Order History, and Tracking

Last Updated: 2026-04-30
Owner: Quickfynd Backend Team

## 1) Scope

This document is a standalone handoff for mobile app developers to implement:

- Google Sign-In and session handling
- Customer profile (view/update)
- Order history (including guest orders after login)
- Order tracking with full timeline/history

Base URL: `https://quickfynd.com`
API prefix: `/api`

---

## 2) Authentication Architecture

Important:

- Login is managed by Firebase Auth in app code.
- Backend protected APIs expect Firebase ID token.
- There is no custom `/api/signin` endpoint in this backend.

Protected API header format:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Token rules:

- Always fetch a fresh token after sign-in.
- Refresh token when API returns 401.
- Clear token on logout.

---

## 3) Google Sign-In (Mobile)

## 3.1 High-level flow

1. User taps `Continue with Google`.
2. App performs Google auth using native SDK.
3. App exchanges Google credential with Firebase Auth.
4. App gets Firebase ID token from Firebase user session.
5. App calls backend protected APIs with `Authorization: Bearer <ID_TOKEN>`.

## 3.2 Implementation contract

After successful Google sign-in, app must:

- Save user session locally.
- Call profile fetch API.
- Call order history API.
- Optionally call login notification API.

Optional login notification API:

- `POST /api/send-login-email` (Protected)

Request:

```json
{
  "email": "user@example.com",
  "name": "User Name"
}
```

Response:

```json
{
  "success": true,
  "emailId": "resend_email_id"
}
```

---

## 4) Profile APIs

## 4.1 Get profile

- `GET /api/profile` (Protected)

Response:

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

## 4.2 Update profile

- `PATCH /api/profile` (Protected)

Request:

```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "image": "https://..."
}
```

Response:

```json
{
  "profile": {
    "name": "Updated Name",
    "email": "user@example.com",
    "phone": "9876543210",
    "image": "https://..."
  }
}
```

UI requirements:

- Profile screen shows name/email/phone/image.
- Save button calls PATCH and refreshes profile state.

---

## 5) Order History APIs

## 5.1 Fetch order history list

- `GET /api/orders?limit=20&offset=0` (Protected)

Response shape:

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
          "productId": {
            "_id": "...",
            "name": "...",
            "images": ["..."]
          },
          "price": 499,
          "quantity": 1
        }
      ],
      "createdAt": "2026-04-30T10:34:00.000Z"
    }
  ]
}
```

## 5.2 Fetch single order by id

- `GET /api/orders?orderId=<ORDER_ID>`

Response:

```json
{
  "order": {
    "_id": "...",
    "shortOrderNumber": 55234,
    "status": "ORDER_PLACED",
    "orderItems": []
  }
}
```

## 5.3 Guest order linking after login

Backend behavior is automatic in order history API:

- Reads logged-in token email/phone.
- Matches guest orders.
- Auto-links guest orders to user account.

Manual fallback endpoint (optional):

- `POST /api/user/link-guest-orders` (Protected)

Request:

```json
{
  "email": "user@example.com",
  "phone": "9876543210"
}
```

Response:

```json
{
  "linked": true,
  "count": 2,
  "message": "Successfully linked 2 guest order(s) to your account"
}
```

---

## 6) Order Tracking APIs

Tracking endpoint is public:

- `GET /api/track-order?orderId=<ORDER_ID_OR_SHORT_ORDER_NUMBER>`
- `GET /api/track-order?awb=<AWB>`
- `GET /api/track-order?phone=<PHONE>`

## 6.1 Delhivery tracking fields

Use these fields from response:

- `order.delhivery.current_status`
- `order.delhivery.current_status_time`
- `order.delhivery.current_status_location`
- `order.delhivery.events[]`
- `order.delhivery.payment.is_cod_recovered`

Event item:

- `time`
- `status`
- `location`
- `remarks`

## 6.2 India Post tracking fields

Use these fields from response:

- `order.indiaPost.statusLabel`
- `order.indiaPost.isDelivered`
- `order.indiaPost.deliveredAt`
- `order.indiaPost.currentLocation`
- `order.indiaPost.events[]`

Event item:

- `time`
- `description`
- `location`
- `country`

Display requirement:

- Show latest status at top.
- Show delivered date/time when delivered.
- Show full timeline sorted newest to oldest.
- Show current location from latest event.

---

## 7) App Screen Requirements

## 7.1 Sign-In screen

- Google sign-in button.
- On success, navigate to account/dashboard.
- Trigger profile + order list fetch.

## 7.2 Profile screen

- Show user identity data.
- Edit + save profile fields.
- Support profile image URL if available.

## 7.3 Order History screen

- Paginated list using `limit` and `offset`.
- Show order number, date, amount, payment status, order status.
- Tap item to open order detail + tracking timeline.

## 7.4 Order Detail + Tracking screen

- Product items and payment summary.
- Shipping address block.
- Courier name + tracking id.
- Current status chip.
- Timeline/history list with timestamps.

---

## 8) Error Handling Standards

- `401`: session expired -> refresh token or force re-login.
- `400`: show backend validation message.
- `404` tracking/order not found: show clear empty state.
- `500/503`: show temporary error and retry action.

Recommended UX:

- Use non-blocking retry for tracking refresh.
- Keep last known tracking timeline visible if refresh fails.

---

## 9) Integration Sequence (Recommended)

App startup after sign-in:

1. Fetch `GET /api/profile`
2. Fetch `GET /api/orders?limit=20&offset=0`
3. If user opens order detail, fetch `GET /api/track-order?...`

Order detail open flow:

1. Show local order basics instantly.
2. Call tracking API in background.
3. Merge and render live courier timeline.

---

## 10) QA Checklist

1. Google sign-in returns valid Firebase ID token.
2. Profile fetch works immediately after login.
3. Profile update persists and displays updated value.
4. Order history loads for signed-in user.
5. Guest orders appear after login with same email/phone.
6. Tracking works by orderId and AWB.
7. Delhivery timeline renders with current status and location.
8. India Post timeline renders with delivered time and current location.
9. 401 handling triggers re-auth flow.
10. 500/503 shows retry without app crash.

---

## 11) Related Docs

- `MOBILE_API_HANDOFF.md`
- `MOBILE_ORDER_HISTORY_TRACKING_ACCOUNT_GUIDE.md`
- `GUEST_CHECKOUT_ACCOUNT_LINKING.md`
