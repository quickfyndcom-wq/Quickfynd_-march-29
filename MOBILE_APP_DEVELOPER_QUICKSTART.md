# Mobile App Developer Quickstart — Quickfynd API

**Base URL:** `https://quickfynd.com`  
**Auth:** Firebase ID Token → `Authorization: Bearer <idToken>`

---

## 1. Sign In (Google)

```dart
// Flutter example
final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
final GoogleSignInAuthentication googleAuth = await googleUser!.authentication;
final credential = GoogleAuthProvider.credential(
  accessToken: googleAuth.accessToken,
  idToken: googleAuth.idToken,
);
final userCred = await FirebaseAuth.instance.signInWithCredential(credential);
final String idToken = await userCred.user!.getIdToken();
```

**Store `idToken` in memory. Refresh before each API call:**

```dart
final idToken = await FirebaseAuth.instance.currentUser!.getIdToken(true);
```

---

## 2. Sign In (Email / Password)

```dart
final userCred = await FirebaseAuth.instance.signInWithEmailAndPassword(
  email: email, password: password,
);
final idToken = await userCred.user!.getIdToken();
```

---

## 3. Required Headers (ALL protected requests)

```
Authorization: Bearer <idToken>
Content-Type: application/json
x-order-source: APP          ← prevents orders saving as WEB
x-client-platform: android   ← or: ios
```

---

## 4. Get User Profile

```
GET /api/user/profile
Headers: Authorization: Bearer <idToken>
```

**Response:**

```json
{
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "profilePicture": "https://...",
    "addresses": [
      {
        "_id": "addr_id",
        "name": "Home",
        "address": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "phone": "9876543210",
        "isDefault": true
      }
    ]
  }
}
```

---

## 5. Place Order (COD)

```
POST /api/store/checkout
Headers: Authorization: Bearer <idToken>
         x-order-source: APP
         x-client-platform: android
```

```json
{
  "isApp": true,
  "orderSource": "APP",
  "items": [
    {
      "productId": "prod_id",
      "quantity": 1,
      "price": 499,
      "name": "Product Name",
      "image": "https://..."
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "phone": "9876543210",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "paymentMethod": "COD",
  "subtotal": 499,
  "shippingCharge": 0,
  "discount": 0,
  "total": 499
}
```

**Response:**

```json
{
  "success": true,
  "orderId": "mongo_order_id",
  "shortOrderNumber": "QF-1234",
  "message": "Order placed successfully"
}
```

---

## 6. Place Order (Razorpay — Prepaid)

**Step A — Create Razorpay order:**

```
POST /api/razorpay/create-order
Headers: Authorization: Bearer <idToken>
Body: { "amount": 49900 }   ← paise (₹499 = 49900)
```

Returns: `{ "orderId": "order_xxx", "amount": 49900, "currency": "INR", "key": "rzp_live_xxx" }`

**Step B — Open Razorpay SDK, get `paymentId` + `signature`**

**Step C — Verify & create order:**

```
POST /api/razorpay/verify
Headers: Authorization: Bearer <idToken>
         x-order-source: APP
         x-client-platform: android
```

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "...",
  "isApp": true,
  "orderSource": "APP",
  "items": [...],
  "shippingAddress": {...},
  "total": 499
}
```

---

## 7. Get Order History

```
GET /api/orders
Headers: Authorization: Bearer <idToken>
         x-order-source: APP
```

> Guest orders placed with the same email/phone are **automatically linked** on first fetch after login — no extra call needed.

**Response:**

```json
{
  "orders": [
    {
      "_id": "order_id",
      "shortOrderNumber": "QF-1234",
      "status": "processing", // pending | processing | shipped | delivered | cancelled
      "paymentMethod": "COD",
      "paymentStatus": "pending", // pending | paid | failed
      "isPaid": false,
      "orderSource": "APP",
      "totalAmount": 499,
      "shippingCharge": 0,
      "discount": 0,
      "trackingId": "1234567890",
      "courier": "delhivery", // delhivery | indiapost | null
      "trackingUrl": "https://...",
      "orderItems": [
        {
          "name": "Product Name",
          "quantity": 1,
          "price": 499,
          "image": "https://..."
        }
      ],
      "shippingAddress": { "name": "...", "city": "...", "pincode": "..." },
      "createdAt": "2026-04-30T10:00:00.000Z"
    }
  ]
}
```

---

## 8. Track Order

```
GET /api/track-order?orderId=<orderId>
Headers: Authorization: Bearer <idToken>   ← optional for public tracking
```

**Response:**

```json
{
  "order": {
    "_id": "order_id",
    "status": "shipped",
    "trackingId": "1234567890",
    "courier": "delhivery",
    "trackingUrl": "https://..."
  },
  "tracking": {
    "courier": "delhivery",
    "currentStatus": "In Transit",
    "currentLocation": "Mumbai Hub",
    "expectedDelivery": "2026-05-02",
    "events": [
      {
        "time": "2026-04-30T08:00:00Z",
        "status": "Picked Up",
        "location": "Pune",
        "remarks": "Shipment picked up"
      }
    ]
  }
}
```

> **India Post orders** — same endpoint, same shape. `courier` will be `"indiapost"`.

---

## 9. APP Source — Cheatsheet

Always include ALL of these to guarantee `orderSource: APP` is saved:

| Where  | Key                 | Value              |
| ------ | ------------------- | ------------------ |
| Header | `x-order-source`    | `APP`              |
| Header | `x-client-platform` | `android` or `ios` |
| Body   | `isApp`             | `true`             |
| Body   | `orderSource`       | `APP`              |

Missing even one is fine — the server checks all. But sending all four is safest.

---

## 10. Common Errors

| Status | Meaning                       | Fix                                             |
| ------ | ----------------------------- | ----------------------------------------------- |
| 401    | Token expired or missing      | Call `getIdToken(true)` to force refresh        |
| 403    | Token valid but access denied | Check user role / order ownership               |
| 400    | Missing required fields       | Check request body shape                        |
| 500    | Server error                  | Retry once; if persistent, contact backend team |

---

## Full API Call Sequence (New User Flow)

```
1. Firebase sign-in → get idToken
2. GET /api/user/profile        → load user name, default address
3. GET /api/cart (optional)     → load saved cart
4. POST /api/store/checkout     → place COD order
   OR  POST /api/razorpay/create-order → POST /api/razorpay/verify (prepaid)
5. GET /api/orders              → order history (auto-links guest orders)
6. GET /api/track-order?orderId → live tracking
```

---

**Full docs:** [MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md](MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md)  
**Detailed handoff:** [MOBILE_API_HANDOFF.md](MOBILE_API_HANDOFF.md)
