# Order Return & Replacement Request API Documentation

This document explains how QuickFynd handles return and replacement requests for orders, including the current API routes, request payloads, response shapes, validation rules, and frontend usage patterns.

## Scope

The codebase currently contains two return-request implementations:

1. A standalone return-request API backed by the `ReturnRequest` collection.
2. An order-embedded return-request API backed by the `Order.returns` array.

Both are active in the workspace. This guide documents both exactly as implemented so frontend, dashboard, and backend consumers can work with the correct endpoint.

## Key Concepts

- Return request: customer asks to send the product back for refund/inspection.
- Replacement request: customer asks for a replacement item instead of a refund.
- Delivered order: both APIs require the order status to be `DELIVERED`.
- Eligibility window:
  - Return: 7 days from delivery.
  - Replacement: 15 days from delivery.
- Product-level eligibility:
  - `allowReturn` controls whether a product can be returned.
  - `allowReplacement` controls whether a product can be replaced.

## Data Models

### `Order`

Relevant fields used by return/replacement flows:

- `userId`
- `isGuest`
- `guestName`
- `guestEmail`
- `guestPhone`
- `shippingAddress`
- `status`
- `updatedAt`
- `orderItems[]`
- `returns[]`

The `returns[]` array is used by `POST /api/orders/return-request`.

### `ReturnRequest`

The standalone API stores requests in the `ReturnRequest` model with fields like:

- `storeId`
- `orderId`
- `userId`
- `type`
- `reason`
- `description`
- `images[]`
- `videos[]`
- `fastProcess`
- `productRating`
- `deliveryRating`
- `reviewText`
- `status`
- `createdAt`
- `updatedAt`

Default status in the schema is `PENDING`.

## Authentication

All return/replacement APIs are protected.

- Clients must send a Firebase ID token in the `Authorization` header.
- Format: `Authorization: Bearer <firebase_id_token>`
- The backend verifies the token using Firebase Admin.

## API Endpoints

### 1) Create Return/Replacement Request in `Order.returns`

`POST /api/orders/return-request`

Used by the dashboard order flow.

#### Request body

JSON only:

```json
{
  "orderId": "ORDER_ID",
  "itemIndex": 0,
  "reason": "Damaged During Shipping",
  "type": "RETURN",
  "description": "Optional details",
  "images": ["https://..."]
}
```

#### Validation rules

- Authorization token is required.
- Order must exist.
- Order must belong to the authenticated user.
- For guest orders, `order.guestEmail` must match the verified token email.
- Order status must be `DELIVERED`.
- `type` defaults to `RETURN` when omitted.
- `returns` is appended to the order only after validation passes.

#### Success response

```json
{
  "success": true,
  "message": "Return request submitted successfully",
  "returns": [
    {
      "itemIndex": 0,
      "reason": "Damaged During Shipping",
      "type": "RETURN",
      "status": "REQUESTED",
      "description": "Optional details",
      "images": [],
      "requestedAt": "2026-05-18T12:00:00.000Z"
    }
  ]
}
```

#### Error responses

- `401 Unauthorized` if token is missing.
- `403 Forbidden` if the order does not belong to the authenticated customer.
- `404 Not Found` if the order cannot be found.
- `400 Bad Request` if the order is not delivered.
- `500 Internal Server Error` for unexpected failures.

### 2) List Standalone Return Requests

`GET /api/return-request`

Returns the authenticated user’s return requests from the `ReturnRequest` collection.

#### Success response

```json
{
  "requests": [
    {
      "_id": "REQUEST_ID",
      "storeId": {
        "name": "Store Name",
        "username": "store-user"
      },
      "orderId": "ORDER_ID",
      "userId": "USER_UID",
      "type": "RETURN",
      "reason": "Wrong Item Received",
      "description": "Optional details",
      "images": [],
      "videos": [],
      "status": "PENDING",
      "createdAt": "2026-05-18T12:00:00.000Z",
      "updatedAt": "2026-05-18T12:00:00.000Z"
    }
  ]
}
```

#### Error responses

- `401 Unauthorized` if token is missing or invalid.
- `500 Internal Server Error` for database or server failures.

### 3) Create Standalone Return/Replacement Request

`POST /api/return-request`

This route stores a new document in the `ReturnRequest` collection.

#### Supported content types

1. `application/json`
2. `multipart/form-data`

#### JSON request body

```json
{
  "orderId": "ORDER_ID",
  "type": "RETURN",
  "reason": "Defective Product",
  "description": "Optional details",
  "images": ["https://..."],
  "videos": ["https://..."],
  "fastProcess": false,
  "productRating": 5,
  "deliveryRating": 4,
  "reviewText": "Great support"
}
```

