# Checkout Wallet, Coupon, Offers, and Related Features — Complete Guide

Last Updated: April 30, 2026

## Scope

This document covers all major checkout-time pricing and conversion features currently implemented:

1. Wallet coins redemption
2. Coupon listing and validation
3. Personalized offer token discount
4. COD restrictions and prepaid upsell
5. Shipping calculation and express shipping
6. Guest checkout and logged-in checkout differences
7. Pincode auto-fill and validation
8. Payment flow (Razorpay card flow + COD flow)
9. Related conversion features (abandoned checkout recovery)

Primary implementation references:

1. app/(public)/checkout/CheckoutPageUI.jsx
2. app/api/orders/route.js
3. app/api/coupons/route.js
4. app/api/coupon/route.js
5. app/api/wallet/route.js
6. app/api/wallet/bonus/route.js
7. app/api/razorpay/order/route.js
8. app/api/razorpay/verify/route.js
9. app/api/abandoned-checkout/route.js

## Pricing Calculation Order in Checkout

Current frontend calculation sequence:

1. subtotal = sum of cart line totals
2. couponDiscount applied on subtotal
3. totalAfterCoupon = subtotal - couponDiscount
4. shipping added
5. total = totalAfterCoupon + shipping
6. wallet coins (1 coin = 1 rupee) redeemed
7. totalAfterWallet = total - walletDiscount

Important:

1. Wallet is applied after coupon and shipping in checkout UI.
2. Wallet-only payment is allowed when totalAfterWallet becomes 0.

## Wallet Feature

### API: Get Wallet

Method: GET
Path: /api/wallet
Auth: Required (Bearer Firebase token)

Response:
{
"coins": 120,
"rupeesValue": 120,
"transactions": []
}

Rules:

1. If wallet does not exist, backend creates it automatically with 0 coins.
2. Conversion is fixed: 1 coin = 1 rupee.

### API: Welcome Bonus

Method: POST
Path: /api/wallet/bonus
Auth: Required

Rules:

1. One-time welcome bonus only.
2. Current bonus amount: 20 coins.
3. Marks welcomeBonusClaimed to prevent repeat claims.

### Wallet Redemption at Order Time

Backend behavior in /api/orders POST:

1. Only logged-in users can redeem coins.
2. coinsToRedeem is capped by available wallet coins.
3. Wallet discount is applied once per full checkout.
4. Wallet transaction is recorded as REDEEM after successful order creation.

## Coupon Features

There are two coupon APIs in use:

### API A: Coupon List for Checkout UI

Method: GET
Path: /api/coupons?storeId=<storeId>

Returns active coupons for display with metadata:

1. code
2. title
3. discountType and discountValue
4. minOrderValue
5. maxDiscount
6. status (active/expired/exhausted)

### API B: Coupon Verify

Method: POST
Path: /api/coupons

Common validation checks:

1. coupon exists and active
2. not expired
3. min order value met
4. specific products eligibility
5. max uses not exhausted
6. per-user max uses limit

### API C: Secure Coupon Verify for Authenticated User

Method: POST
Path: /api/coupon
Auth: Required

Checks include:

1. new-user only
2. first-order only
3. one-time per user
4. member-only flag (placeholder logic currently false)
5. min cart value and product count
6. specific products

### Important UI Rule

In checkout UI:

1. Coupons are available only for card payments.
2. If payment mode changes away from card, applied coupon is cleared.
3. If wallet-only payment is active, coupons are cleared.

## Personalized Offers

Personalized offer is token-based product discount.

### Offer Token Flow

1. Cart item can carry offerToken.
2. At order creation, backend checks PersonalizedOffer by offerToken + productId.
3. If valid (active, not used, not expired), product price is discounted.
4. If invalid or expired token, order continues with normal price.

### COD Restriction with Personalized Offer

Rule:
If any item has offerToken, COD is blocked.

Error:
Cash on Delivery is not available for personalized offer products. Please use online payment.

### Related Recovery Campaign

Abandoned checkout API auto-creates recovery offers:

1. Endpoint: POST /api/abandoned-checkout
2. Recovery discount currently 5%
3. Offer expiry: 20 hours
4. Sends promotional recovery email with offer link

## COD, Card, and Prepaid Upsell Features

### COD Rules

Checkout blocks COD when:

1. shippingSetting.enableCOD is false
2. order amount is below minCODAmount
3. order amount is above maxCODAmount
4. cart has personalized offer item

### Card Payment Flow

1. Checkout calls /api/razorpay/order to create Razorpay order
2. Razorpay opens in client
3. Success callback posts to /api/razorpay/verify
4. Verify endpoint checks signature
5. Verify endpoint creates final order through /api/orders

