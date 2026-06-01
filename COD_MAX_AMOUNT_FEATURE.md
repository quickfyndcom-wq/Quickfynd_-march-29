# COD Maximum Amount Feature

## Overview
This feature allows store owners to set a maximum order total for Cash on Delivery (COD) payments. If a customer's order exceeds this maximum amount, COD will be disabled and they must use a card payment instead.

## Use Case
- Limit financial risk on high-value COD orders
- Control cash flow and inventory exposure
- Set different thresholds for different delivery methods

## Configuration

### Admin Panel (Store Shipping Settings)
Navigate to: **Store → Shipping Settings → Cash on Delivery (COD)**

**New Field:**
- **Maximum COD Amount** - Enter the maximum order total for which COD is available
  - Use `0` for unlimited (default)
  - Format: Currency amount (e.g., 5000, 10000)

### Example Configuration
```
Enable COD: ✓ (checked)
COD Processing Fee: ₹50
Maximum COD Amount: ₹10000
```

This means:
- COD is available for orders up to ₹10,000
- Orders exceeding ₹10,000 cannot use COD
- Customers must use Card/Razorpay for larger orders

## How It Works

### Checkout Page Behavior
1. **Order Total ≤ Max Amount**: COD option is available and enabled
2. **Order Total > Max Amount**: COD option is disabled with a message
   - Button appears grayed out
   - User sees: "Not available for orders above ₹{maxAmount}"
   - User must select Card payment method

### Technical Implementation

#### Files Modified

1. **Admin Settings Page** (`app/store/shipping/page.jsx`)
   - Added input field for max COD amount
   - Stores value in form state
   - Sends to API on save

2. **API Endpoint** (`app/api/shipping/route.js`)
   - GET: Returns maxCODAmount in shipping settings
   - PUT: Accepts and stores maxCODAmount
   - Default: 0 (unlimited)

3. **Checkout Page** (`app/(public)/checkout/CheckoutPageUI.jsx`)
   - Checks order subtotal against maxCODAmount
   - Disables COD radio button if limit exceeded
   - Shows informative message to customer

4. **Shipping Library** (`lib/shipping.js`)
   - Ready for future expansions
   - Currently just calculates fees

#### Database Fields

Added to ShippingSetting model:
```javascript
maxCODAmount: {
  type: Number,
  default: 0  // 0 = unlimited
}
```

## API Reference

### GET /api/shipping
Returns shipping settings including:
```json
{
  "setting": {
    "enableCOD": true,
    "codFee": 50,
    "maxCODAmount": 10000,
    ...
  }
}
```

### PUT /api/shipping
Update shipping settings:
```json
{
  "enableCOD": true,
  "codFee": 50,
  "maxCODAmount": 10000,
  ...
}
```

## User Experience

### For Store Owners
1. Go to Store Dashboard → Shipping
2. Scroll to "Cash on Delivery (COD)" section
3. Enable COD checkbox (if needed)
4. Set COD Processing Fee
5. **NEW:** Set Maximum COD Amount
6. Click Save

### For Customers
**Scenario 1: Order under limit**
```
Subtotal: ₹8,000
Max COD: ₹10,000
→ COD available ✓ Can select
```

**Scenario 2: Order exceeds limit**
```
Subtotal: ₹12,000
Max COD: ₹10,000
→ COD disabled ✗ 
Message: "Not available for orders above ₹10,000"
Must use Card payment
```

## Features & Benefits

✅ **Risk Management**
- Limit cash flow exposure
- Reduce payment defaults

✅ **Flexible Control**
- Set per store
- Enable/disable easily
- Change at any time

✅ **Customer Transparency**
- Clear messaging about why COD is unavailable
- Seamless fallback to card payment
- No confusion during checkout

✅ **Easy Configuration**
- Single number input
- 0 = unlimited (backward compatible)
- Saved with other shipping settings

## Testing

### Test Case 1: COD Available
1. Set Max COD Amount to ₹10,000
2. Add products totaling ₹8,000
3. Go to checkout
4. **Expected:** COD option is enabled
5. **Result:** Can select COD ✓

### Test Case 2: COD Disabled by Limit
1. Set Max COD Amount to ₹5,000
2. Add products totaling ₹7,000
3. Go to checkout
4. **Expected:** COD option is disabled
5. **Result:** 
   - Option appears grayed out
   - Message shows: "Not available for orders above ₹5,000"
   - Cannot select COD
   - Must choose Card payment ✓

### Test Case 3: COD Disabled Globally
1. Uncheck "Enable COD" checkbox
2. Add products
3. Go to checkout
4. **Expected:** COD option is disabled
5. **Result:** Option not available ✓

### Test Case 4: Unlimited COD (0 Amount)
1. Set Max COD Amount to ₹0
2. Add products (any amount)
3. Go to checkout
4. **Expected:** COD always available
5. **Result:** Can select COD regardless of total ✓

## Future Enhancements

Possible additions:
- Different max amounts by region/city
- Max amounts by product category
- Scheduled COD availability (time-based)
- Dynamic limits based on inventory
- COD payment success rate thresholds

## FAQ

**Q: What happens if I set max COD to ₹5,000 but customer's order is ₹4,999?**
A: COD will be available since the order is under the limit.

**Q: Can I change the max COD amount after orders are placed?**
A: Yes, changes apply to new orders only. Past orders keep their original settings.

**Q: What if max COD is 0?**
A: COD is available for any order amount (unlimited).

**Q: Does this affect existing COD orders?**
A: No, only applies at checkout for new orders.

**Q: Can customers bypass this restriction?**
A: No, COD is disabled at the checkout level. They must use card payment.

## Support

For issues or questions:
1. Check the shipping settings page in your store dashboard
2. Verify the max COD amount is set correctly
3. Clear browser cache if UI doesn't update
4. Contact support if problems persist

---

**Version:** 1.0  
**Release Date:** January 23, 2026  
**Status:** ✅ Active