#### Multipart request fields

- `orderId`
- `type`
- `reason`
- `description`
- `fastProcess`
- `productRating`
- `deliveryRating`
- `reviewText`
- `images` files
- `videos` files

Files are uploaded to ImageKit before the request is saved.

#### Validation rules

- Authorization token is required.
- `orderId`, `type`, and `reason` are required.
- Order must exist and belong to the authenticated user.
- Order must be `DELIVERED`.
- The request must be inside the correct time window.
  - Return: 7 days.
  - Replacement: 15 days.
- Each product in the order must allow the requested action.
  - If any item has `allowReturn = false`, return is rejected.
  - If any item has `allowReplacement = false`, replacement is rejected.
- Only one standalone request is allowed per order and user.

#### Success response

```json
{
  "message": "Return/replacement request submitted successfully",
  "request": {
    "_id": "REQUEST_ID",
    "storeId": "STORE_ID",
    "orderId": "ORDER_ID",
    "userId": "USER_UID",
    "type": "REPLACEMENT",
    "reason": "Size/Fit Issue",
    "description": "Optional details",
    "images": [],
    "videos": [],
    "fastProcess": false,
    "productRating": null,
    "deliveryRating": null,
    "reviewText": null,
    "status": "PENDING",
    "createdAt": "2026-05-18T12:00:00.000Z",
    "updatedAt": "2026-05-18T12:00:00.000Z"
  }
}
```

#### Error responses

- `401 Unauthorized` if token is missing.
- `404 Not Found` if the order does not exist.
- `400 Bad Request` if the order is not delivered, the window expired, required fields are missing, or the product is not eligible.
- `500 Internal Server Error` for unexpected failures.

### 4) List Order-Embedded Return Requests

`GET /api/orders/return-request`

Returns orders that contain embedded `returns[]` entries for the authenticated user or guest email.

#### Success response

```json
{
  "success": true,
  "returns": [
    {
      "_id": "ORDER_ID",
      "shortOrderNumber": 12345,
      "returns": [
        {
          "itemIndex": 0,
          "reason": "Damaged During Shipping",
          "type": "RETURN",
          "status": "REQUESTED",
          "description": "Optional details",
          "images": [],
          "requestedAt": "2026-05-18T12:00:00.000Z"
        }
      ],
      "status": "DELIVERED",
      "createdAt": "2026-05-18T12:00:00.000Z",
      "orderItems": []
    }
  ]
}
```

## Business Rules

### Return window

- Allowed only within 7 days of delivery.
- If the request is late, the API responds with a return-window-expired error.

### Replacement window

- Allowed only within 15 days of delivery.
- If the request is late, the API responds with a replacement-window-expired error.

### Product restrictions

- A product with `allowReturn = false` cannot be returned.
- A product with `allowReplacement = false` cannot be replaced.

### Order ownership

- Registered users must own the order through `userId`.
- Guest orders are matched using `guestEmail`.

### Delivery requirement

- Orders must be delivered before a return or replacement can be submitted.

## Frontend Usage

### Dashboard order flow

The dashboard orders page currently submits return/replacement requests to:

```text
/api/orders/return-request
```

It sends:

- `orderId`
- `itemIndex`
- `reason`
- `type`
- `description`
- `images`

### Public return-request flow

The public return-request page submits to:

```text
/api/return-request
```

It supports:

- reason selection
- return vs replacement selection
- image uploads
- video uploads
- optional product and delivery ratings
- optional review text
- optional fast-process flag

## Implementation Notes

1. The two APIs do not currently share the same storage model.
2. `POST /api/orders/return-request` writes into the order record directly.
3. `POST /api/return-request` writes a dedicated `ReturnRequest` document.
4. If you are building a new screen or integration, choose the endpoint that matches the storage model you want to read later.

## Recommended Client Validation

Before submitting a request, the client should verify:

- The order is delivered.
- The request is within the allowed time window.
- The selected items are eligible for return or replacement.
- The user is signed in and has a valid token.

## Error Handling Guide

### Common failure cases

- Missing token: prompt the user to sign in again.
- Expired window: show a clear message for return or replacement availability.
- Ineligible product: show which product blocks the request.
- Duplicate request: tell the user a request already exists for the order.

## Example Client Call

```js
const token = await auth.currentUser.getIdToken(true);

await axios.post(
  "/api/return-request",
  {
    orderId,
    type: "REPLACEMENT",
    reason: "Damaged During Shipping",
    description: "Box was damaged on arrival",
    images: [imageUrl],
    videos: [],
    fastProcess: false,
  },
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);
```

