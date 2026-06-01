# Guest Checkout Flow - Visual Guide

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUEST CHECKOUT FLOW                           │
└─────────────────────────────────────────────────────────────────┘

STEP 1: GUEST PLACES ORDER
┌─────────────────────────────────────┐
│  Guest at Checkout (Not Signed In)  │
│                                     │
│  ✓ "Continue as Guest" selected    │
│  ✓ Fill Name, Email, Phone         │
│  ✓ Enter Address & City            │
│  ✓ Choose Payment Method (COD)     │
│  ✓ Click "Place Order"             │
└─────────────────────────────────────┘
              ↓ POST /api/orders
              │
              ├─ isGuest: true
              ├─ guestEmail: user@email.com
              ├─ guestName: User Name
              ├─ guestPhone: +91XXXXXXXXXX
              └─ shippingAddress: {...}
              
              ↓
┌─────────────────────────────────────┐
│    SERVER-SIDE PROCESSING           │
│                                     │
│  1. Validate guest info             │
│  2. Create Order (isGuest: true)   │
│  3. Create/Update GuestUser         │
│  4. Reduce inventory                │
│  5. Send confirmation email         │
│  6. Send account-creation email ✨ │
│  7. Return success                  │
└─────────────────────────────────────┘
              ↓
          EMAIL 1: Order Confirmation
          ┌──────────────────────────┐
          │ Order Details & Tracking │
          └──────────────────────────┘
          
          EMAIL 2: Account Creation Invite ✨
          ┌────────────────────────────────┐
          │ "Create Account with this Email"│
          │ Benefits & Sign-In Link         │
          │ [Create Account] Button         │
          └────────────────────────────────┘
              ↓
        User views emails
        ✓ Confirms order
        ✓ Sees account invitation


STEP 2: GUEST SIGNS IN (Days/Weeks Later)
┌─────────────────────────────────────┐
│    Guest Returns to Website         │
│                                     │
│  Clicks: Sign In / Create Account   │
│  Enters: Email (same as order)      │
│  Sets: Password (or Google/etc)     │
│  Creates: Account                   │
└─────────────────────────────────────┘
              ↓
    Firebase Auth creates user
              ↓
         Page Redirects
              ↓
┌─────────────────────────────────────┐
│    APP LAYOUT LOADS                 │
│    ↓                                │
│    GuestOrderLinker Component       │
│    Detects: user logged in          │
│    Calls: /api/user/link-guest-orders
│    Sends: { email: "user@email" }  │
│    with: Authorization Bearer token │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    SERVER: LINK GUEST ORDERS        │
│                                     │
│  1. Verify token                    │
│  2. Get userId from token           │
│  3. Find all guest orders:          │
│     WHERE guestEmail = user@email  │
│     AND isGuest = true             │
│  4. UPDATE Orders:                  │
│     SET userId = decoded_uid        │
│     SET isGuest = false             │
│  5. Mark GuestUser converted        │
│  6. Return count                    │
└─────────────────────────────────────┘
              ↓
        Response: { 
          linked: true,
          count: 2,  // e.g., 2 orders linked
          message: "Linked 2 orders"
        }
              ↓
    GuestOrderLinker shows:
    Toast Success: "We linked 2 
                   previous order(s)
                   to your account!" ✅


STEP 3: GUEST (NOW USER) VIEWS ORDERS
┌─────────────────────────────────────┐
│    User Dashboard Loads             │
│                                     │
│    Sees: Orders Page                │
│    Shows: Previous guest orders ✅  │
│           New purchases             │
│           Order Tracking            │
│           Return Options            │
└─────────────────────────────────────┘
              ↓
    Can Now:
    ✓ Track all orders real-time
    ✓ Create returns/replacements
    ✓ Save addresses for next purchase
    ✓ Earn and use reward points
    ✓ View invoice/receipt
    ✓ Manage account settings


═════════════════════════════════════════════════════════════════

DATABASE CHANGES DURING FLOW

