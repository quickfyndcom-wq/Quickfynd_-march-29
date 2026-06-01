# Spin Wheel API Guide for Mobile App

This document is for the mobile app developer. It describes only backend APIs needed for Spin & Win, coupon apply, and free shipping rewards.

## 1) Dashboard API (Admin)

This API is used by dashboard/admin to create and update campaign rules.

Endpoint:

- Method: POST
- URL: /api/store/spin-campaign
- Auth: Bearer seller token

Request body:

```json
{
  "isEnabled": true,
  "campaignName": "Spin & Win",
  "couponPrefix": "SPIN",
  "dailySpinLimit": 1,
  "slices": [
    {
      "label": "10% Off",
      "weight": 20,
      "rewardType": "coupon_percent",
      "discountValue": 10,
      "minOrderValue": 0,
      "expiryHours": 48,
      "color": "#10b981"
    },
    {
      "label": "Free Shipping",
      "weight": 10,
      "rewardType": "free_shipping",
      "discountValue": 0,
      "minOrderValue": 0,
      "expiryHours": 24,
      "color": "#3b82f6"
    },
    {
      "label": "Better Luck Next Time",
      "weight": 70,
      "rewardType": "no_win",
      "discountValue": 0,
      "minOrderValue": 0,
      "expiryHours": 48,
      "color": "#6366f1"
    }
  ]
}
```

Allowed rewardType values:

- coupon_percent
- coupon_flat
- free_shipping
- no_win

## 2) Public API for App (Read campaign)

Use this in mobile app to decide if Spin entry point should be shown.

Endpoint:

- Method: GET
- URL: /api/spin/campaign?storeId=<storeId>
- Auth: none

Success response (enabled):

```json
{
  "isEnabled": true,
  "lastUpdatedAt": "2026-05-04T11:15:22.000Z",
  "campaign": {
    "storeId": "64f1a2b3c4d5e6f708091a2b",
    "campaignName": "Spin & Win",
    "dailySpinLimit": 1,
    "couponPrefix": "SPIN",
    "slices": [
      {
        "label": "Free Shipping",
        "color": "#3b82f6",
        "weight": 10,
        "rewardType": "free_shipping",
        "discountValue": 0,
        "minOrderValue": 0,
        "expiryHours": 24
      }
    ]
  }
}
```

Success response (disabled):

```json
{
  "isEnabled": false,
  "lastUpdatedAt": null,
  "campaign": null
}
```

## 3) Play Spin API (Customer)

Endpoint:

- Method: POST
- URL: /api/spin/play
- Auth: Bearer customer Firebase token

Request:

```json
{
  "storeId": "64f1a2b3c4d5e6f708091a2b"
}
```

Possible success responses:

Win coupon:

```json
{
  "sliceLabel": "10% Off",
  "rewardType": "coupon_percent",
  "couponCode": "SPIN-A3F9K",
  "discountValue": 10,
  "freeShipping": false,
  "minOrderValue": 0,
  "expiresAt": "2026-05-05T18:30:00.000Z",
  "message": "Congratulations! You won: 10% Off. Use code SPIN-A3F9K at checkout."
}
```

Win free shipping:

```json
{
  "sliceLabel": "Free Shipping",
  "rewardType": "free_shipping",
  "couponCode": "SPIN-FS2K9",
  "discountValue": 0,
  "freeShipping": true,
  "minOrderValue": 0,
  "expiresAt": "2026-05-05T18:30:00.000Z",
  "message": "Congratulations! You won Free Shipping. Use code SPIN-FS2K9 at checkout."
}
```

No win:

```json
{
  "sliceLabel": "Better Luck Next Time",
  "rewardType": "no_win",
  "couponCode": null,
  "discountValue": 0,
  "freeShipping": false,
  "minOrderValue": 0,
  "expiresAt": null,
  "message": "Better luck next time! You can spin again tomorrow."
}
```

Error responses:

- 401: missing/invalid token
- 404: spin not active
- 429: daily limit reached

## 4) Coupon Apply API (Checkout)

Endpoint:

- Method: POST
- URL: /api/coupons
- Auth: none (send userId if logged in)

Request:

```json
{
  "code": "SPIN-FS2K9",
  "storeId": "64f1a2b3c4d5e6f708091a2b",
  "orderTotal": 899,
  "userId": "firebase_uid",
  "cartProductIds": ["p1", "p2"]
}
```

Response for free shipping coupon:

```json
{
  "success": true,
  "valid": true,
  "coupon": {
    "code": "SPIN-FS2K9",
    "title": "Free Shipping (Spin Reward)",
    "description": "You won this coupon by spinning! Use it on your next order.",
    "discountType": "free_shipping",
    "discountValue": 0,
    "discountAmount": 0,
    "freeShipping": true
  }
}
```

Important app behavior:

- If coupon.freeShipping is true, set shipping charge to 0 in app checkout summary.
- Keep product subtotal discount logic unchanged.
- Do not rely only on discountAmount for this case (it will be 0).

## 5.1 Dashboard to App Sync Guarantee

Any campaign update done in dashboard (POST /api/store/spin-campaign) should be visible in app immediately.

Backend behavior implemented:

- GET /api/spin/campaign is no-cache (`Cache-Control: no-store`) so app gets fresh data every call.
- API also returns `lastUpdatedAt` timestamp from campaign `updatedAt`.

App integration rule:

- Always call GET /api/spin/campaign on app launch and when opening spin screen.
- Do not cache this response for long duration.
- If `lastUpdatedAt` changed from previous value, refresh spin UI state instantly.

## 6) App Implementation Rules

1. Show spin entry only when GET /api/spin/campaign returns isEnabled true.
2. Require login before POST /api/spin/play.
3. Save won couponCode to app state so user can apply in checkout quickly.
4. During coupon apply:
   - normal coupon: use coupon.discountAmount for subtotal discount
   - free shipping coupon: set shipping fee to 0 when coupon.freeShipping is true
5. Keep existing error handling for invalid/expired/usage-limit coupons.

## 7) Quick Test Cases

1. free_shipping slice win -> spin response must have freeShipping true and couponCode not null.
2. apply free_shipping code -> /api/coupons response must have freeShipping true.
3. checkout total should reduce by shipping fee amount (not by subtotal percentage/fixed discount).
4. no_win slice -> no coupon code, user sees try again tomorrow message.

## 8) Handoff Checklist (Must Share)

Before app integration starts, share these exact values with the app developer:

1. API Base URL (example: https://yourdomain.com)
2. storeId (24-char MongoDB store id)
3. Firebase auth is required for POST /api/spin/play
4. Reward types used in campaign (especially free_shipping)

If any one of these is missing, the app team cannot test end-to-end correctly.

## 9) Copy-Paste Message for App Developer

Use this message directly in your app developer group:

```text
Please integrate Spin APIs using this document: APP_SPIN_API_APP_DEVELOPER.md

Environment:
- Base URL: <PUT_BASE_URL>
- storeId: <PUT_STORE_ID>

Implement these APIs in app:
1) GET /api/spin/campaign?storeId=<storeId>
2) POST /api/spin/play (Firebase user token required)
3) POST /api/coupons (apply coupon in checkout)

Important:
- If coupon.freeShipping === true, set shipping fee to 0 in checkout.
- Do not rely only on discountAmount for free shipping (it is 0 by design).

Please complete test cases from section "Quick Test Cases" in the doc.
```
