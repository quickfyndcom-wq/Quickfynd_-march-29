# App Developer Integration Guide — Spin Wheel & Promotions

This document describes everything the mobile app developer needs to implement to support the **Spin Wheel Campaign** feature. The backend is fully ready; the app needs to build the UI and wire up the APIs.

---

## 1. Overview

Customers open the app, navigate to the Spin Wheel screen, spin once per day (configurable), and win a promo code they can paste at checkout. Promo codes are real coupons stored in the backend — the checkout flow already accepts them with no extra changes needed.

---

## 2. Backend APIs

### Base URL

All API calls go to your existing API base URL (e.g., `https://yourdomain.com`).

### Authentication

All spin calls require a Firebase ID token in the `Authorization: Bearer <token>` header.

---

### 2.1 Get Spin Campaign Settings (Public)

**GET** `/api/spin/campaign`

> ⚠️ This endpoint doesn't exist yet on the backend. The app can call **`POST /api/spin/play`** directly and handle the "not active" error gracefully, **OR** you can add a lightweight public endpoint. The simplest approach: call `/api/spin/play` and if `isEnabled` is false the server returns a 404 with `{ error: "Spin wheel is not active" }` — hide the spin button in that case.

Alternatively call: **GET** `/api/store/spin-campaign` (admin-only — do NOT call this from the customer app).

---

### 2.2 Play Spin

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

> The `storeId` is the MongoDB `_id` of the store. Hardcode this in your app config — it won't change.

**Success Response (200):**

```json
{
  "sliceLabel": "10% Off",
  "rewardType": "coupon_percent",
  "couponCode": "SPIN-A3F9K",
  "discountValue": 10,
  "minOrderValue": 0,
  "expiresAt": "2025-04-01T10:30:00.000Z",
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
  "nextSpinAt": "2025-03-31T00:00:00.000Z"
}
```

**Spin not active (404):**

```json
{
  "error": "Spin wheel is not active"
}
```

---

### 2.3 Apply Coupon at Checkout

No changes needed — the existing checkout coupon field accepts spin-generated codes exactly like any other coupon. The code is single-use per user and expires after the configured hours.

---

## 3. Screens to Build

### 3.1 Spin Wheel Entry Point

Add a prominent entry point on the **Home screen** or **Offers screen** that appears only when the spin campaign is active. Suggestions:

- A banner card with "🎡 Spin & Win" label
- A floating action button or animated wheel icon

**Logic:**

- Show/hide this entry based on whether the spin campaign is active. Try calling `POST /api/spin/play` when the user taps; if response is 404 (`not active`), hide the button.
- Alternatively, store a flag in your remote config or fetch it from an internal status endpoint.

---

### 3.2 Spin Wheel Screen (`SpinWheelScreen`)

**Layout:**

- A full-screen or bottom-sheet screen with an animated spinning wheel graphic.
- The wheel should display the slice labels and colors from the last known campaign configuration (see Section 3.3 for how to get slice data).
- A large **"SPIN"** button in the center or below the wheel.
- After spinning, show the result modal (Section 3.4).

**Behavior:**

1. On load, check if user has spins remaining (handle 429 gracefully).
2. When user taps SPIN:
   - Animate the wheel spinning for 2–3 seconds.
   - Call `POST /api/spin/play` during animation.
   - When response arrives, stop wheel on the winning slice.
   - Show result modal.
3. After winning/losing, disable SPIN button and show "Come back tomorrow" message with a countdown timer.

**Wheel animation note:** Since the backend picks the winner randomly, animate the wheel for a fixed 2–3 seconds and then orient the wheel to land on the winning slice label received from the API. Don't try to predict the result before the API returns.

---

### 3.3 Fetching Wheel Configuration for Display

To render the wheel with correct colors and labels, you have two options:

**Option A (Recommended):** Hardcode a sensible default wheel layout and let the server response drive the result display. The slice visuals are cosmetic.

**Option B:** Add a public API endpoint `GET /api/spin/config` (backend not yet created) that returns:

```json
{
  "isEnabled": true,
  "campaignName": "Spin & Win",
  "slices": [
    { "label": "Better Luck Next Time", "color": "#6366f1", "weight": 40 },
    { "label": "5% Off", "color": "#f59e0b", "weight": 25 },
    { "label": "10% Off", "color": "#10b981", "weight": 15 },
    { "label": "₹50 Off", "color": "#ef4444", "weight": 10 },
    { "label": "Better Luck Next Time", "color": "#3b82f6", "weight": 10 }
  ]
}
```

