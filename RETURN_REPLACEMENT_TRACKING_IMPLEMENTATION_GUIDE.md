# Return and Replacement Tracking Implementation Guide

## Overview

This document explains how to implement and maintain separate tracking for:

1. Return shipment: Customer to Seller
2. Replacement shipment: Seller to Customer

It is aligned with the current app code and API behavior.

## Data Model

File: models/Order.js

### Nested per-request tracking (source of truth for request history)

Inside `returns[]` each request has:

- `type`: `RETURN | REPLACEMENT`
- `status`: `REQUESTED | APPROVED | REJECTED | COMPLETED`
- Return tracking fields:
  - `returnTrackingId`
  - `returnCourier`
  - `returnTrackingUrl`
- Replacement tracking fields:
  - `replacementTrackingId`
  - `replacementCourier`
  - `replacementTrackingUrl`

### Top-level tracking mirrors (for quick access)

- `returnTrackingId`
- `returnCourier`
- `returnTrackingUrl`
- `replacementTrackingId`
- `replacementCourier`
- `replacementTrackingUrl`

## UI Rules (Seller Modal)

File: app/store/orders/page.jsx

### Tracking section visibility

- Show **Return Tracking** input only when there is an approved return request:
  - request `type = RETURN`
  - request `status` contains `APPROVED`
- Show **Replacement Tracking** input only when there is an approved replacement request:
  - request `type = REPLACEMENT`
  - request `status` contains `APPROVED`

### Main order tracking label

Current label in seller modal:

- `Order Tracking (Customer to Warehouse)`

## Save Flow (Seller)

File: app/store/orders/page.jsx
Function: `updateTrackingDetails`

### Payload fields sent to API

- Order tracking:
  - `status`
  - `trackingId`
  - `courier`
  - `trackingUrl`
- Return tracking:
  - `returnTrackingId`
  - `returnCourier`
  - `returnTrackingUrl`
  - `returnRequestIndex` (index of approved RETURN request)
- Replacement tracking:
  - `replacementTrackingId`
  - `replacementCourier`
  - `replacementTrackingUrl`
  - `replacementRequestIndex` (index of approved REPLACEMENT request)

### URL generation

If courier is Delhivery and URL is empty:

- Return URL auto-generated from return AWB
- Replacement URL auto-generated from replacement AWB

### Save reliability behavior

After first save:

- Code verifies response contains saved return/replacement values.
- If missing, it retries once with explicit indexed payload.
- Form state is then forced to keep entered values as fallback to prevent empty fields after success toast.

## API Update Logic

File: app/api/store/orders/[orderId]/route.js
Method: `PUT`

### What API updates

1. Updates top-level tracking fields (if provided)
2. Updates nested `returns[]` entry fields using index-aware mapping

### Index mapping priority

For return tracking updates:

1. Use `returnRequestIndex` if valid
2. Else latest approved request of type RETURN
3. Else latest request of type RETURN
4. Else fallback to last `returns[]` item

For replacement tracking updates:

1. Use `replacementRequestIndex` if valid
2. Else latest approved request of type REPLACEMENT
3. Else latest request of type REPLACEMENT
4. Else fallback to last `returns[]` item

## Customer-Side Display

File: app/dashboard/orders/OrdersPageClient.jsx

- Approved return/replacement cards show tracking details.
- UI reads nested request tracking values first.
- Top-level fields are used as fallback.

## Customer Order Dashboard (Mandatory)

This section must be implemented in the customer order dashboard.

File: app/dashboard/orders/OrdersPageClient.jsx

### What customer must see

For each order, in return/replacement request cards:

1. Return tracking block when RETURN request is approved
2. Replacement tracking block when REPLACEMENT request is approved
3. Tracking ID, courier name, and tracking link (if URL exists)
4. Status-friendly text (for example: Return Shipment Tracking, Replacement Shipment Tracking)

### Data selection logic in customer dashboard

Use the same fallback logic used in app integration:

1. Read latest approved request by type from order.returns[]
2. Use nested tracking fields from that approved row
3. If nested fields are empty, fallback to top-level fields

### Render conditions

- Do not show replacement tracking if only return is approved.
- Do not show return tracking if only replacement is approved.
- If both are approved in different request rows, show both sections.
- If request is only REQUESTED/REJECTED (not approved), hide tracking section for that type.

### Customer tracking links

- Show Track Return Shipment button if returnTrackingUrl exists.
- Show Track Replacement Shipment button if replacementTrackingUrl exists.
- If URL is missing, still show tracking ID and courier (no button).

### Refresh behavior in dashboard

- After seller saves tracking, customer dashboard should reflect values after next orders fetch.
- Recommended: re-fetch orders on page load and when order accordion/card expands.
- Do not clear existing customer-visible tracking fields during refresh unless API returns explicit empty values for both nested and top-level fields.

