# App Order Source Integration Guide

## Purpose

This document ensures all mobile-app orders are stored as APP (not WEB) and are clearly visible in the store dashboard.

## Problem Summary

If the app does not send explicit source information, backend falls back to inference and may save orders as WEB.

## Backend Behavior

Order source is resolved in this order:

1. Request body fields: orderSource, source, platform
2. Request headers: x-order-source, x-client-platform, x-platform, x-app-source
3. User-Agent inference
4. Fallback default: WEB

## API Endpoints Affected

- POST /api/orders
- POST /api/store/checkout

Apply the same source fields to both endpoints.

## Mandatory App Requirements

Send both body and headers for every order-creation call.

### Body

```json
{
  "orderSource": "APP"
}
```

### Headers

```http
Authorization: Bearer <firebase_token>
Content-Type: application/json
x-order-source: app
x-client-platform: android
```

Use x-client-platform: ios for iOS builds.

## Recommended Values

- orderSource: APP
- x-order-source: app
- x-client-platform: android | ios

## React Native Example (fetch)

```javascript
import { Platform } from "react-native";

await fetch(`${BASE_URL}/api/orders`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
    "x-order-source": "app",
    "x-client-platform": Platform.OS,
  },
  body: JSON.stringify({
    ...orderPayload,
    orderSource: "APP",
  }),
});
```

## React Native Example (axios)

```javascript
import axios from "axios";
import { Platform } from "react-native";

await axios.post(
  `${BASE_URL}/api/orders`,
  {
    ...orderPayload,
    orderSource: "APP",
  },
  {
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      "x-order-source": "app",
      "x-client-platform": Platform.OS,
    },
  },
);
```

## If App Uses /api/store/checkout

Repeat the same source payload and headers for POST /api/store/checkout.

## Dashboard Verification

1. Place a fresh order from Android app.
2. Open Store Dashboard > Orders.
3. Confirm source badge shows APP for that order.
4. Place one test order from website.
5. Confirm source badge shows WEB.

## Important Notes

- Existing historical orders will not change automatically.
- Only new orders after app update will be reliable.
- Do not depend only on User-Agent detection.

## Quick Handoff Message

Please update all mobile order placement requests to send:

- Body: orderSource = APP
- Header: x-order-source = app
- Header: x-client-platform = android or ios

Apply to:

- POST /api/orders
- POST /api/store/checkout
