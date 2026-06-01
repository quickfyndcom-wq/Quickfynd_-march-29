# Coupon System - Quick Reference

## What Was Implemented

### ✅ Smart Coupon Display in Checkout Modal
All coupons now show with real-time eligibility checking:
- **Eligible coupons**: Blue highlight, clickable, shows "APPLY" button
- **Ineligible coupons**: Grayed out, shows reason (e.g., "Not applicable for your products")

### ✅ Eligibility Rules (Automatic)
Each coupon is checked for:
1. **Not expired** - If expiresAt date has passed → Show "Coupon expired"
2. **Not exhausted** - If maxUses reached → Show "Usage limit reached"  
3. **Min order value met** - If cart < minOrderValue → Show "Min order ₹X required"
4. **Product match** - If specificProducts set and no match → Show "Not applicable for your products"

### ✅ Product-Specific Coupons
Coupons can target specific products:
- Admin creates coupon and assigns to specific products
- Checkout automatically checks if cart has those products
- Shows appropriate message if products don't match

### ✅ Enhanced API with Product Support
- GET `/api/coupons?storeId={id}` → Returns all coupons with eligibility metadata
- POST `/api/coupons` → Validates coupon + checks product compatibility

---

## How to Use

### For Admin (Creating Coupons)
1. Go to `/store/manage-coupons`
2. Click "Add New Coupon"
3. Fill in:
   - **Code**: e.g., "SAVE10" (will auto-uppercase)
   - **Title**: e.g., "10% Off" (auto-generated if left blank)
   - **Description**: e.g., "Save 10% on all products"
   - **Discount Type**: Choose percentage (%) or fixed amount (₹)
   - **Discount Value**: 10 for 10% or 500 for ₹500 off
   - **Min Order Value**: Minimum cart total required (e.g., 500)
   - **Max Discount**: Cap on discount (e.g., 1000)
   - **Max Uses**: Total times coupon can be used (e.g., 100)
   - **Max Uses Per User**: Limit per customer (e.g., 5)
   - **Expires**: Pick expiration date (optional)
   - **Specific Products**: Select products this coupon applies to (leave empty = all products)
   - **Badge Color**: Choose color for visual appeal

4. Click "Create Coupon"

### For Customers (Applying Coupons)
1. Add items to cart
2. Go to checkout
3. Click "Apply Coupon" button
4. See list of available coupons:
   - **Blue/clickable** = Can use this coupon
   - **Grayed out** = Can't use (see reason below coupon)
5. Click coupon to auto-fill code, then click Apply
6. Discount shows in order summary

---

## Error Messages Customers See

| Issue | Message |
|-------|---------|
| Coupon code doesn't exist | "Invalid coupon code" |
| Coupon expired | "Coupon expired" |
| Too many people used it | "Usage limit reached" |
| You already used it | "You have already used this coupon" |
| Cart total too low | "Min order ₹500 required" |
| Coupon only for different products | "Not applicable for your products" |
| Coupon only for different products (attempted apply) | "This coupon is not applicable for the products in your cart" |

---

## Example Scenarios

### Scenario 1: General Discount
**Coupon**: 10% Off Everything
- Code: SAVE10
- Applies to: All products
- Min Order: ₹0
- Status: In every checkout (unless expired/exhausted)

**What happens**:
✅ Shows in modal as eligible for any customer
✅ Discount calculated as 10% of cart total
✅ Customer can apply anytime

---

### Scenario 2: Product-Specific Discount
**Coupon**: 20% Off Electronics
- Code: TECH20
- Applies to: Laptop, Phone, Tablet (specific product IDs)
- Min Order: ₹1000
- Status: Only for tech customers

**What happens**:
- ✅ Shows in modal only if cart has electronics
- ❌ Shows grayed out if cart only has clothes
- ✅ Only works if order total ≥ ₹1000
- Shows error: "Not applicable for your products" if no electronics

---

### Scenario 3: Spend & Save
**Coupon**: ₹100 Off on ₹500+
- Code: SPEND500
- Type: Fixed ₹100 off
- Min Order: ₹500
- Applies to: All products

**What happens**:
- Cart ₹400 → ❌ Shows "Min order ₹500 required"
- Cart ₹600 → ✅ Shows as eligible, gives ₹100 off

---

## Testing Checklist

- [ ] Create a simple coupon with no restrictions (test basic functionality)
- [ ] Create a product-specific coupon (test eligibility checking)
- [ ] Create an expired coupon (verify "Coupon expired" message)
- [ ] Add items to cart and open checkout
- [ ] Verify all applicable coupons show as enabled
- [ ] Verify ineligible coupons show as grayed out with reason
- [ ] Click an eligible coupon and verify code auto-fills
- [ ] Apply coupon and verify discount calculation
- [ ] Try to apply ineligible coupon and verify error message
- [ ] Try to apply non-existent code and verify error

---

## Key Files Changed

| File | Change |
|------|--------|
| `/api/coupons/route.js` | GET returns eligibility metadata; POST validates products |
| `/checkout/CheckoutPageUI.jsx` | Modal shows all coupons with real-time eligibility |
| `/models/Coupon.js` | Enhanced schema with product fields |
| `/store/manage-coupons/page.jsx` | Modern admin UI for coupon management |

---

## Troubleshooting

**Q: Coupons don't show in checkout modal**
A: Check `/api/coupons-debug` endpoint - verify coupons exist in DB with correct storeId

**Q: Coupon shows but can't apply**
A: Check console logs for validation errors. Common issues:
- Min order value not met
- Products don't match
- Coupon expired
- User already used it

**Q: Product-specific coupon not working**
A: In admin, did you select specific products? Empty list = all products

**Q: Discount not calculating correctly**
A: Check coupon's discountType and discountValue fields in database

---

## API Reference

### Get All Coupons (for modal display)
```bash
GET /api/coupons?storeId=<storeId>
```

Response includes eligibility data:
```json
{
  "success": true,
  "coupons": [
    {
      "code": "TEST",
      "title": "10% Off",
      "status": "active",        // active|expired|exhausted
      "isExpired": false,
      "isExhausted": false,
      "specificProducts": [],
      "discountValue": 10,
      ...
    }
  ]
}
```

### Validate & Apply Coupon
```bash
POST /api/coupons
Content-Type: application/json

{
  "code": "TEST",
  "storeId": "<storeId>",
  "orderTotal": 1500,
  "userId": "<userId>",        // Optional
  "cartProductIds": ["p1", "p2"]  // Product IDs in cart
}
```

Success response:
```json
{
  "success": true,
  "valid": true,
  "coupon": {
    "code": "TEST",
    "discountAmount": 150
  }
}
```

Error response:
```json
{
  "error": "Not applicable for your products",
  "valid": false
}
```

---

## Summary

✅ **Complete Implementation**: All coupons display with smart eligibility checking
✅ **Product-Specific**: Coupons can target specific products  
✅ **Real-Time Validation**: Users see exactly why coupons are/aren't eligible
✅ **Backward Compatible**: Works with both old and new coupon structures
✅ **Production Ready**: Error handling, logging, security checks included