### Customer validation checklist

1. Seller approves RETURN and enters return tracking.
2. Customer dashboard shows Return Tracking block with ID/courier/url.
3. Seller approves REPLACEMENT and enters replacement tracking.
4. Customer dashboard shows Replacement Tracking block with ID/courier/url.
5. Reopen customer order details and confirm fields remain visible.
6. Confirm fallback works when nested value is missing but top-level value exists.

## App Integration (Required)

Use this section when implementing in mobile app / web app clients so tracking IDs are always visible.

### API response fields app must read

From each order object:

- Nested request fields (`order.returns[]`):
  - `returnTrackingId`
  - `returnCourier`
  - `returnTrackingUrl`
  - `replacementTrackingId`
  - `replacementCourier`
  - `replacementTrackingUrl`
- Top-level fallback fields:
  - `order.returnTrackingId`
  - `order.returnCourier`
  - `order.returnTrackingUrl`
  - `order.replacementTrackingId`
  - `order.replacementCourier`
  - `order.replacementTrackingUrl`

### App fallback order (important)

For Return tracking display:

1. Find latest approved RETURN request from `order.returns[]`
2. Use request-level fields from that row
3. If empty, fallback to top-level return fields

For Replacement tracking display:

1. Find latest approved REPLACEMENT request from `order.returns[]`
2. Use request-level fields from that row
3. If empty, fallback to top-level replacement fields

### App display rules

- Show Return tracking card only if RETURN request is approved.
- Show Replacement tracking card only if REPLACEMENT request is approved.
- Show tracking button only when tracking URL exists.
- Show courier and tracking ID even if URL is missing.

### Example app mapping pseudo-code

```js
const approvedReturn = [...(order.returns || [])]
  .reverse()
  .find(
    (r) =>
      (r.type || "").toUpperCase() === "RETURN" &&
      (r.status || "").toUpperCase().includes("APPROVED"),
  );

const approvedReplacement = [...(order.returns || [])]
  .reverse()
  .find(
    (r) =>
      (r.type || "").toUpperCase() === "REPLACEMENT" &&
      (r.status || "").toUpperCase().includes("APPROVED"),
  );

const returnTracking = {
  id: approvedReturn?.returnTrackingId || order.returnTrackingId || "",
  courier: approvedReturn?.returnCourier || order.returnCourier || "",
  url: approvedReturn?.returnTrackingUrl || order.returnTrackingUrl || "",
};

const replacementTracking = {
  id:
    approvedReplacement?.replacementTrackingId ||
    order.replacementTrackingId ||
    "",
  courier:
    approvedReplacement?.replacementCourier || order.replacementCourier || "",
  url:
    approvedReplacement?.replacementTrackingUrl ||
    order.replacementTrackingUrl ||
    "",
};
```

### App-side validation checks

- If request is approved and tracking ID is entered by seller, app must show it immediately.
- If tracking ID exists but URL is empty, app must still show ID + courier.
- App should not hide replacement card after successful save.
- App should re-fetch order after save/refresh and preserve fallback logic above.

## Business Rule: Returned Order Payment

Implemented behavior:

- If order status becomes `RETURNED` or `RETURNED_REFUNDED`, payment is marked unpaid.

Updated files:

- `app/api/store/orders/update-status/route.js`
- `app/api/store/orders/[orderId]/route.js`
- `app/store/orders/page.jsx`
- `app/dashboard/orders/OrdersPageClient.jsx`

## Example API Payload

```json
{
  "status": "SHIPPED",
  "replacementTrackingId": "123445454",
  "replacementCourier": "Delhivery",
  "replacementTrackingUrl": "https://www.delhivery.com/track-v2/package/123445454",
  "replacementRequestIndex": 0
}
```

## Quick Validation Checklist

1. Approve a RETURN request and verify only Return Tracking inputs appear.
2. Enter return tracking details and click Update.
3. Confirm values remain in form after save toast.
4. Close/reopen modal and confirm values persist.
5. Check customer order page shows return tracking in approved request card.
6. Repeat for REPLACEMENT request.
7. Ensure replacement values do not overwrite return request row and vice versa.

## Common Failure Causes

1. Missing approved request for the given type:
   - No input section should show, and no type-index should be generated.
2. Wrong request row updated:
   - Fixed by using `returnRequestIndex` / `replacementRequestIndex`.
3. Save appears successful but input clears:
   - Fixed via response verification + retry + fallback state assignment.

## Implementation Notes

- Prefer nested `returns[]` fields as canonical request tracking history.
- Keep top-level fields in sync for fast access and legacy compatibility.
- For India Post, use AWB with 17track URL when applicable.