Ask the backend developer to create this endpoint using the `SpinCampaign` model.

---

### 3.4 Result Modal

After the wheel stops, show a modal:

**Win case (`rewardType !== 'no_win'`):**

- 🎉 Confetti animation
- Title: "You Won!"
- Subtitle: The `sliceLabel` (e.g., "10% Off")
- Coupon code displayed in a tappable/copyable box: `SPIN-A3F9K`
- Expiry: "Valid until [formatted expiresAt]"
- CTA: "Shop Now" → navigate to home/products
- Secondary: "Copy Code" → copies couponCode to clipboard + shows toast "Copied!"

**No-win case:**

- 😞 Subtle animation
- Title: "Better Luck Next Time"
- Message: "Come back tomorrow for another spin!"
- CTA: "Browse Deals" → navigate to offers/products

---

### 3.5 My Coupons Screen (Optional Enhancement)

If you have a "My Wallet" or "My Coupons" screen, spin-won coupons will automatically appear in the existing coupons list since they are stored in the `Coupon` collection (non-public, single-use, linked to the store). You can filter/display them with a "Spin Reward" badge if you add a `source` field to the Coupon model (ask backend to add `source: 'spin'` field).

---

## 4. Checkout Coupon Redemption

No extra work needed. The existing checkout coupon flow handles spin codes because:

- Spin codes are stored in the `Coupon` collection with `isActive: true`
- They have `maxUsesPerUser: 1` and `maxUses: 1`
- They have an `expiresAt` date
- The existing checkout coupon validation API checks all of these

**User flow at checkout:**

1. User opens checkout screen
2. Taps "Enter Promo Code"
3. Types or pastes their spin code (e.g., `SPIN-A3F9K`)
4. Discount is applied automatically

---

## 5. Deep Link / Navigation

If you send a push notification after a spin result (e.g., "Congrats! Your code is SPIN-A3F9K"), deep link to the Spin Result screen or the checkout screen with the code pre-filled:

```
yourapp://spin/result?code=SPIN-A3F9K
yourapp://checkout?coupon=SPIN-A3F9K
```

Handle these routes in your app's navigation router.

---

## 6. Error Handling Summary

| HTTP Status                    | Meaning             | UI Action                                |
| ------------------------------ | ------------------- | ---------------------------------------- |
| 200 `rewardType: no_win`       | Spun, no prize      | Show "Better Luck" modal                 |
| 200 `rewardType: coupon_*`     | Won a coupon        | Show win modal with code                 |
| 401                            | Not logged in       | Redirect to login                        |
| 404 `Spin wheel is not active` | Campaign disabled   | Hide spin entry point                    |
| 429 `daily limit`              | No spins left today | Show "Come back tomorrow" with countdown |
| 500                            | Server error        | Show generic error toast, allow retry    |

---

## 7. Store ID

Ask the admin/backend developer for the `storeId` value to hardcode in the app config. This is the MongoDB `_id` of the store document (24-character hex string).

Example: `"storeId": "64f1a2b3c4d5e6f708091a2b"`

---

## 8. Checklist for App Developer

- [ ] Add Spin Wheel screen with animated wheel
- [ ] Add entry point on Home/Offers screen (conditionally shown)
- [ ] Wire up `POST /api/spin/play` with storeId + auth token
- [ ] Handle all response states (win, no-win, daily limit, not active)
- [ ] Show result modal with copyable coupon code
- [ ] Add countdown timer for "next spin available" state
- [ ] Test with checkout — paste the spin code in coupon field
- [ ] (Optional) Add deep link handler for `yourapp://spin/result`
- [ ] (Optional) Show spin reward coupons in "My Coupons" screen

---

## 9. Notes

- Spin limit resets at **midnight IST** (the backend uses UTC date `YYYY-MM-DD`; make sure your countdown timer accounts for the timezone offset).
- Coupon codes are **case-insensitive** at checkout (backend stores uppercase, comparison is uppercase).
- Expired or used coupon codes show an error at checkout — inform the user to spin again the next day.
