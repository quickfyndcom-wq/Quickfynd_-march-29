# Spin Wheel — App Developer Deployment Checklist

> Share this document with the mobile app developer.  
> Environment: **Production** — `https://quickfynd.com`  
> Last updated: May 4, 2026

---

## 1. STEP ZERO — Get Your storeId

**The `storeId` is a 24-character MongoDB ObjectId** unique to this store.  
Every spin API call requires it. Without the correct storeId the backend returns `"Spin not active right now"`.

### How to find your storeId (one-time setup):

**Option A — Browser DevTools (quickest):**

1. Log in to the seller dashboard at `https://quickfynd.com/store`
2. Open **DevTools → Network tab**
3. Navigate to **Dashboard → Spin Wheel**
4. Find the request `GET /api/store/spin-campaign`
5. In the Response JSON, copy the value of `campaign.storeId`

**Option B — Use the helper API endpoint:**

Open a terminal on the server or call via Postman/curl after logging in:

```http
GET https://quickfynd.com/api/store/storeinfo
Authorization: Bearer <SELLER_FIREBASE_ID_TOKEN>
```

Response:

```json
{ "storeId": "64f3a1b2c8e4d5f6a7b8c9d0" }
```

> **Once you have the storeId → give this exact value to the app developer.**  
> It does NOT change unless the store is deleted and recreated.

---

## 2. Environment Summary

| Item                      | Value                                       |
| ------------------------- | ------------------------------------------- |
| Production Base URL       | `https://quickfynd.com`                     |
| Firebase Project ID       | `quickfynd`                                 |
| Firebase Auth Domain      | `quickfynd.firebaseapp.com`                 |
| Firebase API Key (public) | `AIzaSyA9VslXDZsAofnjgyaEeTOf0nzFmdymHrE`   |
| Firebase Sender ID        | `861878384152`                              |
| Firebase App ID           | `1:861878384152:web:77f8a284f5e0493895756d` |
| Firebase Measurement ID   | `G-03M3YYEZFE`                              |

---

## 3. Confirm Campaign is LIVE

Before going to the app, verify the spin campaign is active by calling the **public** campaign endpoint (no auth required):

```http
GET https://quickfynd.com/api/spin/campaign?storeId=<YOUR_STORE_ID>
```

**Expected response when campaign is LIVE:**

```json
{
  "isEnabled": true,
  "campaign": {
    "storeId": "64f3a1b2c8e4d5f6a7b8c9d0",
    "campaignName": "Win Big!",
    "dailySpinLimit": 1,
    "couponPrefix": "SPIN",
    "lastUpdatedAt": "2026-05-04T10:00:00.000Z",
    "slices": [
      {
        "label": "10% Off",
        "weight": 30,
        "rewardType": "coupon_percent",
        "discountValue": 10,
        "minOrderValue": 0,
        "expiryHours": 48,
        "color": "#6366f1"
      },
      {
        "label": "₹50 Off",
        "weight": 20,
        "rewardType": "coupon_flat",
        "discountValue": 50,
        "minOrderValue": 299,
        "expiryHours": 48,
        "color": "#f59e0b"
      },
      {
        "label": "Free Shipping",
        "weight": 20,
        "rewardType": "free_shipping",
        "discountValue": 0,
        "minOrderValue": 0,
        "expiryHours": 48,
        "color": "#10b981"
      },
      {
        "label": "Better Luck!",
        "weight": 30,
        "rewardType": "no_win",
        "discountValue": 0,
        "minOrderValue": 0,
        "expiryHours": 48,
        "color": "#94a3b8"
      }
    ]
  }
}
```

**If `isEnabled: false`** → go to Dashboard → Spin Wheel → toggle campaign ON and save.  
**If campaign is null** → campaign was never saved; create it in the dashboard first.

---

## 4. Firebase Auth — How It Works for the App

### Customer Login Flow