Order Collection:
┌────────────────────────┐        ┌────────────────────────┐
│ ORDER (Guest Placed)   │   →    │ ORDER (After Sign-In)  │
├────────────────────────┤        ├────────────────────────┤
│ _id: ObjectID          │        │ _id: ObjectID          │
│ isGuest: true          │        │ isGuest: false      ✨ │
│ guestEmail: email.com  │        │ guestEmail: email.com  │
│ guestName: John        │        │ guestName: John        │
│ userId: null           │        │ userId: firebase_uid✨ │
│ items: [...]           │        │ items: [...]           │
│ status: ORDER_PLACED   │        │ status: ORDER_PLACED   │
└────────────────────────┘        └────────────────────────┘

GuestUser Collection:
┌────────────────────────┐        ┌────────────────────────┐
│ GUESTUSER (Created)    │   →    │ GUESTUSER (Converted)  │
├────────────────────────┤        ├────────────────────────┤
│ email: email.com       │        │ email: email.com       │
│ name: John             │        │ name: John             │
│ phone: +91XXXX         │        │ phone: +91XXXX         │
│ convertToken: xyz      │        │ convertToken: xyz      │
│ accountCreated: false  │        │ accountCreated: true✨ │
│ convertedUserId: null  │        │ convertedUserId: uid✨ │
│ convertedAt: null      │        │ convertedAt: 2024...✨ │
└────────────────────────┘        └────────────────────────┘

User Collection:
                               ┌────────────────────────┐
                               │ USER (Created by Auth) │
                               ├────────────────────────┤
                               │ _id: firebase_uid      │
                               │ email: email.com       │
                               │ name: (optional)       │
                               │ image: null            │
                               │ cart: {}               │
                               │ emailPreferences: ...  │
                               └────────────────────────┘


═════════════════════════════════════════════════════════════════

KEY FILES INVOLVED

1. app/api/orders/route.js
   ├─ Receives guest order POST
   ├─ Createes Order with isGuest:true
   ├─ Creates GuestUser record
   ├─ Calls sendOrderConfirmationEmail()
   └─ 🆕 Calls sendGuestAccountCreationEmail() ✨

2. lib/email.js
   ├─ sendOrderConfirmationEmail() [existing]
   └─ 🆕 sendGuestAccountCreationEmail() ✨
       ├─ Subject: "Complete Your Account"
       ├─ Shows order number
       ├─ Lists account benefits
       ├─ Has sign-in link
       └─ Styled HTML template

3. components/GuestOrderLinker.jsx
   └─ 🆕 Full implementation ✨
       ├─ Imports useAuth hook
       ├─ Detects sign-in
       ├─ Calls /api/user/link-guest-orders
       ├─ Shows success toast
       └─ No additional UI

4. app/api/user/link-guest-orders/route.js
   ├─ Verifies user token
   ├─ Finds guest orders by email
   ├─ Links to user account
   └─ Returns linked count

5. models/GuestUser.js
   └─ 🆕 Enhanced with:
       ├─ convertedUserId field
       ├─ convertedAt timestamp
       └─ email index


═════════════════════════════════════════════════════════════════

EMAIL TIMELINE

Time 0:00 - Guest Places Order
   ↓
Time 0:30 - Email 1: Order Confirmation
   └─ Subject: "Order Confirmation - #12AB34"
   └─ Contains: Items, address, tracking info

Time 0:31 - Email 2: Account Creation Invite (NEW) ✨
   └─ Subject: "Complete Your Account - Order #12AB34"
   └─ Contains: Benefits, sign-in link
   └─ Sent only to guest orders

Time > 1 hour - Guest Receives Emails
   ├─ Reviews order details
   └─ Clicks "Create Account" button

Time > 1 day - Guest Signs In
   └─ GuestOrderLinker automatically runs
   └─ Orders are linked seamlessly


═════════════════════════════════════════════════════════════════

LOGIC FLOW - SIMPLIFIED

Guest Order Placement:
  Order.create({isGuest: true, guestEmail}) 
  → GuestUser.create({email}) 
  → sendOrderConfirmationEmail() 
  → sendGuestAccountCreationEmail() ✨

Guest Sign-In:
  Firebase.auth().signIn(email, password)
  → Page loads
  → GuestOrderLinker detects user
  → POST /api/user/link-guest-orders
  → Find Order.find({guestEmail: email, isGuest: true})
  → Update Order.updateMany({userId, isGuest: false})
  → Toast: "Linked X orders"

View Orders (Linked):
  GET /api/orders?userId=user_id
  → Returns all orders (including previous guest orders)
  → Dashboard displays all together

═════════════════════════════════════════════════════════════════
