# Cart System Testing Guide

## Quick Start - Test the Cart Fix

### Step 1: Browser Console Setup
Open DevTools and add these filters to the console:
```
Show Messages from: [✓] Content Script
Show Messages from: [✓] All Levels
Filter: cart
```

### Step 2: Test Basic Cart Operations

#### Test 2a: Add to Cart
1. Navigate to home page with featured products
2. Click "Add to Cart" button on any product
3. **Expected in Console:**
   ```
   [cartSlice] addToCart - productId: 123abc qty: 1
   [cartMiddleware] SAVED to localStorage: {"total":1,"cartItems":{"123abc":1}}
   [ClientLayout] Loaded 1000 products
   ```

4. **Expected UI:** 
   - Cart icon shows badge with "1"
   - Toast shows "Added to cart"
   - localStorage shows: `{"total":1,"cartItems":{"123abc":1}}`

#### Test 2b: Add Same Product Again
1. Click same product's add button
2. **Expected in Console:**
   ```
   [cartSlice] addToCart - productId: 123abc qty: 2
   [cartMiddleware] SAVED to localStorage: {"total":2,"cartItems":{"123abc":2}}
   ```

3. **Expected UI:**
   - Cart badge shows "2"

#### Test 2c: Add Different Product
1. Add a different product
2. **Expected in Console:**
   ```
   [cartSlice] addToCart - productId: 456def qty: 1
   [cartMiddleware] SAVED to localStorage: {"total":3,"cartItems":{"123abc":2,"456def":1}}
   ```

3. **Expected UI:**
   - Cart badge shows "3"

### Step 3: Test Cart Page Display

1. Navigate to `/cart`
2. **Expected in Console:**
   ```
   [Cart Page] Redux cartItems: {"123abc":2,"456def":1}
   [Cart Page] Redux cartItems keys: ["123abc","456def"]
   [Cart Page] Redux products count: 1000
   [Cart Page] localStorage cartState: {"total":3,"cartItems":{"123abc":2,"456def":1}}
   ```

3. **Expected UI:**
   - Shows both products
   - Displays correct quantities (2 and 1)
   - Cart total = 3 items
   - Shows product prices and images

### Step 4: Test Removal Operations

#### Test 4a: Decrease Quantity
1. On cart page, click minus button on an item
2. **Expected:**
   - Quantity decreases by 1
   - localStorage updates
   - Cart total decreases
   - No MongoDB errors

#### Test 4b: Delete Item
1. Click trash icon to remove item
2. **Expected:**
   - Item disappears from cart
   - Total decreases
   - localStorage updates
   - Other items remain

### Step 5: Test Persistence

#### Test 5a: Refresh Page
1. Add items to cart
2. Refresh the page (F5)
3. **Expected:**
   - Cart items still present
   - Correct quantities displayed
   - No API errors

#### Test 5b: Close and Reopen Tab
1. Add items to cart
2. Close the browser tab
3. Reopen and navigate back
4. **Expected:**
   - Cart items restored from localStorage
   - Quantities correct

### Step 6: Monitor API Calls

Open Network tab and filter for `/api/cart`:

#### When Adding to Cart:
```
POST /api/cart
Body: {
  "cart": {
    "productId1": 2,
    "productId2": 1
  }
}
Response: 200 OK
```

**❌ Should NOT see:**
```
{"cart": {"productId1": {"quantity": 2}}}  // WRONG - objects instead of numbers
```

#### When Loading Cart:
```
GET /api/cart
Response: {
  "cart": {
    "productId1": 2,
    "productId2": 1
  }
}
```

### Step 7: Check Browser Storage

Open DevTools → Application → Local Storage

**Expected cartState format:**
```json
{
  "total": 3,
  "cartItems": {
    "507f1f77bcf86cd799439011": 2,
    "507f1f77bcf86cd799439012": 1
  }
}
```

**❌ Should NOT be:**
```json
{
  "cartItems": {
    "507f1f77bcf86cd799439011": {"quantity": 2},
    "507f1f77bcf86cd799439012": {"quantity": 1}
  }
}
```

### Step 8: MongoDB Data Verification

Query MongoDB (if you have access):
```javascript
db.users.findOne({_id: "firebaseUID"})
```

**Expected cart field:**
```javascript
cart: {
  "507f1f77bcf86cd799439011": 2,
  "507f1f77bcf86cd799439012": 1
}
```

**❌ Should NOT be:**
```javascript
cart: {
  "507f1f77bcf86cd799439011": {quantity: 2},
  "507f1f77bcf86cd799439012": {quantity: 1}
}
```

## Troubleshooting

### Issue: Cart shows as empty on cart page
**Solution:**
1. Check if products loaded: `db.getState().product.list.length > 0`
2. Check localStorage: Open DevTools → Application → Local Storage → cartState
3. Check cartItems in Redux: Add to console: `store.getState().cart.cartItems`

### Issue: API returns 400 Bad Request
**Solution:**
1. Check Network tab for actual payload being sent
2. Verify cart format is numbers: `{productId: 1}` NOT `{productId: {quantity: 1}}`
3. Check API response message for MongoDB validation details

### Issue: Cart doesn't persist after refresh
**Solution:**
1. Check if localStorage is enabled
2. Verify `rehydrateCart` action is dispatched on app load
3. Check console for rehydration logs: `[cartSlice] rehydrateCart called`

### Issue: Cart total doesn't match item count
**Solution:**
1. Manually clear localStorage: `localStorage.clear()`
2. Reload page
3. Add items again and verify totals update

## Debug Commands for Console

```javascript
// View current cart state
JSON.stringify(store.getState().cart, null, 2)

// View current products
store.getState().product.list.length

// View localStorage cart
JSON.parse(localStorage.getItem('cartState'))

// Clear cart
store.dispatch({type: 'cart/clearCart'})

// Add item manually
store.dispatch({type: 'cart/addToCart', payload: {productId: 'test123'}})

// View middleware logs
window.__cartMiddlewareLog
```

## Success Indicators ✅

After fix is complete, you should see:
1. ✅ Products load automatically on app start
2. ✅ Cart items persist to localStorage as numbers: `{productId: 1}`
3. ✅ API calls use correct format (no MongoDB validation errors)
4. ✅ Cart page displays all items with correct totals
5. ✅ Cart persists across page refreshes
6. ✅ No 400 Bad Request errors
7. ✅ Quantities update correctly
8. ✅ Items can be removed and cart updates

## Performance Notes

- Products are loaded once on app start (1000 items)
- Cart persists to localStorage with each action
- API calls optional (only when explicitly uploading)
- No unnecessary re-renders with optimized selectors