1. Customer signs in via **Firebase Auth** in the app (phone, Google, email/password)
2. App receives a **Firebase ID Token** (JWT)
3. App sends this token in the `Authorization` header for all authenticated spin calls
4. Backend (`/api/spin/play`) calls `firebase-admin.verifyIdToken(token)` and extracts `uid`
5. The `uid` is used to track daily spin limits (one spin per uid per day)

### What the backend expects:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...
```

- Token must be a **Firebase ID Token** (not a custom token or access token)
- Token must belong to the **same Firebase project**: `quickfynd`
- Token can be refreshed via `user.getIdToken(/* forceRefresh */ true)`

---

## 5. App Integration — API Reference

### A. Check if Campaign is Active (on app launch / spin screen open)

```http
GET https://quickfynd.com/api/spin/campaign?storeId=<STORE_ID>
```

- No auth required
- Cache-Control: no-cache (always fresh)
- Use `isEnabled` to show/hide spin wheel UI
- Use `slices` array to draw the wheel segments

---

### B. Play Spin (customer taps "SPIN")

```http
POST https://quickfynd.com/api/spin/play
Authorization: Bearer <CUSTOMER_FIREBASE_ID_TOKEN>
Content-Type: application/json

{
  "storeId": "<YOUR_STORE_ID>"
}
```

**Success Response (200):**

```json
{
  "message": "You won: 10% Off!",
  "sliceLabel": "10% Off",
  "rewardType": "coupon_percent",
  "couponCode": "SPIN-A3X9",
  "discountValue": 10,
  "minOrderValue": 0,
  "expiresAt": "2026-05-06T10:00:00.000Z",
  "freeShipping": false
}
```

**Free Shipping win:**

```json
{
  "message": "You won: Free Shipping!",
  "sliceLabel": "Free Shipping",
  "rewardType": "free_shipping",
  "couponCode": "SPIN-B7Y2",
  "discountValue": 0,
  "minOrderValue": 0,
  "expiresAt": "2026-05-06T10:00:00.000Z",
  "freeShipping": true
}
```

**No-win Response (200):**

```json
{
  "message": "Better luck next time!",
  "sliceLabel": "Better Luck!",
  "rewardType": "no_win",
  "couponCode": null
}
```

**Error Responses:**

| Status | Error                                       | Meaning                            |
| ------ | ------------------------------------------- | ---------------------------------- |
| 400    | `storeId is required`                       | Missing storeId in body            |
| 401    | `Missing Authorization`                     | No Bearer token in header          |
| 401    | `Invalid token`                             | Token expired / wrong project      |
| 404    | `Spin wheel is not active`                  | Campaign disabled or storeId wrong |
| 429    | `You have used all your spins for today...` | Daily limit reached                |

---

### C. Apply Coupon at Checkout

When customer has a coupon code (from spin or other source):

```http
POST https://quickfynd.com/api/coupons
Content-Type: application/json

