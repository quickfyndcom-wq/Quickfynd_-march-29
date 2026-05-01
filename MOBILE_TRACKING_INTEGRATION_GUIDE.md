# Mobile Tracking Integration Guide

This document explains how to implement shipment tracking in your mobile app using the existing backend.

Supported providers:

- Delhivery
- India Post (direct API)
- 17track (fallback for India Post)

Primary API for mobile:

- `GET /api/track-order`

---

## 1. API Endpoint (Mobile)

### `GET /api/track-order`

Query params:

- `awb` (preferred) - AWB/tracking number
- `orderId` (alias of `awb`) - can pass AWB, Mongo ObjectId, or short order number
- `phone` (fallback) - customer phone number
- `carrier` (optional) - set to `delhivery` for direct Delhivery lookup

At least one of `awb` or `phone` is required.

Examples:

```http
GET /api/track-order?awb=46671410006252
GET /api/track-order?orderId=55254
GET /api/track-order?carrier=delhivery&awb=46671410006252
GET /api/track-order?phone=9876543210
```

---

## 2. Response Shape

Success:

```json
{
  "success": true,
  "order": {
    "_id": "...",
    "status": "SHIPPED",
    "trackingId": "46671410006252",
    "trackingUrl": "...",
    "courier": "Delhivery",
    "shortOrderNumber": 55254,
    "delhivery": { ... },
    "indiaPost": { ... },
    "orderItems": [ ... ],
    "total": 777
  }
}
```

Error:

```json
{
  "success": false,
  "message": "..."
}
```

Common status codes:

- `200` success
- `400` missing required query params
- `404` order not found
- `503` provider unavailable (example: Delhivery token missing/invalid)
- `500` internal error

---

## 3. Delhivery Contract

When Delhivery tracking is available, backend returns:

```json
{
  "courier": "Delhivery",
  "trackingId": "46671410006252",
  "trackingUrl": "https://www.delhivery.com/track/package/46671410006252",
  "delhivery": {
    "waybill": "46671410006252",
    "current_status": "In Transit",
    "current_status_time": "2026-04-30T17:43:10.000",
    "current_status_location": "Kozhikode_Central_H (Kerala)",
    "expected_delivery_date": "2026-05-04T00:00:00.000Z",
    "expected_return_date": "2026-05-04T00:00:00.000Z",
    "origin": "...",
    "destination": "...",
    "events": [
      {
        "time": "2026-04-30T17:43:10.000",
        "status": "In Transit",
        "location": "Kozhikode_Central_H (Kerala)",
        "remarks": "Bag Received at Facility"
      }
    ],
    "payment": {
      "is_cod_recovered": false,
      "cod_amount": 0,
      "payment_method": "",
      "payment_status": "",
      "payment_collected_at": null
    }
  }
}
```

Notes:

- `expected_delivery_date` is normalized from multiple Delhivery keys (`ExpectedDeliveryDate`, `EDD`, Promise-like fields, nested fields).
- If delivery date is not present but return date exists, backend may use return date as fallback.

---

## 4. India Post + 17track Contract

If courier is India Post, backend tries:

1. India Post direct API (if `INDIAPOST_USERNAME` + `INDIAPOST_PASSWORD` are configured)
2. 17track fallback (store/global key based)

### Returned `indiaPost` object

```json
{
  "indiaPost": {
    "awb": "EB123456789IN",
    "statusCode": 10,
    "statusLabel": "In Transit",
    "isDelivered": false,
    "deliveredAt": null,
    "currentLocation": "Kozhikode",
    "latestEvent": {
      "time": "2026-04-30 10:30",
      "description": "Bag Received at Facility",
      "location": "Kozhikode",
      "country": "IN"
    },
    "events": [ ... ],
    "source": "indiapost"
  }
}
```

If 17track fallback is used:

- `source` = `17track`
- fields stay in the same normalized structure (`statusCode`, `statusLabel`, `events`, etc.)

---

## 5. Mobile UI Mapping Recommendation

Use this priority:

1. If `order.delhivery` exists: render Delhivery card
2. Else if `order.indiaPost` exists: render India Post card
3. Else show generic order status only

Suggested labels:

- Current status: `delhivery.current_status` or `indiaPost.statusLabel`
- Current location: `delhivery.current_status_location` or `indiaPost.currentLocation`
- Expected date:
  - Delhivery: `delhivery.expected_delivery_date`
  - fallback: `delhivery.expected_return_date`
- Timeline/events:
  - Delhivery: `delhivery.events`
  - India Post: `indiaPost.events`

---

## 6. Recommended Mobile Polling

For tracking screen:

- refresh every `30-60s` while screen is open
- stop polling when order reaches terminal status:
  - `DELIVERED`, `CANCELLED`, `RETURNED`, `RTO`

For order list:

- refresh on pull-to-refresh
- background refresh every `60-120s` if user is on Orders screen

---

## 7. Environment Variables (Backend)

### Delhivery

- `DELHIVERY_API_TOKEN`

### India Post direct

- `INDIAPOST_USERNAME`
- `INDIAPOST_PASSWORD`
- Optional:
  - `INDIAPOST_API_BASE_URL`
  - `INDIAPOST_MASTERDATA_BASE_URL`

### 17track

- `SEVENTEENTRACK_API_KEY`
- Optional:
  - `SEVENTEENTRACK_API_URL`

Also supported per-store (from store integrations):

- `baseUrl`
- `apiKey`
- `publicKey`
- `secretKey`

---

## 8. Mobile Integration Checklist

1. Call `GET /api/track-order?awb=<value>`
2. Handle `success: false` responses and display message
3. Render tracking card by provider (`delhivery` vs `indiaPost`)
4. Show event timeline sorted newest first (already normalized)
5. Show expected date from Delhivery fields
6. Add polling on tracking screen (30-60s)
7. Stop polling for terminal statuses

---

## 9. Quick Test Cases

1. Delhivery AWB with expected date:

- verify `expected_delivery_date` appears

2. India Post AWB with direct API enabled:

- verify `source: indiapost`

3. India Post AWB with direct API disabled:

- verify fallback `source: 17track`

4. Invalid AWB:

- verify 404/503 handling in app UI

---

## 10. Notes for Mobile Team

- Do not call provider APIs directly from the app.
- Always call your backend `/api/track-order` to keep tokens secure and response shape consistent.
- Use backend-normalized fields only (`delhivery`, `indiaPost`) to avoid provider-specific parsing differences.
