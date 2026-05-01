# Order Now and Order Details Guide

Last Updated: April 30, 2026

## Objective

This guide explains how to:

1. Place an order now from app or web
2. Fetch order details for success page
3. Fetch user order history list

This document matches the current backend implementation in app/api/orders/route.js.

## Base URL

Production base URL:
https://quickfynd.com

## Authentication Rules

1. Logged-in order placement requires Firebase token
   Header:
   Authorization: Bearer <idToken>

2. Guest order placement does not require token
   But request body must include isGuest as true and complete guestInfo.

3. Order details by orderId can be fetched without login
   Endpoint: GET /api/orders?orderId=<orderId>

4. Order history list requires login
   Endpoint: GET /api/orders

## Endpoint 1: Order Now

Method: POST
Path: /api/orders

### Required Headers

Common:
Content-Type: application/json

For logged-in checkout:
Authorization: Bearer <idToken>

Recommended for app source tracking:
x-order-source: APP
x-client-platform: android or ios

### Request Body (Logged-in)

{
"addressId": "optional_saved_address_id",
"addressData": {
"name": "Rohith",
"email": "rohith@example.com",
"phone": "9526473883",
"phoneCode": "+91",
"street": "Main road",
"city": "Kochi",
"state": "Kerala",
"country": "India",
"pincode": "682001",
"district": "Ernakulam"
},
"items": [
{
"id": "product_id_24_char_hex",
"quantity": 1,
"variantId": "optional_variant_id",
"variantOptions": {
"color": "Black",
"size": "M"
}
}
],
"paymentMethod": "COD",
"shippingFee": 0,
"couponCode": "optional_coupon_code",
"coinsToRedeem": 0,
"orderSource": "APP",
"isApp": true
}

Important:

1. Use either addressId or addressData
2. paymentMethod examples: COD, CARD, RAZORPAY, WALLET
3. items[].id must be valid 24-char product id
4. quantity must be 1 to 20

### Request Body (Guest)

{
"isGuest": true,
"guestInfo": {
"name": "Guest User",
"email": "guest@example.com",
"phone": "9526473883",
"phoneCode": "+91",
"street": "Main road",
"city": "Kochi",
"state": "Kerala",
"country": "India",
"pincode": "682001",
"district": "Ernakulam"
},
"items": [
{
"id": "product_id_24_char_hex",
"quantity": 1
}
],
"paymentMethod": "COD",
"shippingFee": 0,
"orderSource": "APP",
"isApp": true
}

Important:

1. isGuest must be true (boolean)
2. guestInfo must include name, email, phone, street, city, state, country, pincode

### Success Response

{
"message": "Orders Placed Successfully",
"order": {
"\_id": "order_id",
"shortOrderNumber": 55234,
"status": "ORDER_PLACED",
"paymentMethod": "COD",
"paymentStatus": "PENDING",
"orderSource": "APP",
"isGuest": true,
"orderItems": [ ... ],
"shippingAddress": { ... },
"total": 499,
"createdAt": "2026-04-30T10:00:00.000Z"
},
"id": "order_id",
"orderId": "order_id"
}

### Common Error Responses

401
{
"error": "Authentication required for non-guest orders"
}

400
{
"error": "missing guest information",
"missingFields": ["phone", "pincode"]
}

400
{
"error": "shipping address required"
}

400
{
"error": "Insufficient stock"
}

400
{
"error": "Cash on Delivery is not available for personalized offer products. Please use online payment."
}

## Endpoint 2: Order Details by Order ID

Method: GET
Path: /api/orders?orderId=<orderId>

This endpoint supports guest and logged-in users. It is used on order success/details page.

### Success Response

{
"order": {
"\_id": "order_id",
"shortOrderNumber": 55234,
"status": "ORDER_PLACED",
"paymentMethod": "COD",
"paymentStatus": "PENDING",
"orderSource": "APP",
"trackingId": "optional",
"courier": "optional",
"trackingUrl": "optional",
"orderItems": [
{
"name": "Product Name",
"price": 499,
"quantity": 1,
"productId": {
"_id": "product_id",
"name": "Product Name",
"image": "..."
}
}
],
"shippingAddress": {
"name": "...",
"phone": "...",
"street": "...",
"city": "...",
"state": "...",
"zip": "...",
"country": "..."
},
"createdAt": "2026-04-30T10:00:00.000Z"
}
}

### Error Responses

400
{
"error": "Missing or invalid orderId parameter."
}

404
{
"error": "Order not found for the provided orderId."
}

## Endpoint 3: My Order List

Method: GET
Path: /api/orders
Header:
Authorization: Bearer <idToken>

Optional query params:

1. limit (default 20)
2. offset (default 0)

Example:
/api/orders?limit=20&offset=0

### Success Response

{
"orders": [
{
"\_id": "order_id",
"shortOrderNumber": 55234,
"status": "ORDER_PLACED",
"paymentMethod": "COD",
"paymentStatus": "PENDING",
"isPaid": false,
"orderSource": "APP",
"total": 499,
"orderItems": [ ... ],
"shippingAddress": { ... },
"createdAt": "2026-04-30T10:00:00.000Z"
}
]
}

### Notes

1. Guest orders are auto-linked after login when token email or phone matches guest data
2. COD order is shown paid only after delivered or COD recovery
3. For online payment methods, isPaid is derived from payment status and order status

## Compatibility Endpoint

Method: POST
Path: /api/store/checkout

Current behavior:

1. This endpoint is now a compatibility proxy
2. It forwards request to POST /api/orders
3. Old app clients can keep calling /api/store/checkout
4. New integrations should use /api/orders directly

## Recommended Mobile Flow

Screen 1: Checkout (Order Now)

1. Build payload
2. If guest, set isGuest true and include guestInfo
3. If logged-in, send Authorization token
4. POST /api/orders
5. Read orderId from response.orderId

Screen 2: Order Success/Details

1. GET /api/orders?orderId=<orderId>
2. Render order summary, shipping address, items, payment state

Screen 3: Order History

1. GET /api/orders with Authorization token
2. Render list, pagination with limit and offset

## Validation Checklist for App Team

1. Logged-in order with addressId works
2. Logged-in order with addressData works
3. Guest order works with isGuest true
4. Missing pincode shows proper error
5. Invalid product id shows proper error
6. Insufficient stock shows proper error
7. Order success screen loads via orderId endpoint
8. Order list endpoint returns user orders
9. APP source is saved as APP (not WEB)

## Troubleshooting

Issue: Order fails with auth error
Fix:

1. Send Authorization header for non-guest order
2. Ensure token is fresh

Issue: Guest order treated as logged-in
Fix:

1. Send boolean isGuest true
2. Include guestInfo object

Issue: Address error
Fix:

1. Send valid addressId
2. Or send full addressData with pincode

Issue: APP orders appear as WEB
Fix:

1. Send x-order-source as APP
2. Send x-client-platform as android or ios
3. Also send orderSource as APP and isApp true in body