{
  "code": "SPIN-A3X9",
  "cartTotal": 499,
  "storeId": "<YOUR_STORE_ID>"
}
```

**Response for % discount:**

```json
{
  "success": true,
  "valid": true,
  "coupon": {
    "code": "SPIN-A3X9",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 49.9,
    "minOrderValue": 0,
    "maxDiscount": null,
    "freeShipping": false
  }
}
```

**Response for free shipping:**

```json
{
  "success": true,
  "valid": true,
  "coupon": {
    "code": "SPIN-B7Y2",
    "discountType": "free_shipping",
    "discountValue": 0,
    "discountAmount": 0,
    "freeShipping": true
  }
}
```

**Invalid coupon:**

```json
{
  "success": false,
  "valid": false,
  "error": "Coupon has expired"
}
```

---

## 6. Guest vs Logged-In Behavior

| Action              | Guest                             | Logged-In                   |
| ------------------- | --------------------------------- | --------------------------- |
| View spin wheel     | ✅ Show wheel UI                  | ✅ Show wheel UI            |
| See campaign/slices | ✅ `GET /api/spin/campaign`       | ✅ `GET /api/spin/campaign` |
| Spin and win        | ❌ Blocked (401)                  | ✅ Full flow                |
| Apply coupon        | ✅ (coupon code is just a string) | ✅                          |

**Recommended UX**: Show the spin wheel to guests, but prompt "Sign in to spin!" when they tap the spin button. On successful login, auto-trigger the spin.

---

## 7. Full Integration Checklist (for App Developer)

### Firebase Setup

- [ ] Add Firebase to the app with project `quickfynd`
- [ ] API Key: `AIzaSyA9VslXDZsAofnjgyaEeTOf0nzFmdymHrE`
- [ ] Auth Domain: `quickfynd.firebaseapp.com`
- [ ] Enable Phone / Google / Email sign-in methods in Firebase Console (whichever are used)
- [ ] Call `user.getIdToken()` before each spin API call (tokens expire after 1 hour — always refresh)

### Spin Wheel UI

- [ ] On spin screen open → call `GET /api/spin/campaign?storeId=<STORE_ID>` → build wheel from `slices`
- [ ] If `isEnabled: false` → hide wheel or show "Coming Soon"
- [ ] If user not logged in → show "Sign in to spin" CTA
- [ ] On tap Spin button → if logged in → POST `/api/spin/play` with storeId + Bearer token
- [ ] Handle 429 "daily limit reached" → show "Come back tomorrow"
- [ ] On win → display coupon code prominently
- [ ] On no_win → show "Better luck next time" with try-again (if daily limit allows)

### Coupon Application

- [ ] Store the coupon code in the app state / local storage after winning
- [ ] At checkout, let user "Apply Coupon" → POST `/api/coupons` with code + cartTotal + storeId
- [ ] If `freeShipping: true` → remove shipping charge from order total
- [ ] If `discountAmount > 0` → subtract from order total
- [ ] If coupon invalid/expired → show error message

### Hardcode These Values in the App

```
STORE_ID = "<GET THIS FROM STEP 1 ABOVE>"
API_BASE_URL = "https://quickfynd.com"
```

---

## 8. Quick Verification Commands

After getting the storeId, paste it below and test in browser or Postman:

```
# 1. Is campaign live?
GET https://quickfynd.com/api/spin/campaign?storeId=PASTE_STORE_ID_HERE

# 2. Play spin (replace TOKEN with a real Firebase ID token)
POST https://quickfynd.com/api/spin/play
Authorization: Bearer TOKEN
Body: { "storeId": "PASTE_STORE_ID_HERE" }

# 3. Apply coupon (replace CODE with a code you won)
POST https://quickfynd.com/api/coupons
Body: { "code": "CODE", "cartTotal": 500, "storeId": "PASTE_STORE_ID_HERE" }
```

---

## 9. Common Errors & Fixes

| Error                            | Cause                                 | Fix                                                  |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `"Spin not active right now"`    | storeId wrong or campaign disabled    | Check storeId, enable campaign in dashboard          |
| `"Missing Authorization"`        | No Bearer token sent                  | App must send `Authorization: Bearer <token>`        |
| `"Invalid token"`                | Token from wrong Firebase project     | Ensure app uses project `quickfynd`                  |
| `"You have used all your spins"` | Daily limit (default: 1/day per user) | Normal behavior; show "come back tomorrow"           |
| `404 on /api/spin/play`          | Wrong URL                             | Confirm URL is `https://quickfynd.com/api/spin/play` |
| Campaign shows old data          | Cached on app side                    | Do NOT cache campaign response; call fresh each time |

---

## 10. Contact / Escalation

- Dashboard: `https://quickfynd.com/store`
- Spin Wheel settings: `https://quickfynd.com/store/spin-wheel`
- If spin API returns 500 → check server logs for `[spin/play]` errors
- To reset daily spin count for testing: developer can manually delete SpinLog documents for the test user's uid in MongoDB