### COD-to-Prepaid Upsell Popup

After COD order success, frontend can show PrepaidUpsellModal:

1. Message offers extra 5% off if user pays now
2. Displays original amount, discount, payable amount
3. User can Pay Now or No Thanks

Implementation references:

1. components/PrepaidUpsellModal.jsx
2. checkout state: showPrepaidModal, upsellOrderId, upsellOrderTotal
3. existing order pay-now handling in checkout flow

## Shipping Features

### Dynamic Shipping

Shipping is calculated based on:

1. cart items
2. shipping settings
3. payment mode (COD/Card)
4. destination state

### Express Shipping

1. Express fee can be added when enabled.
2. Express is auto-reset to standard if state is not Kerala.

## Pincode and Address Features

### Pincode Validation

1. Zero-only pincode is rejected.
2. For India, pincode must be 6 digits.
3. Missing/invalid pincode blocks order placement.

### Pincode Auto-Fill

Frontend auto-fetches city/state/district when 6-digit pincode is entered.

Lookup priority:

1. Internal proxy: /api/indiapost/pincode
2. Fallback public API: https://api.postalpincode.in

Non-blocking behavior:

1. If lookup fails, checkout still continues with manual city/state entry.

### Address Sources

Logged-in:

1. Saved addressId, or
2. Inline addressData

Guest:

1. guestInfo with complete address fields required

## Guest Checkout and Logged-in Checkout

### Guest Checkout

Required:

1. isGuest must be true
2. guestInfo must include name, email, phone, street/address, city, state, country, pincode

Guest-specific behavior:

1. Guest shipping address is created and attached to order
2. GuestUser record is upserted for future conversion/linking

### Logged-in Checkout

Required:

1. Authorization Bearer token
2. Valid addressId or addressData
3. items array and paymentMethod

## Inventory and Product Validation in Checkout

Backend validates before order creation:

1. product id format must be valid 24-char id
2. product must exist
3. quantity must be at least 1 and max 20
4. variant stock is checked when variantOptions/variantId provided
5. insufficient stock returns clear error

## Order Splitting by Store

Backend groups items by storeId and creates orders per store group.

Implications:

1. A multi-store cart may create multiple order documents.
2. Shipping fee is added once (first applicable group) in current implementation.
3. Wallet redemption is applied once across the checkout.

## Payment and Order Status Rules

In order creation:

1. COD -> isPaid false, paymentStatus PENDING by default
2. Online methods (CARD/RAZORPAY/UPI/NETBANKING/ONLINE/PREPAID/WALLET) -> isPaid true, paymentStatus PAID by default

## App Source Tracking in Checkout

To preserve APP source (avoid WEB misclassification), send:

1. Header x-order-source: APP
2. Header x-client-platform: android or ios
3. Body orderSource: APP
4. Body isApp: true

## Related Compatibility Endpoint

Endpoint: POST /api/store/checkout

Current behavior:

1. Acts as compatibility proxy to POST /api/orders
2. For old clients still calling /api/store/checkout
3. New integrations should use /api/orders directly

## Common Failure Cases and Fixes

1. Unauthorized for non-guest order
   Fix: send valid Bearer token.

2. Missing guest info
   Fix: set isGuest true and include full guestInfo.

3. Coupon removed unexpectedly
   Cause: payment switched from card or wallet-only mode activated.
   Fix: keep payment mode card while applying coupon.

4. COD option disabled
   Cause: min/max COD rules, COD disabled in shipping settings, or personalized offer item.
   Fix: use card payment.

5. Pincode error
   Fix: provide valid non-zero 6-digit Indian pincode.

6. Invalid product id / product not found
   Fix: refresh cart and remove stale products.

7. Insufficient stock
   Fix: reduce quantity or choose another variant.

## QA Checklist for Checkout Pricing

1. Wallet only flow (total becomes 0) completes without payment gateway.
2. Card payment with coupon applies expected discount.
3. Switching card -> COD clears coupon in UI.
4. Personalized offer token applies product discount correctly.
5. COD blocked when personalized offer token exists.
6. minCODAmount and maxCODAmount rules are enforced.
7. Pincode auto-fill works and fallback allows manual entry.
8. Guest order with valid guestInfo places successfully.
9. Logged-in order with addressData places successfully.
10. Razorpay success creates order and clears cart.
11. Prepaid upsell modal appears for eligible COD scenario.

## Recommended References

1. ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md
2. MOBILE_APP_DEVELOPER_QUICKSTART.md
3. COD_TO_PREPAID_CONVERSION_5PERCENT_DISCOUNT.md
4. MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md
