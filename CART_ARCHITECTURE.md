# Cart System - Implementation Details & Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐    ┌──────────────────────────────┐ │
│  │   Redux Store      │    │    Local Storage (Browser)   │ │
│  ├────────────────────┤    ├──────────────────────────────┤ │
│  │ cart:              │    │ cartState:                   │ │
│  │ {                  │    │ {                            │ │
│  │   total: 2,        │◄───┤   total: 2,                  │ │
│  │   cartItems: {     │    │   cartItems: {               │ │
│  │     prod1: 2,      │    │     prod1: 2,                │ │
│  │     prod2: 1       │    │     prod2: 1                 │ │
│  │   }                │    │   }                          │ │
│  │ }                  │    │ }                            │ │
│  └────────────────────┘    └──────────────────────────────┘ │
│           ▲                              │                    │
│           └──────────────────────────────┘                    │
│        (Rehydrate on mount)                                   │
│                                                               │
│  ┌────────────────────┐    ┌──────────────────────────────┐ │
│  │   Cart Slice       │    │   Product Slice              │ │
│  │ (Redux Toolkit)    │    │ (Redux Toolkit)              │ │
│  ├────────────────────┤    ├──────────────────────────────┤ │
│  │ Reducers:          │    │ Reducers:                    │ │
│  │ - addToCart        │    │ - setProduct                 │ │
│  │ - removeFromCart   │    │ - clearProduct               │ │
│  │ - deleteItemFromCart│   │                              │ │
│  │ - clearCart        │    │ State:                       │ │
│  │ - rehydrateCart    │    │ - list: Product[]            │ │
│  │                    │    │ - loading: boolean           │ │
│  │ Async Thunks:      │    │ - error: string|null         │ │
│  │ - uploadCart       │    │                              │ │
│  │ - fetchCart        │    │                              │ │
│  └────────────────────┘    └──────────────────────────────┘ │
│           ▲                              ▲                    │
│           │                              │                    │
│  ┌────────┴──────────────────────────────┴──────────────┐   │
│  │        Persistence Middleware                        │   │
│  │  Watches: cart/* actions → Saves to localStorage    │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
         ┌──────────────────────────────┐
         │    Next.js API Routes        │
         ├──────────────────────────────┤
         │ POST /api/cart               │
         │ GET /api/cart                │
         └──────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────┐
         │    MongoDB Database          │
         ├──────────────────────────────┤
         │ User.cart: Map<ID, Number>   │
         │ {                            │
         │   _id: "firebase-uid",       │
         │   cart: {                    │
         │     "productId": 2,          │
         │     "productId2": 1          │
         │   }                          │
         │ }                            │
         └──────────────────────────────┘
```

## Data Flow Sequences

### Sequence 1: User Adds Product to Cart

```
User clicks "Add to Cart"
    ↓
ProductCard.handleAddToCart()
    ├─ dispatch(addToCart({productId: "123abc"}))
    └─ dispatch(uploadCart({getToken}))
    ↓
Redux Reducer: addToCart
    ├─ Read existing: state.cartItems["123abc"] || 0
    ├─ Calculate: nextQty = existing + 1
    ├─ Store: state.cartItems["123abc"] = nextQty
    ├─ Update total: state.total += 1
    └─ return new state
    ↓
Middleware: cartPersistenceMiddleware
    ├─ Check: action.type.startsWith('cart/')
    ├─ Get state: store.getState().cart
    ├─ Serialize: JSON.stringify(cartState)
    └─ Save: localStorage.setItem('cartState', jsonString)
    ↓
Async Thunk: uploadCart
    ├─ Read state: const {cartItems} = thunkAPI.getState().cart
    ├─ Get token: const token = await getToken()
    ├─ Build request:
    │  ├─ Method: POST
    │  ├─ URL: /api/cart
    │  ├─ Body: {cart: cartItems}  // {cart: {"123abc": 1}}
    │  └─ Headers: if token then Authorization: Bearer {token}
    ├─ Send: await axios.post(...)
    └─ Handle: return {success: true} or rejectWithValue(error)
    ↓
API Route: /api/cart POST
    ├─ Authenticate: extract and verify Bearer token
    ├─ Parse body: const {cart} = await request.json()
    ├─ Database: User.findOneAndUpdate(
    │           {_id: userId},
    │           {cart: cart},
    │           {upsert: true, new: true}
    │        )
    └─ Validate: MongoDB schema checks cart is Map<String, Number>
    ↓
MongoDB
    ├─ Verify schema: cart field is Map of Number ✅
    ├─ Store: user.cart = {"123abc": 1}
    └─ Confirm: 200 OK response
    ↓
UI Updates
    ├─ Component subscribes to Redux state
    ├─ Selector: cartItems = state.cart.cartItems
    ├─ Derived: itemQuantity = cartItems["123abc"] = 1
    └─ Render: Badge shows "1"
```

### Sequence 2: Cart Page Loads with Existing Items

```
User navigates to /cart
    ↓
Page.jsx mounts
    ├─ Initial state from localStorage
    └─ cartItems = {prod1: 2, prod2: 1}
    ↓
InitializeApp component mounts (in ClientLayout)
    ├─ Check: products.length === 0?
    ├─ YES: Fetch products
    │   ├─ Method: GET
    │   ├─ URL: /api/products?limit=1000
    │   └─ Response: {products: [{_id: "prod1", price: 1299}, ...]}
    ├─ Dispatch: {type: "product/setProduct", payload: products}
    └─ Update: state.product.list = [all products]
    ↓
Cart Page: createCartArray()
    ├─ Iterate: cartItems {prod1: 2, prod2: 1}
    ├─ For prod1:
    │   ├─ Find in products: product = {_id: "prod1", price: 1299, ...}
    │   ├─ Get quantity: qty = 2
    │   ├─ Get price: unitPrice = 1299
    │   ├─ Create item: {...product, quantity: 2, _cartPrice: 1299}
    │   └─ Add total: 1299 * 2 = 2598
    ├─ For prod2:
    │   ├─ Find in products: product = {_id: "prod2", price: 599, ...}
    │   ├─ Get quantity: qty = 1
    │   ├─ Get price: unitPrice = 599
    │   ├─ Create item: {...product, quantity: 1, _cartPrice: 599}
    │   └─ Add total: 599 * 1 = 599
    └─ Result: cartArray = [prod1Item, prod2Item], totalPrice = 3197
    ↓
UI Renders
    ├─ Show cart items with correct prices
    ├─ Calculate shipping based on total
    ├─ Display final checkout amount
    └─ Enable/disable buttons based on auth state
```

### Sequence 3: User Removes Item from Cart

```
User clicks minus button on cart item
    ↓
Cart Page: dispatch(removeFromCart({productId: "prod1"}))
    ↓
Redux Reducer: removeFromCart
    ├─ Get existing: state.cartItems["prod1"] = 2
    ├─ Calculate: nextQty = 2 - 1 = 1
    ├─ Store: state.cartItems["prod1"] = 1
    ├─ Update total: state.total -= 1
    └─ return new state
    ↓
Middleware: cartPersistenceMiddleware
    ├─ Serialize: JSON.stringify(cartState)
    └─ Save: localStorage.setItem('cartState', jsonString)
    ↓
UI Updates
    ├─ Quantity decreases from 2 to 1
    ├─ Subtotal recalculates
    └─ Cart total updates
```

### Sequence 4: User Clears Cart

```
User clicks "Clear Cart"
    ↓
Cart Page: dispatch(clearCart())
    ↓
Redux Reducer: clearCart
    ├─ Reset: state.cartItems = {}
    ├─ Reset: state.total = 0
    └─ return new state
    ↓
Middleware: cartPersistenceMiddleware
    ├─ Serialize: {total: 0, cartItems: {}}
    └─ Save: localStorage.setItem('cartState', jsonString)
    ↓
API (Optional): dispatch(uploadCart({getToken}))
    ├─ Sends empty cart to server
    └─ Updates user.cart in database
    ↓
UI Updates
    ├─ Clear all items
    ├─ Show empty cart message
    └─ Show related products section
```

## Component Hierarchy

```
RootLayout (app/layout.jsx)
    ↓
ClientLayout (app/ClientLayout.jsx)
    ├─ <ReduxProvider>
    │   ├─ <Navbar />
    │   ├─ <Toaster />
    │   ├─ <InitializeApp>  ← Loads products
    │   │   ├─ useEffect() → fetch /api/products
    │   │   ├─ dispatch(setProduct)
    │   │   └─ {children}
    │   │       ├─ Cart Page
    │   │       │   ├─ useSelector(cart.cartItems)
    │   │       │   ├─ useSelector(product.list)
    │   │       │   ├─ createCartArray()
    │   │       │   └─ Display cart items
    │   │       │
    │   │       └─ Home Page
    │   │           ├─ LatestProducts (shows featured)
    │   │           │   ├─ ProductCard x N
    │   │           │   │   ├─ Add to cart button
    │   │           │   │   ├─ dispatch(addToCart)
    │   │           │   │   └─ dispatch(uploadCart)
    │   │           │   └─ Shows cart badge
    │   │           └─ Other sections
    │   │
    │   ├─ <SupportBar />
    │   └─ <Footer />
    │
    └─ Redux Store
        ├─ cart Reducer
        │   ├─ State: {total, cartItems}
        │   ├─ Reducers: addToCart, removeFromCart, deleteItemFromCart, clearCart, rehydrateCart
        │   └─ Async Thunks: uploadCart, fetchCart
        │
        └─ product Reducer
            ├─ State: {list, loading, error}
            └─ Reducers: setProduct, clearProduct
```

## Key Design Patterns

### 1. Redux Slice Pattern
```javascript
const cartSlice = createSlice({
  name: 'cart',
  initialState: {...},
  reducers: {
    // Synchronous actions
    addToCart: (state, action) => { /*...*/ },
    removeFromCart: (state, action) => { /*...*/ },
  },
  extraReducers: (builder) => {
    // Handle async thunks
    builder.addCase(uploadCart.fulfilled, (state, action) => { /*...*/ })
  }
});
```

### 2. Custom Middleware Pattern
```javascript
const cartPersistenceMiddleware = store => next => action => {
  const result = next(action);  // Let action through
  if (action.type.startsWith('cart/')) {
    // Side effect: save to localStorage
    const cartState = store.getState().cart;
    localStorage.setItem('cartState', JSON.stringify(cartState));
  }
  return result;
};
```

### 3. Selector Hooks
```javascript
const cartItems = useSelector((state) => state.cart.cartItems);
const products = useSelector((state) => state.product.list);
```

### 4. Async Thunk Pattern
```javascript
export const uploadCart = createAsyncThunk(
  'cart/uploadCart',
  async (params, thunkAPI) => {
    const state = thunkAPI.getState();
    try {
      const response = await api.post(...);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);
```

## Error Handling Strategy

```
┌─────────────────────────────────────┐
│         Error Scenarios              │
└─────────────────────────────────────┘
         │         │         │
         ▼         ▼         ▼
    ┌─────────┐ ┌─────────┐ ┌──────────┐
    │ Network │ │ Storage │ │ Database │
    │ Errors  │ │ Errors  │ │ Errors   │
    └─────────┘ └─────────┘ └──────────┘
         │         │         │
         └────┬────┴────┬────┘
              ▼
    ┌──────────────────────┐
    │ Error Handling Flow  │
    ├──────────────────────┤
    │ 1. Catch exception   │
    │ 2. Log to console    │
    │ 3. Notify user       │
    │ 4. Fallback behavior │
    │ 5. Recover state     │
    └──────────────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ User Experience      │
    ├──────────────────────┤
    │ - Toast notification │
    │ - Keep local state   │
    │ - Retry option       │
    │ - Graceful degradation
    └──────────────────────┘
```

## Performance Optimizations

### 1. Selector Optimization
```javascript
// ❌ Bad: Recreates on every render
const cartTotal = cartItems.reduce(...);

// ✅ Good: Memoized selector
const selectCartTotal = (state) => 
  Object.values(state.cart.cartItems).reduce((a, b) => a + b, 0);
```

### 2. Component Splitting
```javascript
// InitializeApp component handles loading
// Cart page only handles display
// Prevents unnecessary re-renders
```

### 3. Lazy Loading
```javascript
// Products fetched once on app start
// Not on every page navigation
// Cached in Redux store
```

### 4. localStorage Optimization
```javascript
// Middleware batch saves
// Not on every keystroke
// Only for cart/* actions
```

## Scaling Considerations

### For 10K Products:
- Current: Fetch all on app start (1 network call)
- Alternative: Lazy load by category or search

### For 1M Cart Items:
- Current: Store in Redux + localStorage
- Alternative: Server-side session storage

### For High Traffic:
- Add: API rate limiting
- Add: Request deduplication
- Add: Caching headers

## Testing Strategy

### Unit Tests
```javascript
// Test reducers
test('addToCart increments quantity', () => {
  const state = {total: 0, cartItems: {}};
  const newState = addToCart(state, {payload: {productId: 'p1'}});
  expect(newState.cartItems['p1']).toBe(1);
});
```

### Integration Tests
```javascript
// Test full flow
test('Add to cart, then cart page shows item', async () => {
  // 1. Add to cart
  // 2. Navigate to cart
  // 3. Assert item is displayed
});
```

### E2E Tests
```javascript
// Test real user flow
test('User adds item and checks out', async () => {
  // Click add button
  // Verify cart count
  // Go to checkout
  // Complete payment
});
```
