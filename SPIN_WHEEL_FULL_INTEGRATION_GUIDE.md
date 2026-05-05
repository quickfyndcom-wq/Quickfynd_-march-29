# Spin Wheel Feature — Full Integration Guide

Last updated: May 5, 2026
Production Base URL: https://quickfynd.com
Store ID: 692d73ec8751adb0313018fa
Firebase Project: quickfynd

---

## Overview

The Spin & Win feature lets customers spin a wheel on the app or website to win discount coupons or free shipping rewards.

- Seller configures slices (prizes), weights, and coupon settings from the dashboard
- Customer spins once per day (configurable)
- Backend picks a winner by weighted random
- A unique coupon is auto-created in the Coupon collection and returned
- Coupon can be applied at checkout

---

## How It Works (Flow)

```
1. App calls GET /api/spin/campaign?storeId=...
   └── Check isEnabled. If false → hide spin wheel UI.

2. Customer taps "Spin"
   └── App calls POST /api/spin/play with Firebase token + storeId

3. Backend:
   ├── Verifies token
   ├── Checks daily spin limit (SpinLog collection)
   ├── Picks slice by weighted random
   ├── Creates coupon in DB (if reward is not no_win)
   └── Returns result with couponCode

4. App shows result animation + coupon code

5. Customer uses coupon at checkout
```

---

## Auth

Customer-facing APIs require Firebase ID token:

```
Authorization: Bearer <firebase_id_token>
```

Firebase project ID: `quickfynd`

---

## API Endpoints

---

### 1. Get Spin Campaign Config (Public)

```
GET /api/spin/campaign?storeId=692d73ec8751adb0313018fa
```

No auth required.

**Purpose:** Load wheel config before showing the spin screen. Check `isEnabled` first.

**Response 200 (active campaign):**

```json
{
  "isEnabled": true,
  "campaign": {
    "storeId": "692d73ec8751adb0313018fa",
    "campaignName": "Spin & Win",
    "dailySpinLimit": 1,
    "couponPrefix": "SPIN",
    "slices": [
      {
        "label": "10% Off",
        "color": "#6366f1",
        "weight": 30,
        "rewardType": "coupon_percent",
        "discountValue": 10,
        "minOrderValue": 0,
        "expiryHours": 48
      },
      {
        "label": "Free Shipping",
        "color": "#22c55e",
        "weight": 10,
        "rewardType": "free_shipping",
        "discountValue": 0,
        "minOrderValue": 0,
        "expiryHours": 48
      },
      {
        "label": "₹50 Off",
        "color": "#f59e0b",
        "weight": 20,
        "rewardType": "coupon_flat",
        "discountValue": 50,
        "minOrderValue": 300,
        "expiryHours": 48
      },
      {
        "label": "Better Luck",
        "color": "#94a3b8",
        "weight": 40,
        "rewardType": "no_win",
        "discountValue": 0,
        "minOrderValue": 0,
        "expiryHours": 48
      }
    ]
  },
  "lastUpdatedAt": "2026-05-05T10:00:00.000Z"
}
```

**Response 200 (disabled or not configured):**

```json
{
  "isEnabled": false,
  "campaign": null,
  "lastUpdatedAt": null
}
```

**Errors:**

| Code | Message                                        |
| ---- | ---------------------------------------------- |
| 400  | `{ "error": "storeId is required" }`           |
| 500  | `{ "error": "Failed to fetch spin campaign" }` |

---

### 2. Play Spin (Customer Auth)

