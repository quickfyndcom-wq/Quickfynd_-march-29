# Guest Checkout - Quick Reference & Troubleshooting

## Feature Quick Reference

### What Guests Can Do
- ✅ Place order **without creating account**
- ✅ Receive confirmation & account invitation emails  
- ✅ Sign in later with same email
- ✅ See all previous orders automatically
- ✅ Track, return, and manage all orders

### What Users Get After Linking
- ✅ Order History (guest + new)
- ✅ Real-time Tracking
- ✅ Return/Replacement Requests
- ✅ Saved Addresses
- ✅ Reward Points
- ✅ Account Dashboard

## Implementation Checklist

- [x] Guest checkout form (already exists)
- [x] Order creation API (enhanced)
- [x] Guest email function (added)
- [x] Account creation email (added)
- [x] Link orders endpoint (exists)
- [x] GuestOrderLinker component (fixed)
- [x] GuestUser model (updated)
- [x] Order retrieval (works automatically)

## Code Changes Summary

```
Files Modified: 4
Files Created: 3

Modified:
  1. lib/email.js (+110 lines)
  2. app/api/orders/route.js (+20 lines)
  3. components/GuestOrderLinker.jsx (+40 lines)
  4. models/GuestUser.js (+4 lines)

Created (Documentation):
  1. GUEST_CHECKOUT_ACCOUNT_LINKING.md
  2. GUEST_CHECKOUT_IMPLEMENTATION_SUMMARY.md
  3. GUEST_CHECKOUT_VISUAL_GUIDE.md
```

## Testing Steps

### Test 1: Guest Places Order
```
1. Open site (not logged in)
2. Add items to cart
3. Go to checkout
4. Select "Continue as Guest"
5. Fill all fields: Name, Email, Phone, Address
6. Place order
7. ✅ Check email for 2 emails (confirmation + invite)
```

**Expected Results:**
- Order created with `isGuest: true`
- `guestEmail` populated
- GuestUser record created
- 2 emails received

### Test 2: Guest Signs In
```
1. Stay on order-success page OR
2. Navigate to /sign-in
3. Click "Create Account" OR "Sign In"
4. Use same email from guest order
5. Set password
6. Create account
7. 🔍 Watch console for linking logs
```

**Expected Results:**
- Page redirects to dashboard
- Toast shows: "We linked X order(s)"
- GuestOrderLinker logs appear in console
- GuestUser marked as converted

### Test 3: View Orders
```
1. After sign-in, go to /orders
2. Look for previous guest order
3. Click order to view details
4. Check: tracking, address, items
5. Try to return an item
```

**Expected Results:**
- Guest order visible
- Order details load
- Can create return request
- All features available

## Troubleshooting

### Issue: Toast Not Showing After Sign-In
**Possible Causes:**
1. GuestOrderLinker not running
2. No matching guest orders found
3. Email mismatch between guest order and sign-in

**Solutions:**
```javascript
// Check browser console:
// Should see: "Linking guest orders for: email@..."
// Should see: "Guest orders linked: X"

// If nothing logs:
// 1. Verify GuestOrderLinker is in layout
// 2. Check /app/(public)/layout.jsx imports GuestOrderLinker
// 3. Clear cache and refresh
// 4. Check Network tab for /api/user/link-guest-orders call
```

### Issue: Orders Not Showing After Sign-In
**Possible Causes:**
1. Orders not linked (isGuest still true)
2. userId not set on order
3. User ID mismatch

**Solutions:**
```javascript
// Check database:
// For guest order, verify:
db.orders.findOne({guestEmail: "email@..."})

// Should show:
{
  ...
  isGuest: false,        // ✅ Should be false
  guestEmail: "email...", // ✅ Should have guest email
  userId: "firebase_uid", // ✅ Should have user ID
  ...
}

// If isGuest still true or userId missing:
// Manual fix:
db.orders.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {
      isGuest: false,
      userId: "correct_firebase_uid"
    }
  }
)
```

