# Complete Coupon System Implementation Guide

## Overview
This document describes the complete coupon system implementation with product-specific validation and smart eligibility messaging in the checkout modal.

## Key Features Implemented

### 1. Smart Coupon Display in Checkout Modal
**File**: `app/(public)/checkout/CheckoutPageUI.jsx`

The coupon modal now displays ALL available coupons with real-time eligibility checking:

#### Eligibility Criteria (Checked for each coupon):
1. **Expiry Check**: If `expiresAt` is in the past, show as "Coupon expired" (disabled)
2. **Usage Limit Check**: If `maxUses` reached, show as "Usage limit reached" (disabled)
3. **Minimum Order Value**: If cart total < `minOrderValue`, show "Min order ₹{amount} required" (disabled)
4. **Product-Specific**: If coupon has `specificProducts` array:
   - Only enabled if cart contains at least one product from the list
   - Shows "Not applicable for your products" if no match (disabled)
5. **Eligible Coupons**: Show with blue hover effect and APPLY button

#### Visual Indicators:
- **Eligible coupons**: Full opacity, hover highlight, clickable
- **Ineligible coupons**: Grayed out (75% opacity), red error message, not clickable

### 2. Enhanced API Endpoints

#### GET `/api/coupons?storeId={storeId}`
**Purpose**: Fetch all active coupons for display in checkout modal

**Response Format**:
```javascript
{
  success: true,
  coupons: [
    {
      _id: "...",
      code: "TEST",
      title: "10% Off", // Auto-generated if not set
      description: "Save 10% on all products",
      discountType: "percentage", // or "fixed"
      discountValue: 10, // or amount for fixed discount
      minOrderValue: 500,
      maxDiscount: 100,
      badgeColor: "#10B981",
      specificProducts: ["productId1", "productId2"], // Empty = applies to all
      expiresAt: "2025-12-31T23:59:59.000Z",
      isExpired: false,
      isExhausted: false,
      usedCount: 5,
      maxUses: 100,
      status: "active" // or "expired" or "exhausted"
    }
  ]
}
```

#### POST `/api/coupons`
**Purpose**: Validate and apply a coupon code

**Request**:
```javascript
{
  code: "TEST",
  storeId: "...",
  orderTotal: 1500,
  userId: "user123", // Optional
  cartProductIds: ["productId1", "productId2"] // Product IDs in current cart
}
```

**Response (Valid)**:
```javascript
{
  success: true,
  valid: true,
  coupon: {
    code: "TEST",
    title: "10% Off",
    description: "...",
    discountType: "percentage",
    discountValue: 10,
    discountAmount: 150 // Calculated discount
  }
}
```

**Response (Invalid)** - Returns appropriate error message:
- "This coupon is not applicable for your current cart" (product-specific)
- "This coupon is not applicable for the products in your cart" (no matching products)
- "Minimum order value of ₹500 required"
- "Coupon has expired"
- "Coupon usage limit reached"
- "You have already used this coupon"

### 3. Database Schema (Coupon Model)

**File**: `models/Coupon.js`

```javascript
{
  storeId: ObjectId,              // Which store this coupon belongs to
  code: String (unique, uppercase), // e.g., "SAVE10"
  title: String,                  // e.g., "10% Off"
  description: String,            // e.g., "Save 10% on all products"
  discountType: "percentage|fixed", // Type of discount
  discountValue: Number,          // 10 for percentage or amount for fixed
  minOrderValue: Number,          // Minimum order total required
  maxDiscount: Number,            // Cap on discount amount
  maxUses: Number,                // Total usage limit
  usedCount: Number,              // How many times used
  maxUsesPerUser: Number,         // Per-user usage limit
  specificProducts: [ObjectId],   // Empty = applies to all products
  expiresAt: Date,                // Expiration date (null = no expiry)
  isActive: Boolean,              // Enable/disable coupon
  badgeColor: String,             // Hex color for badge
  createdAt: Date,
  updatedAt: Date,
  
  // Legacy field support (backward compatibility)
  discount: Number,               // Old field (synced from discountValue)
  minPrice: Number,               // Old field (synced from minOrderValue)
}
```

## How It Works - Step by Step

### 1. User Opens Checkout Modal
```
CheckoutPageUI.jsx → Fetches /api/coupons?storeId={storeId}
                  → Populates availableCoupons state
                  → Shows all coupons with eligibility checking
```

### 2. Frontend Checks Eligibility (Real-time)
For each coupon in modal:
- Check if expired (cpn.isExpired)
- Check if exhausted (cpn.isExhausted)
- Calculate cart total from current items
- Get product IDs from cart items
- Compare against coupon requirements
- Show appropriate message if ineligible

### 3. User Clicks "Apply" on Eligible Coupon
```
onClick → setCoupon(code) + close modal
       → handleApplyCoupon() fires (on form submit)
       → POST /api/coupons with validation
       → Backend re-validates (security)
       → Returns discount amount or error
```

### 4. Backend Validation (Security Layer)
POST endpoint validates:
- Code exists and matches storeId
- Not expired
- Min order value met
- Product compatibility (if specific products set)
- Max usage limits not exceeded
- Per-user limits not exceeded

