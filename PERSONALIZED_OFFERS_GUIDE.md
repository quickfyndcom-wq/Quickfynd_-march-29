# Personalized Time-Limited Offers - Complete Guide

## 🎯 Overview

The **Personalized Time-Limited Offers** feature allows you to create exclusive, time-sensitive discounts for specific customers. Each customer receives a unique URL with a countdown timer showing the special pricing that expires after a set deadline.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Database Setup](#database-setup)
3. [How It Works](#how-it-works)
4. [Admin Dashboard Usage](#admin-dashboard-usage)
5. [API Reference](#api-reference)
6. [Integration with Checkout](#integration-with-checkout)
7. [URL Structure](#url-structure)
8. [Utility Functions](#utility-functions)

---

## ✨ Features

- ✅ **Customer-Specific Discounts**: Target individual customers with personalized pricing
- ✅ **Time-Limited**: Automatic countdown timer with configurable expiration
- ✅ **Unique URLs**: Each offer has a secure, unique token-based URL
- ✅ **Automatic Expiry**: Offers automatically expire and redirect to normal pricing
- ✅ **Usage Tracking**: Track whether offers were used and which orders they generated
- ✅ **Product-Agnostic**: Works with any product in your catalog
- ✅ **Visual Countdown**: Engaging countdown timer showing days, hours, minutes, seconds

---

## 🗃️ Database Setup

### Step 1: Run Prisma Migration

```bash
npx prisma generate
npx prisma db push
```

This creates the `PersonalizedOffer` table in your PostgreSQL database.

### Step 2: Verify Models

Two models have been created:
- **MongoDB**: `models/PersonalizedOffer.js`
- **PostgreSQL**: `prisma/schema.prisma` (PersonalizedOffer model)

---

## 🔄 How It Works

### Flow Diagram

```
┌─────────────┐
│   Admin     │
│  Dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Create Personalized     │
│ Offer                   │
│ • Select Customer       │
│ • Select Product        │
│ • Set Discount %        │
│ • Set Expiry DateTime   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ System Generates        │
│ • Unique Token          │
│ • Offer URL             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Admin Shares URL        │
│ (Email/SMS/WhatsApp)    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Customer Clicks URL     │
│ /offer/{token}          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ System Validates        │
│ • Token exists?         │
│ • Not expired?          │
│ • Not already used?     │
└──────┬──────────────────┘
       │
       ├─ Valid ──────────────────┐
       │                          ▼
       │                    ┌──────────────┐
       │                    │ Show Special │
       │                    │ Product Page │
       │                    │ • Countdown  │
       │                    │ • Discount % │
       │                    │ • Special $  │
       │                    └──────┬───────┘
       │                           │
       │                           ▼
       │                    ┌──────────────┐
       │                    │ Customer     │
       │                    │ Purchases    │
       │                    └──────┬───────┘
       │                           │
       │                           ▼
       │                    ┌──────────────┐
       │                    │ Mark Offer   │
       │                    │ as Used      │
       │                    └──────────────┘
       │
       └─ Invalid ────────────────┐
                                  ▼
                          ┌───────────────┐
                          │ Redirect to   │
                          │ Normal Page   │
                          └───────────────┘
```

---

## 🎛️ Admin Dashboard Usage

### Access the Dashboard

Navigate to: `/dashboard/store/personalized-offers`

### Creating a New Offer

1. Click **"+ Create New Offer"** button
2. Fill in the form:
   - **Customer Email** (required): The email of the target customer
   - **Customer Name** (optional): For personalization
   - **Customer Phone** (optional): For records
   - **Product** (required): Select from dropdown
   - **Discount Percent** (required): 1-100%
   - **Expires At** (required): Date and time when offer expires
   - **Notes** (optional): Internal notes for tracking

3. Click **"Create Offer & Copy Link"**
4. The offer URL is automatically copied to clipboard
5. Share the URL with your customer via:
   - Email
   - SMS
   - WhatsApp
   - Direct message

### Managing Offers

**Filter Options:**
- **All**: View all offers
- **Active**: Currently valid, unexpired offers
- **Expired**: Offers past their expiration date
- **Used**: Offers that customers have redeemed

**Actions:**
- 📋 **Copy**: Copy the offer URL to clipboard
- 👁️ **Preview**: View how the offer looks to the customer
- 🗑️ **Delete**: Remove the offer

---

## 🔌 API Reference

### 1. Create Personalized Offer

**Endpoint:** `POST /api/personalized-offers`

**Request Body:**
```json
{
  "storeId": "store_id",
  "customerEmail": "customer@example.com",
  "customerPhone": "+1234567890",
  "customerName": "John Doe",
  "productId": "product_id",
  "discountPercent": 20,
  "expiresAt": "2026-02-20T23:59:59",
  "notes": "VIP customer special discount"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Personalized offer created successfully",
  "offer": {
    "_id": "...",
    "offerToken": "abc123def456...",
    "customerEmail": "customer@example.com",
    "productId": "...",
    "discountPercent": 20,
    "expiresAt": "2026-02-20T23:59:59",
    "product": {
      "name": "Premium Wireless Headphones",
      "price": 5999,
      "image": "..."
    },
    "discountedPrice": 4799.20,
    "offerUrl": "https://yourstore.com/offer/abc123def456..."
  }
}
```

### 2. Get All Offers

**Endpoint:** `GET /api/personalized-offers?storeId={storeId}&status={status}`

**Query Parameters:**
- `storeId` (required): Your store ID
- `status` (optional): `active`, `expired`, `used`, or `all`

**Response:**
```json
{
  "success": true,
  "offers": [...],
  "count": 10
}
```

### 3. Validate Offer by Token

**Endpoint:** `GET /api/personalized-offers/validate/{token}`

**Response:**
```json
{
  "success": true,
  "valid": true,
  "expired": false,
  "used": false,
  "offer": {
    "id": "...",
    "offerToken": "...",
    "customerEmail": "...",
    "discountPercent": 20,
    "expiresAt": "...",
    "timeRemaining": 86400000
  },
  "product": {
    "id": "...",
    "name": "...",
    "originalPrice": 5999,
    "discountedPrice": 4799.20,
    "savings": 1199.80,
    ...
  }
}
```

### 4. Mark Offer as Used

**Endpoint:** `POST /api/personalized-offers/validate/{token}`

**Request Body:**
```json
{
  "orderId": "order_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offer marked as used"
}
```

### 5. Update Offer

**Endpoint:** `PUT /api/personalized-offers`

**Request Body:**
```json
{
  "offerId": "offer_id",
  "discountPercent": 25,
  "expiresAt": "2026-02-25T23:59:59",
  "isActive": true,
  "notes": "Extended deadline"
}
```

### 6. Delete Offer

**Endpoint:** `DELETE /api/personalized-offers?offerId={offerId}`

---

## 🛒 Integration with Checkout

To properly track offer usage when a customer completes their purchase, integrate this in your checkout flow:

### Step 1: Store Token During Add to Cart

In your **ProductDetails** component or offer page:

```javascript
import { storeOfferToken, getOfferTokenFromUrl } from '@/lib/offerUtils';

// When customer is on offer page
const offerToken = getOfferTokenFromUrl();
if (offerToken) {
  storeOfferToken(offerToken); // Store in sessionStorage
}
```

### Step 2: Include Offer in Order Creation

In your **checkout/order creation** API:

```javascript
import { getStoredOfferToken, markOfferAsUsed } from '@/lib/offerUtils';

// During order creation
const offerToken = getStoredOfferToken();

if (offerToken) {
  // Validate offer is still valid
  const offerData = await validateOffer(offerToken);
  
  if (offerData.valid) {
    // Apply discounted price
    const discountedPrice = offerData.product.discountedPrice;
    
    // Create order with special price
    const order = await createOrder({
      ...orderData,
      specialOfferToken: offerToken,
      specialOfferDiscount: offerData.offer.discountPercent
    });
    
    // Mark offer as used
    await markOfferAsUsed(offerToken, order.id);
    
    // Clear stored token
    clearStoredOfferToken();
  }
}
```

### Step 3: Verify at Payment Time

Before processing payment, re-validate the offer:

```javascript
if (order.specialOfferToken) {
  const offerData = await validateOffer(order.specialOfferToken);
  
  if (!offerData.valid) {
    // Offer expired or invalid
    // Recalculate with regular price
    throw new Error('Offer has expired. Please review your order.');
  }
}
```

---

## 🔗 URL Structure

### Offer Page URL Format

```
https://yourstore.com/offer/{token}
```

**Example:**
```
https://yourstore.com/offer/a1b2c3d4e5f6789
```

### URL Behavior

- **Valid Offer**: Shows special product page with countdown
- **Expired Offer**: Shows "expired" message, redirects to normal product page after 3 seconds
- **Used Offer**: Shows "already used" message
- **Invalid Token**: Shows "not found" error, redirects to home

---

## 🛠️ Utility Functions

The feature includes helper functions in `/lib/offerUtils.js`:

### Basic Validation

```javascript
import { isOfferValid, calculateDiscountedPrice } from '@/lib/offerUtils';

// Check if offer is valid
const valid = isOfferValid(offerObject);

// Calculate discounted price
const discountedPrice = calculateDiscountedPrice(1000, 20); // ₹800
```

### Time Calculations

```javascript
import { getTimeRemaining, formatTimeRemaining } from '@/lib/offerUtils';

// Get detailed time breakdown
const time = getTimeRemaining('2026-02-20T23:59:59');
// { days: 3, hours: 5, minutes: 30, seconds: 15, expired: false }

// Get formatted string
const formatted = formatTimeRemaining('2026-02-20T23:59:59');
// "3d 5h"
```

### Session Management

```javascript
import { 
  storeOfferToken, 
  getStoredOfferToken, 
  clearStoredOfferToken 
} from '@/lib/offerUtils';

// Store token when customer views offer
storeOfferToken('abc123');

// Retrieve during checkout
const token = getStoredOfferToken();

// Clear after purchase
clearStoredOfferToken();
```

---

## 📱 Sharing Offer URLs

### Email Template Example

```html
<p>Hi {customerName},</p>

<p>We have a special offer just for you! Get <strong>{discountPercent}% OFF</strong> on {productName}.</p>

<p>Your exclusive price: <strong>₹{discountedPrice}</strong> (Regular: ₹{originalPrice})</p>

<p><a href="{offerUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
  Claim Your Discount →
</a></p>

<p>⏰ This offer expires on {expiryDate}. Don't miss out!</p>
```

### WhatsApp/SMS Template

```
Hi {customerName}! 🎉

Exclusive offer just for you:
{productName}
{discountPercent}% OFF - Only ₹{discountedPrice}

Click here: {offerUrl}

⏰ Expires: {expiryDate}
```

---

## 🎨 Customization

### Countdown Timer Styling

Edit `/components/CountdownTimer.jsx` to customize colors, fonts, and layout.

### Offer Page Layout

Edit `/app/(public)/offer/[token]/page.jsx` to customize:
- Banner messages
- Trust badges
- Product display
- Call-to-action buttons

---

## 🔒 Security Features

- ✅ Unique cryptographic tokens (32 characters)
- ✅ Server-side validation on every request
- ✅ Automatic expiration checking
- ✅ One-time use enforcement
- ✅ Customer email validation

---

## 📊 Analytics & Tracking

Track offer performance through the admin dashboard:

- **Active Offers**: Currently available offers
- **Usage Rate**: Percentage of used vs. created offers
- **Expiration Rate**: Offers that expired without use
- **Revenue Generated**: Track which offers led to orders

---

## 🚀 Best Practices

1. **Set Realistic Deadlines**: Give customers enough time (24-72 hours recommended)
2. **Clear Communication**: Explain the offer clearly in your message
3. **Urgency**: Use countdown timer to create urgency
4. **Follow Up**: Send reminder before offer expires
5. **Test Links**: Always preview offers before sending
6. **Track Results**: Monitor which offers perform best

---

## ❓ FAQ

### Can customers share the offer link?

Yes, but only the intended customer (email) can see the personalized message. Anyone can access the link, but you can add email verification if needed.

### What happens after the countdown expires?

The page shows an "expired" message and redirects to the normal product page with regular pricing.

### Can I extend an offer deadline?

Yes, use the **Update Offer** API to extend the `expiresAt` date.

### How many offers can I create?

Unlimited! Create as many personalized offers as you need.

### Can I reuse an offer token?

No, once an offer is used or expired, the token cannot be reused. Create a new offer instead.

---

## 📞 Support

For issues or questions:
1. Check the API response errors for debugging
2. Verify database connections
3. Ensure Prisma schema is migrated
4. Check browser console for frontend errors

---

**Last Updated:** February 2026  
**Version:** 1.0.0
