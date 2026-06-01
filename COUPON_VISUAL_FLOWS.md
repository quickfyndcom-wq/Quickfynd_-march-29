# Coupon System - Visual Flow Diagram

## User Journey: From Cart to Discount Applied

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                    CUSTOMER'S COUPON JOURNEY                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Customer Adds Items to Cart
┌──────────────────────────────────────────┐
│  Item 1: Laptop          ₹50,000         │
│  Item 2: Mouse           ₹1,500          │
│  ────────────────────────────────────    │
│  Cart Total:             ₹51,500         │
└──────────────────────────────────────────┘
           │
           ▼

STEP 2: Customer Goes to Checkout
┌──────────────────────────────────────────┐
│  Checkout Form                           │
│  ├─ Delivery Address                    │
│  ├─ Payment Method                      │
│  └─ ✨ Apply Coupon ◄──── CLICK HERE   │
└──────────────────────────────────────────┘
           │
           ▼

STEP 3: Coupon Modal Opens with Smart Eligibility
┌─────────────────────────────────────────────────────────────────┐
│  APPLY COUPON                                          [X Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Enter coupon code here...............] [Apply Button]        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Available Coupons:                                            │
│                                                                  │
│  ✅ ELIGIBLE (BLUE - CLICKABLE)                               │
│  ┌────────────────────────────────────────┐                   │
│  │ [SAVE10] 10% Off Everything            │ [APPLY]          │
│  │ Get 10% discount on all products      │                   │
│  └────────────────────────────────────────┘                   │
│                                                                  │
│  ❌ INELIGIBLE (GRAYED OUT - DISABLED)                         │
│  ┌────────────────────────────────────────┐                   │
│  │ [TECH20] 20% Off Electronics          │                   │
│  │ Not applicable for your products      │                   │
│  │ (You don't have electronics in cart)  │                   │
│  └────────────────────────────────────────┘                   │
│                                                                  │
│  ❌ INELIGIBLE (GRAYED OUT - DISABLED)                         │
│  ┌────────────────────────────────────────┐                   │
│  │ [SPEND500] ₹100 Off on ₹500+          │                   │
│  │ Min order ₹500 required               │                   │
│  │ (Your cart: ₹51,500 ✓ - But expired) │                   │
│  │ Coupon expired                         │                   │
│  └────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           │ Customer clicks eligible coupon
           ▼

STEP 4: Code Auto-Fills & Modal Closes
┌──────────────────────────────────────────┐
│  Checkout Form                           │
│  ├─ Delivery Address                    │
│  ├─ Payment Method                      │
│  └─ Coupon: [SAVE10................]     │
│         └─ Apply (fired automatically)   │
└──────────────────────────────────────────┘
           │
           │ Frontend validates (quick check)
           │ Backend validates (security check)
           ▼

STEP 5: Discount Applied & Shown
┌─────────────────────────────────────────────────────────────────┐
│  ORDER SUMMARY                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Subtotal:             ₹51,500                                  │
│  Shipping:             ₹0 (Free)                                │
│  ─────────────────────────────────────                          │
│  Subtotal:             ₹51,500                                  │
│                                                                  │
│  Coupon Applied: SAVE10                                         │
│  ├─ Discount (10%):   -₹5,150                                  │
│  └─ Final Total:       ₹46,350 ✅                               │
│                                                                  │
│  Wallet Balance:       ₹1,000 (available)                       │
│                                                                  │
│  GRAND TOTAL:          ₹45,350                                 │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼

STEP 6: Order Placed
✅ Payment processed
✅ Discount applied to order
✅ Coupon usage count incremented
```

---

## Eligibility Logic Flowchart

```
Customer opens coupon modal
      │
      ▼
┌─────────────────────────────────┐
│ System fetches all coupons      │
│ from /api/coupons?storeId=...   │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ For each coupon:                │
└─────────────────────────────────┘
      │
      ├─────────────────────┬──────────────────────┐
      │                     │                      │
      ▼                     ▼                      ▼
   Check 1              Check 2                Check 3
┌─────────────────┐  ┌──────────────┐  ┌────────────────┐
│ Is Expired?     │  │ Is Exhausted?│  │ Min Order Met? │
│                 │  │              │  │                │
│ YES: DISABLED   │  │ YES: DISABLED│  │ NO: DISABLED   │
│ expiresAt < now │  │ usedCount >= │  │ cart < minOrder│
│                 │  │ maxUses      │  │                │
│ Show: "Coupon   │  │              │  │ Show: "Min     │
│ expired"        │  │ Show: "Usage │  │ order ₹X       │
│                 │  │ limit        │  │ required"      │
└─────────────────┘  │ reached"     │  │                │
      │              └──────────────┘  └────────────────┘
      │                     │                  │
      └─────┬───────────────┴──────────────────┘
            │ (All passed)
            ▼
      Check 4
┌──────────────────────────────────┐
│ Product-Specific Check           │
│                                  │
│ IF specificProducts.length > 0:  │
│   Check if cart has any of       │
│   those products                 │
│                                  │
│   YES: ENABLED (blue)            │
│   NO: DISABLED (grayed out)      │
│   Show: "Not applicable for      │
│          your products"          │
│                                  │
│ ELSE (empty list):               │
│   ENABLED (applies to all)       │
└──────────────────────────────────┘
```

---

## Database Schema Visualization

```
Coupon Collection in MongoDB
┌──────────────────────────────────────────────────┐
│ _id: ObjectId                                    │
│                                                  │
│ BASIC INFO                                      │
│ ├─ code: "SAVE10" (unique per store)           │
│ ├─ storeId: ObjectId (which store)             │
│ ├─ isActive: true (enable/disable)             │
│ │                                               │
│ DISPLAY INFO                                    │
│ ├─ title: "10% Off"                            │
│ ├─ description: "Save 10% on all products"    │
│ ├─ badgeColor: "#10B981" (green)               │
│ │                                               │
│ DISCOUNT CONFIG                                 │
│ ├─ discountType: "percentage" | "fixed"        │
│ ├─ discountValue: 10 (percent or amount)       │
│ ├─ maxDiscount: 1000 (cap on discount)         │
│ │                                               │
│ REQUIREMENTS                                    │
│ ├─ minOrderValue: 500 (min cart total)         │
│ ├─ specificProducts: ["p1", "p2"] (target)     │
│ │                                               │
│ USAGE LIMITS                                    │
│ ├─ maxUses: 100 (total usage cap)              │
│ ├─ usedCount: 5 (times already used)           │
│ ├─ maxUsesPerUser: 5 (per customer limit)      │
│ │                                               │
│ VALIDITY                                        │
│ ├─ expiresAt: "2025-12-31T23:59:59.000Z"       │
│ ├─ createdAt: "2024-01-01T00:00:00.000Z"       │
│ └─ updatedAt: "2024-01-15T12:30:00.000Z"       │
└──────────────────────────────────────────────────┘
```

---

## API Communication Flow

```
FRONTEND (Checkout Page)          API LAYER              BACKEND (MongoDB)
─────────────────────────         ─────────             ──────────────────

Customer opens checkout
     │
     ├─ Fetch store info
     │  GET /api/store-info
     │  ────────────────────────────►
     │                              │
     │                              ├─ Find store from auth
     │                              │
     │                              ├─ Return { storeId, name }
     │◄─────────────────────────────┤
     │
     ├─ Get storeId = "store123"
     │
     ├─ Fetch coupons for modal
     │  GET /api/coupons?storeId=store123
     │  ────────────────────────────►
     │                              │
     │                              ├─ Query Coupons
     │                              │  where storeId = "store123"
     │                              │  and isActive = true
     │                              │
     │                              ├─ For each coupon:
     │                              │  - Check if expired
     │                              │  - Check if exhausted
     │                              │  - Add metadata
     │                              │
     │                              ├─ Return coupons array
     │◄─────────────────────────────┤
     │
     ├─ availableCoupons = [...]
     │
     ├─ Display modal with real-time eligibility checking
     │  (frontend calculates if each coupon is applicable)
     │
     │ Customer clicks SAVE10
     │
     ├─ Customer clicks Apply button
     │  POST /api/coupons
     │  {
     │    code: "SAVE10",
     │    storeId: "store123",
     │    orderTotal: 51500,
     │    cartProductIds: ["laptop_id", "mouse_id"]
     │  }
     │  ────────────────────────────►
     │                              │
     │                              ├─ Query coupon by code + storeId
     │                              │
     │                              ├─ Validate:
     │                              │  ✓ Exists
     │                              │  ✓ Not expired
     │                              │  ✓ Not exhausted
     │                              │  ✓ Min order met
     │                              │  ✓ User hasn't exceeded limit
     │                              │  ✓ Products match (if specific)
     │                              │
     │                              ├─ Calculate discount
     │                              │
     │                              ├─ Return {
     │                              │    valid: true,
     │                              │    coupon: {
     │                              │      code: "SAVE10",
     │                              │      discountAmount: 5150
     │                              │    }
     │                              │  }
     │◄─────────────────────────────┤
     │
     ├─ appliedCoupon = {...}
     ├─ couponDiscount = 5150
     │
     ├─ Update order summary
     │  Show: Discount: -₹5,150
     │
     └─ Customer clicks "Place Order"
        └─ Order created with coupon details
           └─ Coupon usedCount incremented
```

---

## Admin Workflow

```
Admin accesses /store/manage-coupons
      │
      ▼
┌───────────────────────────────────────────┐
│  ADMIN COUPON MANAGEMENT PAGE             │
├───────────────────────────────────────────┤
│                                           │
│  Existing Coupons:                        │
│  ┌─────────────────────────────────────┐ │
│  │ SAVE10 | 10% Off    │ Active │ 5/100 │ │
│  │ [Edit] [Delete]                     │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ TECH20 | 20% Off    │ Inactive│ 0/50 │ │
│  │ [Edit] [Delete]                     │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  [+ Add New Coupon]                      │
└───────────────────────────────────────────┘
      │
      │ Clicks [+ Add New Coupon]
      ▼
┌─────────────────────────────────────────────────────┐
│  CREATE NEW COUPON                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Code: [TEST10...................]                  │
│  Title: [Get 10% Off!.............]  (auto-filled)  │
│  Description: [Save on all products!........]       │
│                                                     │
│  Discount Type: ⊙ Percentage ○ Fixed Amount        │
│  Discount Value: [10]%                              │
│  Max Discount (Cap): [1000]₹                        │
│                                                     │
│  Min Order Value: [500]₹                            │
│  Max Uses (Total): [100]                            │
│  Max Uses Per User: [5]                             │
│                                                     │
│  Expires: [DD/MM/YYYY.......] (optional)           │
│  Badge Color: [Green▼]                              │
│                                                     │
│  Specific Products: [Select Products▼]             │
│  ┌────────────────────────────────────┐            │
│  │ ✓ Laptop Model X                   │            │
│  │ ✓ Wireless Mouse                   │            │
│  │ ☐ USB Cable                        │            │
│  │ ☐ Keyboard                         │            │
│  └────────────────────────────────────┘            │
│                                                     │
│  Active: ☑ (checkbox)                              │
│                                                     │
│  [Create Coupon] [Cancel]                          │
└─────────────────────────────────────────────────────┘
      │
      │ Submits form
      ▼
POST /api/store/coupons
(with all fields)
      │
      ▼
Backend validates & saves to MongoDB
      │
      ▼
✅ Coupon created successfully
   - Shows in modal immediately
   - Admin can edit/delete/toggle
```

---

## Error Handling Tree

```
User tries to apply coupon
      │
      ▼
┌─────────────────────────────┐
│ Does coupon exist?          │
├─────┬───────────────────────┤
│ NO  │ Error: "Invalid       │
│     │ coupon code"          │
└─────┴───────────────────────┘
      │ YES
      ▼
┌─────────────────────────────┐
│ Is it for this store?       │
├─────┬───────────────────────┤
│ NO  │ Error: "Invalid       │
│     │ coupon code"          │
└─────┴───────────────────────┘
      │ YES
      ▼
┌─────────────────────────────┐
│ Is it expired?              │
├─────┬───────────────────────┤
│ YES │ Error: "Coupon        │
│     │ has expired"          │
└─────┴───────────────────────┘
      │ NO
      ▼
┌─────────────────────────────┐
│ Has it hit max uses?        │
├─────┬───────────────────────┤
│ YES │ Error: "Coupon        │
│     │ usage limit reached"  │
└─────┴───────────────────────┘
      │ NO
      ▼
┌─────────────────────────────┐
│ Is min order met?           │
├─────┬───────────────────────┤
│ NO  │ Error: "Minimum       │
│     │ order value of ₹X     │
│     │ required"             │
└─────┴───────────────────────┘
      │ YES
      ▼
┌─────────────────────────────┐
│ Is user within per-user     │
│ usage limit?                │
├─────┬───────────────────────┤
│ NO  │ Error: "You have      │
│     │ already used this     │
│     │ coupon"               │
└─────┴───────────────────────┘
      │ YES
      ▼
┌─────────────────────────────┐
│ Do products match?          │
├─────┬───────────────────────┤
│ NO  │ Error: "This coupon   │
│     │ is not applicable for │
│     │ the products in your  │
│     │ cart"                 │
└─────┴───────────────────────┘
      │ YES
      ▼
✅ VALID - Apply discount
   └─ Increment usedCount
   └─ Calculate discount amount
   └─ Show in order summary
```

---

## State Management Summary

```
Component: CheckoutPageUI.jsx
───────────────────────────────

State Variables:
├─ coupon: string              (user's input code)
├─ appliedCoupon: object       (validated coupon details)
├─ couponDiscount: number      (calculated discount amount)
├─ couponError: string         (error message)
├─ couponLoading: boolean      (API call in progress)
├─ availableCoupons: array     (all fetched coupons)
├─ showCouponModal: boolean    (modal visibility)
├─ storeId: string             (current store ID)
└─ ...other state...

Functions:
├─ handleApplyCoupon()         (user clicks Apply button)
│  └─ Calls POST /api/coupons
│  └─ Updates appliedCoupon state
│  └─ Calculates total with discount
│
└─ fetchCoupons()              (modal opens)
   └─ Calls GET /api/coupons?storeId=...
   └─ Stores in availableCoupons
   └─ Frontend checks eligibility in JSX

Effects:
├─ useEffect(() => {           (component mounts)
│   fetchStoreInfo()
│   fetchCoupons()
│ }, [])
│
└─ When appliedCoupon changes:
   └─ Recalculate total in order summary
```

This visualization shows the complete coupon system architecture!