```
POST /api/spin/play
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**

```json
{
  "storeId": "692d73ec8751adb0313018fa"
}
```

**Response 200 (won a coupon):**

```json
{
  "sliceLabel": "10% Off",
  "rewardType": "coupon_percent",
  "couponCode": "SPIN-A3F9K",
  "discountValue": 10,
  "freeShipping": false,
  "minOrderValue": 0,
  "expiresAt": "2026-05-07T10:00:00.000Z",
  "message": "Congratulations! You won: 10% Off. Use code SPIN-A3F9K at checkout."
}
```

**Response 200 (won free shipping):**

```json
{
  "sliceLabel": "Free Shipping",
  "rewardType": "free_shipping",
  "couponCode": "SPIN-B7ZXM",
  "discountValue": 0,
  "freeShipping": true,
  "minOrderValue": 0,
  "expiresAt": "2026-05-07T10:00:00.000Z",
  "message": "Congratulations! You won Free Shipping. Use code SPIN-B7ZXM at checkout."
}
```

**Response 200 (no win):**

```json
{
  "sliceLabel": "Better Luck",
  "rewardType": "no_win",
  "couponCode": null,
  "discountValue": 0,
  "freeShipping": false,
  "minOrderValue": 0,
  "expiresAt": null,
  "message": "Better luck next time! You can spin again tomorrow."
}
```

**Response 429 (daily limit reached):**

```json
{
  "error": "You have used all your spins for today. Come back tomorrow!",
  "nextSpinAt": "2026-05-06T00:00:00.000Z"
}
```

**All Errors:**

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 400  | `storeId is required`                   |
| 401  | Missing or invalid Firebase token       |
| 404  | Spin wheel is not active for this store |
| 429  | Daily spin limit reached                |
| 500  | Internal server error                   |

---

## Reward Types Reference

| `rewardType`     | Meaning              | `couponCode` | `freeShipping` |
| ---------------- | -------------------- | ------------ | -------------- |
| `coupon_percent` | % discount off order | ✅ returned  | false          |
| `coupon_flat`    | Fixed ₹ amount off   | ✅ returned  | false          |
| `free_shipping`  | Free shipping coupon | ✅ returned  | true           |
| `no_win`         | No reward            | null         | false          |

---

## Slice Weight (Probability) Logic

Weights are relative, not percentages. Example:

| Slice         | Weight | Chance       |
| ------------- | ------ | ------------ |
| 10% Off       | 30     | 30/100 = 30% |
| Free Shipping | 10     | 10/100 = 10% |
| ₹50 Off       | 20     | 20/100 = 20% |
| Better Luck   | 40     | 40/100 = 40% |

Total weight = 100 in this example, but any values work — backend normalises by sum.

---

## Database Models

### SpinCampaign

One document per store. Stores all wheel configuration.

| Field            | Type            | Description                                           |
| ---------------- | --------------- | ----------------------------------------------------- |
| `storeId`        | String (unique) | Store identifier                                      |
| `isEnabled`      | Boolean         | Whether wheel is active                               |
| `campaignName`   | String          | Display name                                          |
| `couponPrefix`   | String          | Prefix for generated codes e.g. `SPIN` → `SPIN-A3F9K` |
| `dailySpinLimit` | Number          | Max spins per user per day (1–10)                     |
| `slices`         | Array           | Prize slices (see below)                              |

**Slice fields:**

| Field           | Type   | Description                                                |
| --------------- | ------ | ---------------------------------------------------------- |
| `label`         | String | Display text on wheel                                      |
| `weight`        | Number | Relative probability                                       |
| `rewardType`    | String | `coupon_percent`, `coupon_flat`, `free_shipping`, `no_win` |
| `discountValue` | Number | 10 = 10% or ₹10 flat                                       |
| `minOrderValue` | Number | Min cart value to apply coupon                             |
| `expiryHours`   | Number | Hours until coupon expires (default 48)                    |
| `color`         | String | Hex color for wheel slice                                  |

---

### SpinLog

One document per spin. Used for daily limit enforcement.

| Field        | Type   | Description                          |
| ------------ | ------ | ------------------------------------ |
| `userId`     | String | Firebase UID of customer             |
| `storeId`    | String | Store ID                             |
| `spinDate`   | String | `YYYY-MM-DD` (for daily limit check) |
| `rewardType` | String | What they won                        |
| `couponCode` | String | Coupon code if any                   |
| `sliceLabel` | String | Which slice landed                   |

**Index:** `(userId, storeId, spinDate)` — fast daily count queries.

---

## Seller Dashboard Config API

These are for the admin/seller dashboard only, not for customer app.

### GET /api/store/spin-campaign

Auth: Seller Firebase token

Returns full campaign document for editing in dashboard.

### POST /api/store/spin-campaign

Auth: Seller Firebase token

Body:

```json
{
  "isEnabled": true,
  "campaignName": "Spin & Win",
  "couponPrefix": "SPIN",
  "dailySpinLimit": 1,
  "slices": [
    {
      "label": "10% Off",
      "weight": 30,
      "rewardType": "coupon_percent",
      "discountValue": 10,
      "minOrderValue": 0,
      "expiryHours": 48,
      "color": "#6366f1"
    }
  ]
}
```

Upserts the campaign (creates if not exists, updates if exists).

---

## Recommended App Integration Flow

### Step 1 — On spin screen load

```js
const res = await fetch(
  `https://quickfynd.com/api/spin/campaign?storeId=692d73ec8751adb0313018fa`,
);
const data = await res.json();

if (!data.isEnabled) {
  // Hide spin wheel UI
  return;
}

// Render wheel using data.campaign.slices
// Each slice: { label, color, weight, rewardType, discountValue, minOrderValue }
```

### Step 2 — When customer taps Spin

```js
const token = await firebase.auth().currentUser.getIdToken();

const res = await fetch("https://quickfynd.com/api/spin/play", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ storeId: "692d73ec8751adb0313018fa" }),
});

const result = await res.json();

if (res.status === 429) {
  showMessage("Come back tomorrow to spin again!");
  return;
}

if (res.status !== 200) {
  showMessage(result.error || "Something went wrong");
  return;
}

// Animate wheel to result.sliceLabel
// Then show result.message and result.couponCode
```

### Step 3 — Display result

```
if result.rewardType === 'no_win':
  Show: "Better luck next time!"

if result.rewardType === 'coupon_percent':
  Show: "You won {result.discountValue}% off!"
  Show coupon code prominently with copy button

if result.rewardType === 'coupon_flat':
  Show: "You won ₹{result.discountValue} off!"
  Show coupon code with copy button

if result.rewardType === 'free_shipping':
  Show: "You won Free Shipping!"
  Show coupon code with copy button

Show expiry: result.expiresAt (format as "Valid until DD/MM/YYYY")
Show min order if result.minOrderValue > 0: "Min order ₹{minOrderValue}"
```

---

## Wheel Rendering Tips

Use `slices` from the campaign config to draw the wheel:

- Each slice angle = `(slice.weight / totalWeight) * 360`
- Use `slice.color` for fill color
- Use `slice.label` for text
- Do NOT use weight values from the client to determine winner — always trust the server response

The server picks the winner. Animate to the returned `sliceLabel` after the API responds.

---

## Notes

- Daily spin limit resets at midnight UTC (spinDate is `YYYY-MM-DD` in UTC)
- Coupon codes are single-use (`maxUsesPerUser: 1`)
- `free_shipping` coupons have `discountValue: 0` but set `freeShipping: true` on the coupon
- `no_win` slices do NOT create a coupon — `couponCode` will be `null`
- Coupon expiry is controlled per-slice via `expiryHours` (default 48 hours)
- All slice colors are valid hex codes (`#RRGGBB`)