### Issue: Email Not Sending
**Check Environment:**
```bash
# Verify in .env:
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SENDGRID_API_KEY=... (or similar)
```

**Check Code:**
```javascript
// lib/email.js - sendMail() function
// Verify it's called with correct params:
// {
//   to: email,
//   subject: string,
//   html: string
// }

// Check server logs for errors like:
// "Error sending guest account creation email"
```

**Check Gmail/EmailService:**
- Verify API key is valid
- Check email credentials
- Verify sender address is whitelisted
- Check spam folder

### Issue: GuestOrderLinker Causing Errors
**Check Console Errors:**
```javascript
// If seeing: "Cannot read property 'email' of null"
// → user loading takes too long

// Solution: Increase delay in GuestOrderLinker:
const timer = setTimeout(linkGuestOrders, 2500) // was 1500

// If seeing: "Unauthorized" errors
// → Token not being retrieved

// Solution: Verify useAuth hook works:
const { user, loading, getToken } = useAuth()
console.log('User:', user, 'Loading:', loading)
```

## Performance Notes

- GuestOrderLinker runs ~1.5 seconds after sign-in
- Doesn't block page load or user interaction
- Runs in background with fallback on error
- Email sending is async (doesn't slow order creation)

## Security Considerations

✅ **What's Protected:**
- Token verification in link-guest-orders endpoint
- Email matching (only guest orders with matching email)
- User ID validation before linking

⚠️ **User Privacy:**
- Guest email visible in order
- GuestUser records tied to email
- Orders visible after sign-in (as expected)

## Database Queries Reference

```javascript
// Find guest orders for an email
db.orders.find({
  isGuest: true,
  guestEmail: "user@email.com"
})

// Find converted guest users
db.guestusers.find({
  accountCreated: true,
  convertedUserId: {$exists: true}
})

// Count uncovered guests
db.guestusers.countDocuments({
  accountCreated: false,
  createdAt: {$lt: new Date(Date.now() - 30*24*60*60*1000)}
})

// Check if user has linked orders
db.orders.countDocuments({
  userId: "firebase_uid",
  isGuest: false,
  guestEmail: {$exists: true}
})
```

## Monitoring & Analytics

**Events to Track:**
- Guest orders created
- Account creation invites sent
- Accounts created from guest email
- Orders successfully linked
- Conversion rate (guests → accounts)

**Metrics to Monitor:**
```javascript
// KPI: Conversion Rate
linked_accounts / total_guest_orders = %

// KPI: Email Performance
(emails_delivered / emails_sent) * 100 = %
(accounts_created / emails_sent) * 100 = %

// KPI: Order Linking Rate
(orders_linked / guest_accounts_created) * 100 = %
```

## FAQ

**Q: What if guest uses different email to sign up?**
A: Orders won't link. They can manually request linking or use the original email.

**Q: Can guest see their order before sign-in?**
A: Only if they have the order ID. Can view via /order-success page with order ID.

**Q: What about order notifications to guest email?**
A: Continue sending to guestEmail (email exists in Order record).

**Q: How long does order linking take?**  
A: Instant when user signs in (within 2-3 seconds page load).

**Q: Can guest orders be returned?**
A: Yes, after linking to account. Returns work normally.

**Q: What if guest never creates account?**
A: Guest orders stay linked to guest email. Can be cleaned up after 90 days.

## Related Documentation

- [Guest Checkout Account Linking](./GUEST_CHECKOUT_ACCOUNT_LINKING.md)
- [Implementation Summary](./GUEST_CHECKOUT_IMPLEMENTATION_SUMMARY.md)  
- [Visual Guide](./GUEST_CHECKOUT_VISUAL_GUIDE.md)
- [Order Flow Docs](./PAYMENT_SETTLEMENT_COMPLETE.md)
- [Email Documentation](./EMAIL_NOTIFICATIONS.md)