### 5. Discount Applied
If valid:
- Show in "Applied Coupon" section
- Update order total with discount
- Include in order when placed

## Product-Specific Coupons Example

**Example 1: Category-Wide Discount**
```javascript
{
  code: "ELECTRONICS10",
  title: "10% Off Electronics",
  description: "Save 10% on all electronics",
  discountType: "percentage",
  discountValue: 10,
  specificProducts: [
    "productId123", // Laptop
    "productId124", // Phone
    "productId125"  // Tablet
  ]
}
```

When user has electronics in cart → **Eligible (enabled)**
When user has only clothes → **Ineligible (shows "Not applicable for your products")**

**Example 2: Spend & Save**
```javascript
{
  code: "SPEND500",
  title: "₹100 Off",
  description: "On orders above ₹500",
  discountType: "fixed",
  discountValue: 100,
  minOrderValue: 500,
  specificProducts: [] // Applies to all products
}
```

Order total ₹400 → **Ineligible (shows "Min order ₹500 required")**
Order total ₹600 → **Eligible (enabled)**

## Error Messages & Scenarios

| Scenario | User Sees | Status |
|----------|-----------|--------|
| Coupon expired (expiresAt < now) | "Coupon expired" | Disabled (grayed out) |
| Max usage reached (usedCount >= maxUses) | "Usage limit reached" | Disabled (grayed out) |
| Cart total too low | "Min order ₹500 required" | Disabled (grayed out) |
| Product-specific, no match | "Not applicable for your products" | Disabled (grayed out) |
| Already used by user | "You have already used this coupon" | Error on apply |
| Coupon not found | "Invalid coupon code" | Error on apply |
| All checks pass | "APPLY" button shown | Enabled (blue) |

## Testing the System

### Create Test Coupons

**Test 1: General Discount**
```
Code: TEST
Title: 10% Off (auto-generated)
Type: Percentage
Value: 10%
Min Order: ₹0
Max Uses: 100
Specific Products: (empty) → applies to ALL products
```
Expected: Shows in modal as eligible for any cart

**Test 2: Product-Specific**
```
Code: TESTV2
Title: 20% Off Electronics
Type: Percentage
Value: 20%
Min Order: ₹1000
Specific Products: [add some electronics product IDs]
```
Expected: Only shows as eligible if cart has those products AND total ≥ ₹1000

**Test 3: Single Use (Expired)**
```
Code: EXPIRED
Title: Limited Time Offer
Type: Fixed (₹500)
Expires: Yesterday's date
```
Expected: Shows as grayed out with "Coupon expired"

### Testing Steps

1. **Create coupons** in `/store/manage-coupons` admin page
2. **Add items to cart** in home page
3. **Go to checkout** and click "Apply Coupon"
4. **See all coupons** in modal with eligibility indicators
5. **Click eligible** coupons to apply them
6. **See error messages** for ineligible coupons
7. **Place order** to confirm discount was applied

## Architecture Notes

### Why Product IDs are Sent to Frontend
- **Frontend**: Uses `cartProductIds` to check eligibility in real-time modal
- **Backend**: Re-validates product compatibility when coupon is applied (security)
- **Benefit**: Instant feedback to users + server-side validation prevents cheating

### Backward Compatibility
The system supports both old and new coupon field names:
- `discountValue` (new) ↔ `discount` (old)
- `minOrderValue` (new) ↔ `minPrice` (old)

This allows existing coupons to work with the new system without migration.

### Debug Endpoints Available
- `/api/coupons-debug` - Shows all coupons with detailed info
- `/api/store-info` - Gets store ID for the current request

Use these in browser console to troubleshoot coupon issues.

## Files Modified/Created

### Created:
- `/app/api/store-info.js` - Get store ID endpoint
- `/app/api/coupons-debug.js` - Debug endpoint for troubleshooting
- `/app/store/manage-coupons/page.jsx` - New admin coupon management

### Modified:
- `/models/Coupon.js` - Enhanced schema with all coupon fields
- `/app/api/coupons/route.js` - GET: Returns all coupons with metadata; POST: Validates with product checking
- `/app/(public)/checkout/CheckoutPageUI.jsx` - Smart modal with eligibility checking
- `/app/api/store/coupon/route.js` - Old endpoint updated for compatibility
- `/app/api/store/coupon/[code]/route.js` - Old edit/delete with field syncing
- `/app/api/store/coupons/route.js` - New admin CRUD endpoint
- `/app/store/coupons/page.jsx` - Old admin page compatibility fixes

## Logging & Debugging

Add these to browser console to see detailed logs:
```javascript
// In checkout page
console.log('=== COUPON FETCH START ===');
console.log('Fetching store info...');
console.log('Store ID found:', storeId);
console.log('Found X coupons');

// Check availableCoupons
console.log('Available coupons:', availableCoupons);

// Check coupon validation
console.log('Coupon validation response:', response);
```

## Future Enhancements

1. **Usage Analytics**: Track which coupons are most used
2. **Referral System**: Auto-coupons for referred users
3. **Seasonal Campaigns**: Auto-enable/disable coupons by season
4. **Customer Segments**: Coupons specific to customer tiers
5. **Bulk Operations**: Create coupons in bulk from CSV
6. **Email Campaigns**: Send personalized coupon codes via email