## Return & Replacement Tracking Workflow

After a customer requests a return or replacement, the order enters a multi-stage tracking flow managed by admins and sellers.

### Status Progression

A return/replacement request follows this lifecycle:

1. **REQUESTED** — Customer initiates the return or replacement request.
2. **APPROVED** — Admin reviews and approves the request; tracking number is assigned.
3. **SHIPPED** — Customer ships the package back; return tracking is active.
4. **IN_TRANSIT** — Return package is in transit to the seller's warehouse.
5. **DELIVERED** — Return package delivered to seller; inspection phase begins.
6. **COMPLETED** — Seller inspects and processes refund/replacement.

### Return Shipment Tracking Fields

When an admin approves a return/replacement, the following fields should be added to the `returns` array item for the **return shipment** (package going from customer back to seller):

```json
{
  "itemIndex": 0,
  "reason": "Damaged During Shipping",
  "type": "RETURN",
  "status": "APPROVED",
  "description": "Box was damaged",
  "images": [],
  "requestedAt": "2026-05-18T12:00:00.000Z",
  "approvedAt": "2026-05-18T14:30:00.000Z",
  "returnTrackingId": "DHL123456789",
  "returnCourier": "DHL",
  "returnTrackingUrl": "https://tracking.dhl.com/...",
  "returnShippingLabel": "https://cdn.imagekit.io/return-label.pdf",
  "returnAddress": {
    "name": "QuickFynd Returns",
    "street": "123 Warehouse St",
    "city": "Bangalore",
    "state": "KA",
    "zip": "560001",
    "country": "India",
    "phone": "+91-XXXX-XXXX"
  },
  "returnShipmentStatus": "IN_TRANSIT",
  "returnDeliveredAt": null,
  "sellerInspectionNotes": null
}
```

### Replacement Shipment Tracking Fields (For Type: REPLACEMENT)

If the request `type` is `REPLACEMENT`, after the return package is delivered to the seller and inspected, a **separate tracking number** is generated for the replacement shipment (package going from seller back to customer):

```json
{
  "itemIndex": 0,
  "reason": "Damaged During Shipping",
  "type": "REPLACEMENT",
  "status": "REPLACEMENT_SHIPPED",
  "description": "Box was damaged",
  "images": [],
  "requestedAt": "2026-05-18T12:00:00.000Z",
  "approvedAt": "2026-05-18T14:30:00.000Z",
  "returnTrackingId": "DHL123456789",
  "returnCourier": "DHL",
  "returnTrackingUrl": "https://tracking.dhl.com/?AWB=DHL123456789",
  "returnShippingLabel": "https://cdn.imagekit.io/return-label.pdf",
  "returnAddress": {
    "name": "QuickFynd Returns",
    "street": "123 Warehouse St",
    "city": "Bangalore",
    "state": "KA",
    "zip": "560001",
    "country": "India",
    "phone": "+91-XXXX-XXXX"
  },
  "returnShipmentStatus": "DELIVERED",
  "returnDeliveredAt": "2026-05-20T10:15:00.000Z",
  "sellerInspectionNotes": "Item inspected. Approved for replacement. New item shipped.",
  "replacementTrackingId": "DHL987654321",
  "replacementCourier": "DHL",
  "replacementTrackingUrl": "https://tracking.dhl.com/?AWB=DHL987654321",
  "replacementShippingLabel": "https://cdn.imagekit.io/replacement-label.pdf",
  "replacementShipmentStatus": "IN_TRANSIT",
  "replacementDeliveredAt": null,
  "replacementEta": "2026-05-23"
}
```

### Admin Approval Workflow

#### Phase 1: Approve Return Request and Assign Return Tracking

When an admin approves a return/replacement request, they first assign the **return shipment** tracking (package going FROM customer TO seller):

1. Set `status` to `APPROVED`.
2. Set `approvedAt` timestamp.
3. Generate or assign `returnTrackingId` (can be DHL, Delhivery, or manual).
4. Set `returnCourier` (e.g., "DHL", "Delhivery", "India Post").
5. Generate or retrieve `returnTrackingUrl` (link to courier tracking page).
6. Create or attach `returnShippingLabel` (PDF for customer to print).
7. Populate `returnAddress` with the seller's return warehouse address.
8. Set initial `returnShipmentStatus` to `REQUESTED_PICKUP` or `AWAITING_SHIPMENT`.

#### Phase 2: Update Return Shipment Status As Package Moves

As the return package is transported:

- Update `returnShipmentStatus` to track progression: `PICKED_UP` → `IN_TRANSIT` → `DELIVERED`
- When delivered to warehouse: set `returnDeliveredAt` timestamp
- Optionally add `sellerInspectionNotes` after inspection begins

