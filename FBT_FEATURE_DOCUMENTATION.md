# Frequently Bought Together (FBT) Feature

## Overview
The Frequently Bought Together feature allows store owners to create product bundles that encourage customers to purchase multiple related items together, similar to Amazon's "Frequently Bought Together" feature.

## Components Implemented

### 1. Database Schema
**Files Modified:**
- `prisma/schema.prisma` - Added FBT fields to Product model
- `models/Product.js` - Added MongoDB schema fields

**Fields Added:**
- `enableFBT` (Boolean) - Enable/disable FBT for a product
- `fbtProductIds` (String[]) - Array of product IDs to bundle
- `fbtBundlePrice` (Float, optional) - Fixed bundle price
- `fbtBundleDiscount` (Float, optional) - Percentage discount on bundle

### 2. API Endpoints
**File:** `app/api/products/[id]/fbt/route.js`

**Endpoints:**
- `GET /api/products/[id]/fbt` - Fetch FBT configuration and products
- `PATCH /api/products/[id]/fbt` - Update FBT configuration

### 3. Customer-Facing UI
**File:** `components/ProductDetails.jsx`

**Features:**
- Displays FBT section below product details
- Shows main product + selected FBT products
- Checkboxes to select/deselect bundle items
- Real-time price calculation
- Bundle discount display
- "Add Bundle to Cart" button

### 4. Admin Interface
**File:** `app/admin/products/fbt/page.jsx`

**Features:**
- Product search and selection
- Enable/disable FBT toggle
- Multi-product selector with search
- Bundle price configuration
- Bundle discount configuration
- Save configuration

## Usage

### For Store Owners (Admin)

1. Navigate to `/admin/products/fbt`
2. Search and select a product from the left panel
3. Toggle "Enable Frequently Bought Together"
4. Search and add related products
5. (Optional) Set a fixed bundle price or percentage discount
6. Click "Save Configuration"

### For Customers

1. View product detail page
2. If FBT is enabled, section appears below product details
3. Select/deselect items using checkboxes
4. View total bundle price
5. Click "Add Bundle to Cart" to add all selected items

## Pricing Logic

The bundle price is calculated as follows:

1. If `fbtBundlePrice` is set: Use fixed price
2. Else if `fbtBundleDiscount` is set: Apply percentage discount to sum of all prices
3. Else: Sum of individual product prices (no discount)

**Formula:**
```javascript
bundleTotal = mainProduct.price + sum(selectedFbtProducts.prices)
finalPrice = fbtBundlePrice || (bundleTotal * (1 - fbtBundleDiscount/100))
```

## Configuration Examples

### Example 1: Fixed Bundle Price
- Main Product: ₹1000
- FBT Products: ₹500, ₹300
- Bundle Price: ₹1500
- **Savings: ₹300 (16.7% off)**

### Example 2: Percentage Discount
- Main Product: ₹1000
- FBT Products: ₹500, ₹300
- Bundle Discount: 10%
- **Final Price: ₹1620 (₹1800 - 10%)**

### Example 3: No Discount
- Main Product: ₹1000
- FBT Products: ₹500, ₹300
- **Final Price: ₹1800 (sum of all)**

## Technical Details

### State Management
- Uses Redux for cart management
- Local state for FBT product selection
- Axios for API calls

### Cart Integration
- Main product added to cart
- Each selected FBT product added individually
- Cart synced to server for signed-in users

### Image Handling
- Uses Next.js Image component
- Fallback placeholder for missing images
- Responsive image sizing

## Future Enhancements

Possible improvements:
- Analytics tracking for FBT bundles
- Auto-suggestions based on purchase history
- A/B testing for bundle configurations
- Variant selection within FBT products
- Bulk FBT configuration import/export
- FBT performance metrics dashboard

## Testing Checklist

- [ ] Admin can enable FBT for a product
- [ ] Admin can add/remove FBT products
- [ ] Admin can set bundle price
- [ ] Admin can set bundle discount
- [ ] Customer sees FBT section when enabled
- [ ] Customer can select/deselect items
- [ ] Price calculates correctly
- [ ] All items added to cart properly
- [ ] Cart syncs for signed-in users
- [ ] Mobile responsive design works
- [ ] Loading states display correctly
- [ ] Error handling works

## Notes

- Maximum 3-4 FBT products recommended for best UX
- Bundle discount range: 0-50% recommended
- Test with various product price ranges
- Consider inventory when enabling FBT
- FBT products should be complementary items
