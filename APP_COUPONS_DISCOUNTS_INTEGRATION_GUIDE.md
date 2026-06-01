# App Developer Integration Guide — Coupons, Discounts & Spin Wheel

This document covers everything the mobile app developer needs to implement the coupon system, discount display, and spin wheel promotion. The backend is fully ready — the app just needs to wire up the APIs and build the UI.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Coupon List Screen](#2-coupon-list-screen)
3. [Apply Coupon at Checkout](#3-apply-coupon-at-checkout)
4. [Spin Wheel Campaign](#4-spin-wheel-campaign)
5. [Error Handling Reference](#5-error-handling-reference)
6. [App Checklist](#6-app-checklist)

---

## 1. Overview

There are three discount mechanisms in the app:

| Feature               | Where shown             | How coupon is obtained               |
| --------------------- | ----------------------- | ------------------------------------ |
| **Public coupons**    | Offers / Coupons screen | Pre-created by admin, visible to all |
| **Spin wheel reward** | Spin Wheel screen       | User spins and wins a one-time code  |
| **Manual entry**      | Checkout screen         | User types/pastes any valid code     |

All three types ultimately use the same coupon validation API at checkout.

### Base URL

All API calls use your existing API base URL, e.g. `https://yourdomain.com`.

### Store ID

Ask the admin/backend developer for your `storeId` — the 24-character MongoDB `_id` of the store document. Hardcode it in your app config.

Example: `"64f1a2b3c4d5e6f708091a2b"`

---

## 2. Coupon List Screen

### 2.1 Fetch Available Coupons

**GET** `/api/coupons?storeId=<storeId>`

No authentication required.

**Response (200):**

```json
{
  "success": true,
  "coupons": [
    {
      "_id": "64f1a2b3c4d5e6f708091a2c",
      "code": "SAVE20",
      "title": "20% Off",
      "description": "Get 20% off on orders above ₹499",
      "discountType": "percentage",
      "discountValue": 20,
      "minOrderValue": 499,
      "maxDiscount": 200,
      "badgeColor": "#10B981",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "isExpired": false,
      "isExhausted": false,
      "status": "active"
    },
    {
      "_id": "...",
      "code": "FLAT50",
      "title": "₹50 Off",
      "discountType": "fixed",
      "discountValue": 50,
      "minOrderValue": 299,
      "status": "active"
    }
  ]
}
```

**Field reference:**

| Field           | Type                                       | Description                                  |
| --------------- | ------------------------------------------ | -------------------------------------------- |
| `code`          | string                                     | The coupon code to display and copy          |
| `title`         | string                                     | Short label e.g. "20% Off"                   |
| `description`   | string                                     | Optional longer description                  |
| `discountType`  | `"percentage"` \| `"fixed"`                | Type of discount                             |
| `discountValue` | number                                     | Percentage or flat rupee amount              |
| `minOrderValue` | number                                     | Minimum cart total required (0 = no minimum) |
| `maxDiscount`   | number \| null                             | Cap on percentage discounts (null = no cap)  |
| `badgeColor`    | string                                     | Hex color for UI badge                       |
| `expiresAt`     | ISO date \| null                           | Expiry timestamp (null = never expires)      |
| `isExpired`     | boolean                                    | Pre-computed for convenience                 |
| `isExhausted`   | boolean                                    | Pre-computed: total use limit reached        |
| `status`        | `"active"` \| `"expired"` \| `"exhausted"` | Ready-to-use status flag                     |

### 2.2 Displaying Coupons

- Show only coupons where `status === "active"` in the main list.
- Optionally show expired/exhausted coupons in a "Past Offers" section (greyed out).
- Show a "Copy Code" button — copy `coupon.code` to clipboard and show a toast.
- Show `minOrderValue` prominently: _"Min. order ₹499"_
- Show `expiresAt` if not null: _"Valid till 31 Dec 2026"_
- If `discountType === "percentage"` and `maxDiscount` is set: _"Up to ₹200 off"_

---

## 3. Apply Coupon at Checkout

### 3.1 Validate & Apply Coupon

**POST** `/api/coupons`

No authentication required (pass `userId` if user is logged in for per-user limit enforcement).

**Request Body:**

```json
{
  "code": "SAVE20",
  "storeId": "<your_store_id>",
  "orderTotal": 799,
  "userId": "firebase_uid_of_user",
  "cartProductIds": ["product_id_1", "product_id_2"]
}
```

| Field            | Required | Description                                                                    |
| ---------------- | -------- | ------------------------------------------------------------------------------ |
| `code`           | Yes      | Coupon code (case-insensitive)                                                 |
| `storeId`        | Yes      | Your store's ID                                                                |
| `orderTotal`     | Yes      | Cart total **before** discount, in rupees                                      |
| `userId`         | No       | Firebase UID — used to enforce per-user limits                                 |
| `cartProductIds` | No       | Array of product `_id` strings in cart — required for product-specific coupons |

**Success Response (200):**

```json
{
  "success": true,
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "title": "20% Off",
    "description": "Get 20% off on orders above ₹499",
    "discountType": "percentage",
    "discountValue": 20,
    "discountAmount": 159.8
  }
}
```

> `discountAmount` is the **pre-calculated rupee value** to subtract from the order total. Display and use this directly — do not recalculate client-side.

**Error Response (400):**

```json
{
  "error": "Minimum order value of ₹499 required",
  "valid": false
}
```

### 3.2 Checkout Integration Flow

```
1. User enters / pastes coupon code
2. Call POST /api/coupons with code + orderTotal + cartProductIds
3a. If valid: show discount line "- ₹159.80" and update total
3b. If invalid: show error message inline below the input field
4. On order submit: send the applied coupon code in the order payload
```

**Possible error messages to handle:**

| Error                                                           | User-facing message                   |
| --------------------------------------------------------------- | ------------------------------------- |
| `"Invalid coupon code"`                                         | "This code is not valid."             |
| `"Coupon has expired"`                                          | "This coupon has expired."            |
| `"Minimum order value of ₹X required"`                          | Show as-is                            |
| `"Coupon usage limit reached"`                                  | "This coupon is no longer available." |
| `"You have already used this coupon"`                           | "You've already used this coupon."    |
| `"This coupon is not applicable for the products in your cart"` | Show as-is                            |

---

## 4. Spin Wheel Campaign

### 4.1 Overview

Users spin once per day (the admin configures the daily limit) and win a promo code credited to their account. Codes work at checkout exactly like regular coupons.

**Authentication required:** Firebase ID token in `Authorization: Bearer <token>` header.

---

### 4.2 Play Spin

**POST** `/api/spin/play`

**Headers:**

```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "storeId": "<your_store_id>"
}
```

**Win Response (200):**

```json
{
  "sliceLabel": "10% Off",
  "rewardType": "coupon_percent",
  "couponCode": "SPIN-A3F9K",
  "discountValue": 10,
  "minOrderValue": 0,
  "expiresAt": "2026-05-05T18:30:00.000Z",
  "message": "Congratulations! You won: 10% Off. Use code SPIN-A3F9K at checkout."
}
```

**No-win Response (200):**

```json
{
  "sliceLabel": "Better Luck Next Time",
  "rewardType": "no_win",
  "couponCode": null,
  "discountValue": 0,
  "minOrderValue": 0,
  "expiresAt": null,
  "message": "Better luck next time! You can spin again tomorrow."
}
```

**Daily limit reached (429):**

```json
{
  "error": "You have used all your spins for today. Come back tomorrow!",
  "nextSpinAt": "2026-05-05T00:00:00.000Z"
}
```

**Campaign inactive (404):**

```json
{
  "error": "Spin wheel is not active"
}
```

**Response field reference:**

| Field           | Type                                                | Description                              |
| --------------- | --------------------------------------------------- | ---------------------------------------- |
| `rewardType`    | `"coupon_percent"` \| `"coupon_flat"` \| `"no_win"` | Type of reward                           |
| `couponCode`    | string \| null                                      | Code to use at checkout. Null for no-win |
| `discountValue` | number                                              | Percentage or flat rupee discount        |
| `minOrderValue` | number                                              | Minimum cart total to use code           |
| `expiresAt`     | ISO date \| null                                    | When the code expires                    |
| `sliceLabel`    | string                                              | Wheel slice name e.g. "10% Off"          |
| `message`       | string                                              | Ready-to-display message                 |

---

### 4.3 Screens to Build

#### Entry Point (Home / Offers screen)

- Show a "🎡 Spin & Win" banner or card when the campaign is active.
- To detect if campaign is active: call `POST /api/spin/play`. If response is `404`, hide the entry point.
- Show the entry point only to **logged-in users** (spin requires auth).

#### Spin Wheel Screen

**On load:**

1. If user is not logged in → prompt to log in.
2. Call `POST /api/spin/play` when user taps SPIN.
3. If `429` response → show "No spins left today" with a countdown to midnight IST.

**Wheel animation:**

- Animate the wheel for 2–3 seconds regardless of server response.
- Call the API during the animation.
- When the response arrives, stop the wheel on the winning `sliceLabel`.
- **Do not try to predict the result before the API returns.**

**Wheel slices (for display):**  
Ask the backend developer to share the current slice configuration. A sensible default to use until then:

```json
[
  { "label": "Better Luck Next Time", "color": "#6366f1", "weight": 40 },
  { "label": "5% Off", "color": "#f59e0b", "weight": 25 },
  { "label": "10% Off", "color": "#10b981", "weight": 15 },
  { "label": "₹50 Off", "color": "#ef4444", "weight": 10 },
  { "label": "Free Shipping", "color": "#3b82f6", "weight": 10 }
]
```

#### Result Modal — Win

- 🎉 Confetti animation
- Title: **"You Won!"**
- Subtitle: `sliceLabel` (e.g. "10% Off")
- Coupon code in a styled tappable box: `SPIN-A3F9K`
- Expiry: _"Valid till [formatted expiresAt]"_
- "Copy Code" button → copies to clipboard + shows toast "Copied!"
- "Shop Now" button → navigate to home or products

#### Result Modal — No Win

- 😞 Subtle animation
- Title: **"Better Luck Next Time!"**
- Message: _"Come back tomorrow for another spin!"_
- "Browse Deals" button → navigate to offers or products

---

### 4.4 Using the Spin-Won Code at Checkout

No extra work needed. The spin-generated code works exactly like any regular coupon:

1. User opens checkout.
2. Taps "Enter Promo Code".
3. Types or pastes the spin code (e.g. `SPIN-A3F9K`).
4. Calls `POST /api/coupons` to validate — returns `discountAmount`.
5. Discount is applied.

Spin codes are:

- Single-use per user.
- Expire after a configured number of hours (set by admin).
- Case-insensitive at checkout.

---

## 5. Error Handling Reference

### Coupon API Errors

| HTTP | Error                                   | UI Action                                 |
| ---- | --------------------------------------- | ----------------------------------------- |
| 400  | `"Invalid coupon code"`                 | "This code is not valid."                 |
| 400  | `"Coupon has expired"`                  | "This coupon has expired."                |
| 400  | `"Minimum order value of ₹X required"`  | Show as-is                                |
| 400  | `"Coupon usage limit reached"`          | "This coupon is no longer available."     |
| 400  | `"You have already used this coupon"`   | "You've already used this coupon."        |
| 400  | `"Not applicable for products in cart"` | Show as-is                                |
| 500  | Server error                            | "Something went wrong. Please try again." |

### Spin API Errors

| HTTP           | Meaning             | UI Action                             |
| -------------- | ------------------- | ------------------------------------- |
| 200 `no_win`   | Spun, no prize      | Show "Better Luck" modal              |
| 200 `coupon_*` | Won a coupon        | Show win modal with code              |
| 401            | Not logged in       | Redirect to login                     |
| 404            | Campaign disabled   | Hide spin entry point                 |
| 429            | No spins left today | Show countdown to next spin           |
| 500            | Server error        | Show generic error toast, allow retry |

---

## 6. App Checklist

### Coupons

- [ ] Build Coupons / Offers screen
- [ ] Call `GET /api/coupons?storeId=<id>` to list active coupons
- [ ] Show discount type, value, minimum order, expiry
- [ ] "Copy Code" button per coupon
- [ ] Checkout coupon input field
- [ ] Call `POST /api/coupons` with code + orderTotal + cartProductIds + userId
- [ ] Show real-time discount amount after successful validation
- [ ] Handle all error messages inline (not alert popups)
- [ ] Send applied coupon code in order submission payload

### Spin Wheel

- [ ] Add entry point on Home/Offers screen (show only when campaign active + user logged in)
- [ ] Build Spin Wheel screen with animated wheel
- [ ] Call `POST /api/spin/play` with storeId + Firebase auth token
- [ ] Handle all response states: win, no-win, daily limit, not active, 401
- [ ] Show win modal with copyable coupon code
- [ ] Show countdown timer when daily limit reached (resets at midnight IST)
- [ ] Auto-fill spin code in checkout coupon field (optional, via navigation params)
- [ ] Test spin code at checkout end-to-end

---

_Backend developer: [share your domain URL and storeId with the app team before they start integration testing.]_