#### Phase 3: If Type is REPLACEMENT, Generate Replacement Tracking

**Only for REPLACEMENT type requests**, after the return package is inspected and approved by the seller:

1. Set `status` to `REPLACEMENT_SHIPPED` (or keep as `APPROVED` with new fields).
2. Update `sellerInspectionNotes` with inspection result (e.g., "Item inspected. Approved for replacement.").
3. Generate a **separate** `replacementTrackingId` for the new item going back to customer.
4. Set `replacementCourier` (e.g., "Delhivery").
5. Generate or retrieve `replacementTrackingUrl`.
6. Create `replacementShippingLabel` if needed.
7. Set initial `replacementShipmentStatus` to `READY_TO_SHIP` or `SHIPPED`.
8. Optionally set `replacementEta` (expected delivery date to customer).

#### Phase 4: If Type is RETURN (Not Replacement), Process Refund

**For RETURN type requests only**:

1. Keep `status` as `COMPLETED` or `REFUND_PROCESSED`.
2. Add `sellerInspectionNotes` (e.g., "Item inspected and accepted for refund.").
3. Initiate refund to customer's original payment method or wallet.
4. Set `returnDeliveredAt` timestamp when return reaches warehouse.

### Customer View of Return Tracking

In the order details view, customers see different tracking information based on request type and stage:

#### For All Types (RETURN or REPLACEMENT):

Once `returnTrackingId` is populated, customers see:

- **Return Status Badge**: Shows current return stage (APPROVED, SHIPPED, IN_TRANSIT, DELIVERED, COMPLETED).
- **Return Tracking Number & Carrier**: "Return Tracking: DHL123456789 (DHL)" with link to track.dhl.com.
- **Shipping Label**: Download link for the return label to attach to the package.
- **Return Address**: Full address of the seller's warehouse where the package should be sent.
- **Real-time Return Tracking**: Similar to order tracking but reversed—shows package moving from customer to seller.
- **Inspection Status**: Once returned, shows seller's inspection notes and decision.

#### For REPLACEMENT Type Only:

After the return is delivered and inspected, customers additionally see:

- **Replacement Tracking Number & Carrier**: "Replacement Tracking: DHL987654321 (DHL)" with link to track.dhl.com.
- **Replacement ETA**: Expected delivery date of the replacement item.
- **Replacement Status**: Shows progression of replacement shipment (READY_TO_SHIP → IN_TRANSIT → DELIVERED).
- **Real-time Replacement Tracking**: Live updates as replacement package travels from seller to customer.
- **Dual Timeline View**: Displays both return journey and replacement journey side-by-side or in sequence.

#### For RETURN Type Only:

Once the return is delivered to warehouse:

- **Refund Status**: Shows "Refund Approved", "Processing", or "Refunded to [Payment Method]".
- **Refund Amount & ETA**: Amount to be refunded and expected date.
- **No Replacement Tracking**: Only shows return tracking information.

### Seller & Admin Dashboard

In the seller dashboard and admin interface:

1. **Return Request List**: Shows all returns/replacements grouped by status.
2. **Tracking Updates**: Real-time status of return package (e.g., "Package picked up", "In transit", "Delivered to warehouse").
3. **Inspection Phase**: Once return is delivered to seller, admin can add inspection notes and decision (approved/rejected).
4. **Refund/Replacement Processing**: After inspection, admin either:
   - **Refund**: Process refund to customer's original payment method or wallet.
   - **Replace**: Generate a replacement shipment with a new tracking ID.

### Real-Time Tracking API (Future Implementation Suggestion)

Currently, return tracking should leverage existing courier integrations:

- For **Delhivery** returns: use the Delhivery tracking API with the return tracking ID.
- For **India Post** returns: use the India Post tracking endpoint.
- For **DHL** returns: link to DHL's public tracking URL.

Implement an endpoint like `GET /api/track-return?awb=<returnTrackingId>&courier=<carrier>` to fetch live return package status.

### Example 1: Return Request with Return Tracking Only

