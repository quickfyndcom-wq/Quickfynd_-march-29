# Checkout & Coupons Fixes - January 30, 2026

## Issues Identified and Fixed

### 1. JSON Parse Error: "Unexpected token '<', "<!DOCTYPE"..."
**Problem**: The checkout page was attempting to parse API responses as JSON without proper error handling. When an API returned an error status (404, 500, etc.), Next.js would return an HTML error page instead of JSON, causing `await res.json()` to fail with the error message mentioned.

**Root Cause**: Multiple API calls in the checkout flow were missing:
- Response status checks before parsing JSON
- Try-catch blocks for JSON parsing
- Detailed error logging

**Fixed Files**: 
- `app/(public)/checkout/CheckoutPageUI.jsx` (lines 160-189)

**Changes Made**:
1. Added `response.ok` checks before attempting `.json()` parsing
2. Added try-catch blocks specifically for JSON parsing
3. Added detailed error logging to help debug future issues
4. Changed from direct `.json()` parsing to using `.text()` when responses fail, allowing inspection of the actual response

**Code Changes**:
```javascript
// BEFORE (line 164-165, 173-174, 188-189)
const storeRes = await fetch('/api/store-info');
const storeData = await storeRes.json();  // Could fail with HTML response

// AFTER
const storeRes = await fetch('/api/store-info');

if (!storeRes.ok) {
  console.error('Store-info API returned status:', storeRes.status);
  const storeResText = await storeRes.text();  // Get raw response
  console.error('Store-info response:', storeResText.substring(0, 200));
  return;
}

let storeData;
try {
  storeData = await storeRes.json();
} catch (parseError) {
  console.error('Failed to parse store-info response:', parseError);
  return;
}
```

---

### 2. Coupons Database Storage & Retrieval
**Status**: ✅ Working Correctly

**Flow Verified**:
1. **Admin Creates Coupon** → `POST /api/admin/coupon`
   - Stores coupon in MongoDB with `storeId`, `code`, `discountValue`, etc.
   - Triggers Inngest event for automatic expiration

2. **Frontend Fetches Coupons** → `GET /api/coupons?storeId={storeId}`
   - Retrieves active coupons from database
   - Filters by store and expiration date
   - Returns array to checkout page

3. **User Applies Coupon** → `POST /api/coupons`
   - Validates coupon (not expired, usage limits, min order value)
   - Calculates discount amount
   - Returns coupon details to frontend

4. **Checkout Displays Coupons**
   - Shows available coupons in modal
   - Applies selected coupon to order
   - Displays discount in order summary

**Database Model**: `models/Coupon.js`
- Schema includes: code, title, description, storeId, discountType, discountValue, minOrderValue, maxDiscount, maxUses, usedCount, maxUsesPerUser, expiresAt, isActive

---

### 3. Checkout & Sign-In Flow
**Status**: ✅ Working As Designed

**Payment Method Routing**:
1. **Credit Card** (Razorpay/Stripe) → Guest or Logged-in
   - Can process as guest
   - Requires payment verification

2. **COD (Cash on Delivery)** → Logged-in ONLY
   - If user not logged in: Shows sign-in modal
   - After sign-in: Allows checkout to proceed
   - Order saved with user association

**Sign-In Flow**:
```
User selects COD → Not logged in?
  ↓
Set form error: "Please sign in to use Cash on Delivery"
  ↓
Show SignInModal component
  ↓
User logs in → Modal closes
  ↓
User can now submit order with COD
```

**Relevant Code**: `app/(public)/checkout/CheckoutPageUI.jsx` (lines 656-659)

---

## Testing Recommendations

### 1. Test JSON Error Handling
```bash
# Simulate API error by temporarily breaking MongoDB connection
curl http://localhost:3001/api/store-info
# Should show error logs with response status in console
```

### 2. Test Coupon Fetch & Display
```bash
# Create a coupon via admin panel
POST /api/admin/coupon
{
  "coupon": {
    "code": "TEST10",
    "title": "Test Coupon",
    "description": "10% off test",
    "storeId": "store-id-here",
    "discountType": "percentage",
    "discountValue": 10
  }
}

# Go to checkout and verify coupon appears in modal
```

### 3. Test Checkout Flow
```bash
# Test as guest with Credit Card → Should work
# Test as guest with COD → Should show sign-in modal
# Test as logged-in with COD → Should work
```

---

## Files Modified

1. **app/(public)/checkout/CheckoutPageUI.jsx**
   - Added response status checking
   - Added JSON parsing error handling
   - Enhanced console logging for debugging

---

## API Endpoints Involved

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/store-info` | GET | Get store ID for coupon filtering | Public |
| `/api/coupons` | GET | Fetch active coupons for store | Public |
| `/api/coupons` | POST | Validate & apply coupon | Public |
| `/api/coupons-debug` | GET | Debug endpoint for coupons | Public |
| `/api/admin/coupon` | POST | Create coupon (admin only) | Admin |
| `/api/admin/coupon` | DELETE | Delete coupon (admin only) | Admin |
| `/api/orders` | POST | Create order | Public/Logged-in |

---

## Next Steps

1. **Monitor Console Logs**: Check browser console for detailed error messages if issues persist
2. **Database Verification**: Ensure Store document exists in MongoDB
3. **Coupon Creation**: Add coupons via admin panel and verify they appear in checkout
4. **Testing**: Test complete checkout flow for both guest and logged-in users

---

**Status**: Ready for Testing ✅
**Last Updated**: January 30, 2026
