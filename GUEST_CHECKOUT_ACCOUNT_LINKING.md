# Guest Checkout with Auto Account Creation & Order Linking

## Overview
This feature allows guests to place orders without creating an account first. When they sign in later with the same email, their previous guest orders are automatically linked to their new account, allowing them to track orders and manage their account seamlessly.

## How It Works

### 1. **Guest Checkout Flow**
When a guest places an order:

```
Guest Checkout
    ↓
Guest fills: Name, Email, Phone, Address
    ↓
Place Order as Guest
    ↓
Order Created (isGuest: true)
    ↓
GuestUser Record Created
    ↓
Order Confirmation Email Sent
    ↓
Guest Account Creation Email Sent (invitation to sign up)
```

**What Gets Stored:**
- `Order` with `isGuest: true` and `guestEmail`
- `GuestUser` record with `email` and `convertToken`
- Guest order details in `shippingAddress` field

### 2. **Guest Signs In**
When a guest later signs in with their email:

```
Guest Signs In with Email
    ↓
Firebase Auth Creates Account
    ↓
App Loads → GuestOrderLinker Component Runs
    ↓
Calls /api/user/link-guest-orders endpoint
    ↓
Finds All Orders with guestEmail
    ↓
Updates Orders: userId = new_user_id, isGuest = false
    ↓
Marks GuestUser as Converted
    ↓
Toast Success: "We've linked X previous order(s)"
    ↓
Orders Now Visible in User Dashboard
```

### 3. **View Orders**
User can now see all their previous guest orders and new orders in their account:

```
/app/dashboard/orders
    ↓
Fetches: WHERE userId = current_user_id
    ↓
Shows All Orders (previous guest + new purchases)
```

## Technical Implementation

### Modified Files

#### 1. **lib/email.js** - Added New Function
```javascript
export async function sendGuestAccountCreationEmail(guestData)
```
- Sends invitation email to guest after order placement
- Includes link to sign in/create account
- Shows benefits of creating account

#### 2. **app/api/orders/route.js** - Enhanced
- Imports `sendGuestAccountCreationEmail`
- Sends guest account creation email after order confirmation
- Already creates GuestUser record on guest order placement

#### 3. **components/GuestOrderLinker.jsx** - Updated
- Now properly uses `useAuth()` hook
- Calls `/api/user/link-guest-orders` on sign-in
- Shows toast notification when orders are linked
- Runs automatically in background

#### 4. **models/GuestUser.js** - Enhanced
Added fields:
- `convertedUserId`: The Firebase UID when guest converts to real account
- `convertedAt`: Timestamp of conversion
- Added index on email field for faster lookups

#### 5. **app/api/user/link-guest-orders/route.js** - Already Exists
- Verifies user's Firebase token
- Finds all guest orders by email
- Updates orders to link to user account
- Marks guest conversion in GuestUser model

### Email Flow

**Order Confirmation Email:**
- Sent immediately after order (existing)
- Order details, tracking info
- Payment method confirmation

**Guest Account Creation Email:**
- Sent after order confirmation (new)
- Invites guest to create account with that email
- Shows benefits: track orders, save addresses, earn rewards
- Links to sign-in page

**After Linking:**
- Welcome notification in toast
- No additional emails needed
- Orders automatically appear on dashboard

## User Experience

### Before (Guest Checkout Only)
```
Guest places order → Gets confirmation email → Cannot check order status later
```

### After (With This Feature)
```
Guest places order 
  → Gets confirmation + account creation invitation email
  → Signs in with email
  → Toast: "We linked 1 previous order to your account"
  → Sees order in dashboard
  → Can now: track, return, save addresses, earn rewards
```

## API Endpoints

### POST /api/orders (Existing - Enhanced)
- Detects guest order
- Creates GuestUser record
- Sends confirmation + account creation emails
- Returns order details with email

### POST /api/user/link-guest-orders (Existing)
- **Authentication:** Required (Bearer token)
- **Request:** `{ email?, phone? }`
- **Response:** `{ linked: boolean, count: number, message: string }`
- Links all guest orders to authenticated user

### GET /api/orders (Existing - No changes needed)
- Returns orders for authenticated user
- Includes linked guest orders

## Database Changes

### GuestUser Model
```javascript
{
  name: String,
  email: String (unique, indexed),
  phone: String,
  convertToken: String,
  tokenExpiry: Date,
  accountCreated: Boolean,
  convertedUserId: String,    // NEW: Firebase UID when converted
  convertedAt: Date,           // NEW: When conversion happened
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model (No Changes Needed)
Already has:
- `isGuest: Boolean`
- `guestEmail: String`
- `guestName: String`
- `guestPhone: String`
- `userId: String` (set when linked)

## Testing Checklist

- [ ] Guest can place order without sign-in
- [ ] Guest receives order confirmation email
- [ ] Guest receives account creation invitation email
- [ ] Guest can sign up with that email
- [ ] GuestOrderLinker component runs on sign-in
- [ ] Toast shows "linked X orders" message
- [ ] Previous guest order appears on dashboard
- [ ] Order status can be tracked
- [ ] Both old guest orders and new logged-in orders appear together
- [ ] Can create returns/replacements for guest orders

## Configuration Required

Ensure `.env` has:
```
NEXT_PUBLIC_APP_URL=https://yoursite.com  (for email links)
FIREBASE_SERVICE_ACCOUNT_KEY              (existing)
FIREBASE_PROJECT_ID                       (existing)
```

## Future Enhancements

1. **Manual Account Linking:** Add UI for guests to link using order number + email
2. **Password Reset:** Allow guest to set password via email link
3. **Social Sign-In:** Auto-link via social providers
4. **Verification:** Send verification code to guest email before linking
5. **Batch Process:** Periodic cleanup of unconverted guests after 30 days

## Troubleshooting

### Orders Not Showing After Sign-In
1. Check GuestOrderLinker console logs
2. Verify email matches exactly (case-sensitive in some places)
3. Check `/api/user/link-guest-orders` response
4. Ensure Firebase token is valid

### Email Not Sending
1. Check email.js sendMail() function
2. Verify email service credentials
3. Check server logs for sendGuestAccountCreationEmail errors
4. Verify NEXT_PUBLIC_APP_URL is set

### Duplicate Orders
1. Check if order has both userId and isGuest: true
2. Use data cleanup script to fix
3. Run: `db.orders.updateMany({isGuest: true}, {$set:{isGuest:false}})`

## Related Files
- [app/api/orders/route.js](../api/orders/route.js)
- [app/api/user/link-guest-orders/route.js](../user/link-guest-orders/route.js)
- [components/GuestOrderLinker.jsx](../../../components/GuestOrderLinker.jsx)
- [lib/email.js](../../../lib/email.js)
- [models/GuestUser.js](../../../models/GuestUser.js)
- [models/Order.js](../../../models/Order.js)
