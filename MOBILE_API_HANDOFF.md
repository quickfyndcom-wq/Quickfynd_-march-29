# Mobile App API + Credentials Handoff

Last Updated: 2026-02-27
Owner: Quickfynd Backend Team

## Product Description Rendering (Important)

For product description UI parity with dashboard/web, follow:

- `MOBILE_DESCRIPTION_RENDER_GUIDE.md`

This is mandatory for correct rendering of rich description content on mobile.

## 1) Base Setup

- **Base URL (Production):** `https://quickfynd.com`
- **API Prefix:** `/api`
- **Content-Type:** `application/json`
- **Auth:** Firebase ID Token in header

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 2) Authentication (Sign In / Sign Out / Google Sign-In)

> Important: In this backend, sign-in and sign-out are handled by **Firebase Auth SDK** (client side), not by custom `/api/signin` or `/api/signout` endpoints.

### 2.1 Email/Password Sign-In (Firebase)
Use Firebase Auth in mobile app:
- `signInWithEmailAndPassword(...)`

After sign-in:
1. Get ID token from Firebase user
2. Send token in `Authorization` header for protected APIs

### 2.2 Google Sign-In (Firebase)
Use Firebase Auth + Google provider:
- `signInWithPopup(...)` on web
- For mobile (Android/iOS), use native Google sign-in + Firebase credential flow

After Google sign-in:
1. Get Firebase ID token
2. Use the same bearer token for backend APIs

### 2.3 Sign-Out
Use Firebase SDK sign-out on app side:
- `auth.signOut()`

Optional notification API after login/logout:

#### POST `/api/send-login-email` (Protected)
Send login alert email to user.

Request body:
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

#### POST `/api/send-signout-email` (Optional protected)
Send sign-out alert email.

Request body:
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "skipAuth": true
}
```

---

## 3) Wallet APIs

### GET `/api/wallet` (Protected)
Returns wallet summary.

Response:
```json
{
  "coins": 120,
  "rupeesValue": 120,
  "transactions": [
    {
      "type": "EARN",
      "coins": 20,
      "rupees": 20,
      "orderId": "WELCOME_BONUS"
    }
  ]
}
```

Errors:
- `401 Unauthorized`

### POST `/api/wallet/bonus` (Protected)
Claims one-time welcome bonus (20 coins).

Response (new claim):
```json
{
  "message": "Welcome bonus added",
  "coins": 20
}
```

Response (already claimed):
```json
{
  "message": "Welcome bonus already claimed",
  "coins": 20
}
```

---

## 4) Order APIs

### POST `/api/orders`
Create a new order (supports logged-in + guest checkout).

Common body fields:
```json
{
  "addressId": "<address_id>",
  "addressData": { "street": "", "city": "", "state": "", "country": "", "pincode": "" },
  "items": [
    { "id": "<product_id>", "quantity": 1 }
  ],
  "couponCode": "NEW10",
  "paymentMethod": "COD",
  "isGuest": false,
  "coinsToRedeem": 10
}
```

Guest-specific body fields:
```json
{
  "isGuest": true,
  "guestInfo": {
    "name": "Guest User",
    "email": "guest@example.com",
    "phone": "9999999999",
    "address": "Street address",
    "city": "City",
    "state": "State",
    "country": "India",
    "pincode": "560001"
  }
}
```

Notes:
- If `isGuest !== true`, bearer token is required.
- Validates stock, address, coupon, and payment combinations.
- COD is blocked for personalized-offer items.

### GET `/api/orders?orderId=<id>`
Fetch single order by ID (supports guest use case for order success page).

Response:
```json
{
  "order": { "_id": "...", "shortOrderNumber": 123456, "status": "ORDER_PLACED" }
}
```

### GET `/api/orders?limit=20&offset=0` (Protected)
Fetch logged-in user order list.

Response:
```json
{
  "orders": [
    { "_id": "...", "status": "DELIVERED", "isPaid": true }
  ]
}
```

### POST `/api/orders/cancel` (Protected)
Cancel a cancellable order status.

Request:
```json
{
  "orderId": "<order_id>",
  "reason": "Changed my mind"
}
```

Response:
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": { "_id": "...", "status": "CANCELLED" }
}
```

### POST `/api/orders/return-request` (Protected)
Submit return/replacement request for delivered order.

Request:
```json
{
  "orderId": "<order_id>",
  "itemIndex": 0,
  "reason": "Damaged",
  "type": "RETURN",
  "description": "Box was damaged",
  "images": ["https://..."]
}
```

### GET `/api/orders/return-request` (Protected)
Get all return requests for authenticated user.

### GET `/api/orders/check-razorpay-settlement?orderId=<id>` (Protected)
Checks Razorpay capture/settlement and auto-updates order payment status.

---

## 5) Tracking + Guest Linking

### GET `/api/track-order?awb=<awb>`
### GET `/api/track-order?orderId=<id_or_short_number>`
### GET `/api/track-order?phone=<phone>`
Public tracking endpoint. Returns order/tracking data (Delhivery fallback enabled).

### POST `/api/user/link-guest-orders` (Protected)
Use after signup/login to link previous guest orders.

Request:
```json
{
  "email": "user@example.com",
  "phone": "9999999999"
}
```

Response:
```json
{
  "message": "Successfully linked 2 guest order(s) to your account",
  "linked": true,
  "count": 2
}
```

---

## 6) Credentials to Share With Mobile Developer

Share these securely (1Password/Bitwarden/Secret Manager), **not in chat**.

### 6.1 Required mobile-side credentials

- `API_BASE_URL` = `https://quickfynd.com`
- Firebase project config:
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`

### 6.2 Do NOT share to mobile app

These are backend-only secrets:
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `FIREBASE_PRIVATE_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `RAZORPAY_KEY_SECRET`
- Delhivery API token/secret

### 6.3 Access rules for mobile dev

- Mobile app should only use public Firebase config + Base URL.
- All protected API calls must include Firebase ID token.
- Never embed backend secrets in APK/IPA.

---

## 7) Quick Integration Checklist (Mobile)

- Implement Firebase email/password sign-in.
- Implement Google sign-in with Firebase.
- Save Firebase ID token and refresh when needed.
- Attach `Authorization: Bearer <token>` for protected APIs.
- Implement wallet screens (`GET /api/wallet`, `POST /api/wallet/bonus`).
- Implement order create/list/detail/cancel/return.
- Implement track order using `/api/track-order`.
- Call `/api/user/link-guest-orders` post-login to merge guest history.

---

## 8) cURL Smoke Tests

### Wallet
```bash
curl -X GET "https://quickfynd.com/api/wallet" \
  -H "Authorization: Bearer <ID_TOKEN>"
```

### Create Order
```bash
curl -X POST "https://quickfynd.com/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -d '{
    "addressId": "<address_id>",
    "items": [{"id": "<product_id>", "quantity": 1}],
    "paymentMethod": "COD",
    "isGuest": false
  }'
```

### Track Order
```bash
curl -X GET "https://quickfynd.com/api/track-order?orderId=<ORDER_ID_OR_SHORT_NUMBER>"
```