```json
{
  "_id": "ORDER_ID",
  "userId": "USER_UID",
  "status": "DELIVERED",
  "returns": [
    {
      "itemIndex": 0,
      "reason": "Damaged During Shipping",
      "type": "RETURN",
      "status": "APPROVED",
      "description": "Box arrived crushed",
      "images": ["https://cdn.imagekit.io/damage-1.jpg"],
      "requestedAt": "2026-05-18T12:00:00.000Z",
      "approvedAt": "2026-05-18T14:30:00.000Z",
      "returnTrackingId": "DHL987654321",
      "returnCourier": "DHL",
      "returnTrackingUrl": "https://tracking.dhl.com/?AWB=DHL987654321",
      "returnShippingLabel": "https://cdn.imagekit.io/return-label-order-123.pdf",
      "returnAddress": {
        "name": "QuickFynd Returns Center",
        "street": "Warehouse Building, 123 Industrial Estate",
        "city": "Bangalore",
        "state": "KA",
        "zip": "560034",
        "country": "India",
        "phone": "+91-080-XXXX-XXXX"
      },
      "returnShipmentStatus": "IN_TRANSIT",
      "returnDeliveredAt": null,
      "sellerInspectionNotes": null
    }
  ]
}
```

### Example 2: Replacement Request with Return & Replacement Tracking

```json
{
  "_id": "ORDER_ID",
  "userId": "USER_UID",
  "status": "DELIVERED",
  "returns": [
    {
      "itemIndex": 0,
      "reason": "Damaged During Shipping",
      "type": "REPLACEMENT",
      "status": "REPLACEMENT_SHIPPED",
      "description": "Box arrived crushed",
      "images": ["https://cdn.imagekit.io/damage-1.jpg"],
      "requestedAt": "2026-05-18T12:00:00.000Z",
      "approvedAt": "2026-05-18T14:30:00.000Z",
      "returnTrackingId": "DHL123456789",
      "returnCourier": "DHL",
      "returnTrackingUrl": "https://tracking.dhl.com/?AWB=DHL123456789",
      "returnShippingLabel": "https://cdn.imagekit.io/return-label-order-123.pdf",
      "returnAddress": {
        "name": "QuickFynd Returns Center",
        "street": "Warehouse Building, 123 Industrial Estate",
        "city": "Bangalore",
        "state": "KA",
        "zip": "560034",
        "country": "India",
        "phone": "+91-080-XXXX-XXXX"
      },
      "returnShipmentStatus": "DELIVERED",
      "returnDeliveredAt": "2026-05-20T10:15:00.000Z",
      "sellerInspectionNotes": "Item inspected. Approved for replacement. New item shipped.",
      "replacementTrackingId": "DHL987654321",
      "replacementCourier": "DHL",
      "replacementTrackingUrl": "https://tracking.dhl.com/?AWB=DHL987654321",
      "replacementShippingLabel": "https://cdn.imagekit.io/replacement-label-order-123.pdf",
      "replacementShipmentStatus": "IN_TRANSIT",
      "replacementDeliveredAt": null,
      "replacementEta": "2026-05-23"
    }
  ]
}
```

### Customer Notification Flow

#### When Status Changes from REQUESTED to APPROVED:

Send email to customer with:

- Approval confirmation
- Return tracking number and courier link
- Return shipping label (PDF attachment)
- Return address and instructions
- Expected delivery date to warehouse

#### When returnShipmentStatus Updates (picked up, in transit, delivered):

- Send tracking update emails to customer
- Update order details dashboard in real-time

#### For REPLACEMENT Type: When Return is Delivered and Inspected:

After return arrives at warehouse and is approved for replacement:

- Send email with inspection confirmation
- Include new **replacement tracking number and courier link**
- Include replacement shipping label if applicable
- Show expected delivery date of replacement item
- Provide tracking link for replacement package

#### For REPLACEMENT Type: When replacementShipmentStatus Updates:

As replacement package moves (ready to ship, in transit, out for delivery):

- Send tracking update emails for replacement
- Update order details dashboard with replacement tracking progress

#### For RETURN Type: When Refund is Processed:

- Send confirmation email with refund amount
- Show refund timeline and expected date to reach customer's account
- Provide details on refund method (wallet, original payment method, etc.)

## Related Files

- `app/api/return-request/route.js`
- `app/api/orders/return-request/route.js`
- `models/ReturnRequest.js`
- `models/Order.js`
- `app/(public)/return-request/page.jsx`
- `app/dashboard/orders/OrdersPageClient.jsx`

## Summary

QuickFynd currently supports two return/replacement request paths: one embedded inside orders and one stored as a dedicated return-request document. Both require a valid Firebase token, a delivered order, and eligibility checks based on request type, date window, and product permissions.

**Return Tracking System:**

- All approved returns/replacements get a **return tracking number** (return shipment goes from customer to seller).
- For REPLACEMENT type requests, after the return is delivered and inspected, a **separate replacement tracking number** is generated (replacement shipment goes from seller back to customer).
- For RETURN type requests, after the return is delivered and inspected, a refund is processed.
- Both return and replacement shipments are tracked end-to-end with real-time status updates and seller inspection workflows.
