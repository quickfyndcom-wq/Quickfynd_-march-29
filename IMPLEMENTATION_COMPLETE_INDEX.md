# Complete Implementation Index — Mobile Account Linking & Backend Integration

**Last Updated:** April 30, 2026

---

## For App Developers

### Quick Start

[MOBILE_APP_DEVELOPER_QUICKSTART.md](MOBILE_APP_DEVELOPER_QUICKSTART.md) — **Start here**

- Firebase sign-in (Google + Phone OTP)
- All required headers for APP source detection
- Exact request/response shapes (COD, Razorpay, order history, tracking)
- API call sequence for new user flow (2-3 pages, cheatsheet format)

### Comprehensive Reference

[MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md](MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md)

- Detailed auth flows (email/password, Google sign-in, token refresh)
- Profile fetch and update
- Order history with automatic guest-order linking
- Tracking fields and status codes
- Integration sequence and QA checklist

### Order Tracking & Account Features

[MOBILE_ORDER_HISTORY_TRACKING_ACCOUNT_GUIDE.md](MOBILE_ORDER_HISTORY_TRACKING_ACCOUNT_GUIDE.md)

- COD and prepaid order creation
- APP source markers and troubleshooting
- Guest checkout and auto-linking
- Courier tracking (Delhivery + India Post)
- Profile updates and address management

### API Handoff

[MOBILE_API_HANDOFF.md](MOBILE_API_HANDOFF.md)

- Raw API signatures and field mappings
- Cross-references to all other guides

### Order Now and Details

[ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md](ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md)

- End-to-end Order Now payloads for guest and logged-in users
- Order Details by orderId response used on success/details screen
- My Orders list endpoint with auth and pagination
- Common errors and troubleshooting for failed order placement

### Wallet, Coupon, and Offers in Checkout

[CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md](CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md)

- Wallet redemption, welcome bonus, and wallet-only checkout behavior
- Coupon listing and validation APIs with card-only coupon rule in checkout
- Personalized offer token pricing and COD restriction rules
- Additional checkout features: pincode auto-fill, shipping logic, guest flow, prepaid upsell

---

## For Backend Developers

### Deployment & Operations

[BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md](BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md) — **Read this first**

- What changed in code and data model
- Pre-deployment checklist
- Step-by-step deployment: code → dry-run migration → apply migration
- API testing (curl examples for all scenarios)
- End-to-end flow walkthrough (mobile app → backend)
- Monitoring, alerts, troubleshooting, rollback plan

### Architecture & Quickfynd Specifics

[BACKEND_QUICK_REFERENCE.md](BACKEND_QUICK_REFERENCE.md)

- Overall system architecture
- Service endpoints
- Database models
- Environment setup

### Features & Order Management

[COD_TO_PREPAID_CONVERSION_5PERCENT_DISCOUNT.md](COD_TO_PREPAID_CONVERSION_5PERCENT_DISCOUNT.md)

- Feature: Allow customers to convert pending COD orders to online payment with 5% discount
- API endpoints for eligibility check and conversion initiation
- Frontend implementation (mobile + web)
- Backend code changes and migration steps
- QA testing checklist and monitoring

---

## What's New This Session (April 30, 2026)

### User Model Changes

✅ Primary key: Firebase UID (`_id`)  
✅ New fields: `emailVerifiedAt`, `phoneVerifiedAt`  
✅ Email normalization: trim + lowercase  
✅ Phone normalization: E.164 format (e.g., `+919526473883`)  
✅ Partial unique indexes: allow multiple null values, enforce unique non-empty

### New / Updated Endpoints

✅ `GET/PATCH /api/profile` — Uid-first, normalization, conflict checks  
✅ `GET /api/user/profile` — Compatibility alias  
✅ `POST /api/user/link-identities` — Guest order merge with counts  
✅ `POST /api/store/profile/update` — Hardened to uid-based lookup  
✅ `GET /api/orders/:id/cod-conversion-status` — Check if COD order can be converted  
✅ `POST /api/orders/:id/convert-to-prepaid` — Initiate COD-to-Razorpay conversion with 5% discount

### Automation

✅ `scripts/migrateUserIdentityIndexes.js` — Safe index migration (dry-run first, --apply mode)  
✅ `npm run migrate:user-identity-indexes` — Dry-run  
✅ `npm run migrate:user-identity-indexes:apply` — Apply changes

### Error Contract

✅ 401 UNAUTHORIZED (invalid/expired token)  
✅ 409 EMAIL_ALREADY_IN_USE / PHONE_ALREADY_IN_USE  
✅ 422 INVALID_PHONE (malformed)  
✅ Machine-readable error codes (not just strings)

### New Features

✅ **COD-to-Prepaid Conversion:** Customers can convert pending COD orders to online payment within 24 hours with 5% discount automatically applied to wallet/refund

---

## Tested Behaviors

| Scenario                           | Expected                                | Status |
| ---------------------------------- | --------------------------------------- | ------ |
| Google sign-in → profile fetch     | Email verified, phone null              | ✅     |
| Phone OTP sign-in → profile fetch  | Phone verified, email null              | ✅     |
| Profile PATCH with duplicate email | 409 EMAIL_ALREADY_IN_USE                | ✅     |
| Profile PATCH with duplicate phone | 409 PHONE_ALREADY_IN_USE                | ✅     |
| Profile PATCH with invalid phone   | 422 INVALID_PHONE                       | ✅     |
| Link-identities with guest orders  | Returns mergedGuestOrders count         | ✅     |
| Email case handling                | `John@Example.COM` = `john@example.com` | ✅     |
| Multiple users with email=null     | Allowed (partial unique index)          | ✅     |

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and linted (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Staging database cloned from production
- [ ] `.env` has MONGODB_URI and Firebase credentials
- [ ] Node.js ≥18 available for scripts

### Deployment

- [ ] Push code to main branch
- [ ] Restart app server (Next.js)
- [ ] Run dry-run migration: `node scripts/migrateUserIdentityIndexes.js`
- [ ] Review dry-run output for duplicate identities
- [ ] If clean, apply migration: `node scripts/migrateUserIdentityIndexes.js --apply`
- [ ] Monitor MongoDB index creation progress
- [ ] Verify with staging API tests (see BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md)

### Post-Deployment

- [ ] Smoke test: Google sign-in → profile fetch
- [ ] Smoke test: Phone OTP → profile fetch
- [ ] Check audit logs for link-identities calls
- [ ] Monitor error rate for EMAIL_ALREADY_IN_USE (should be ~0%)
- [ ] Verify profile API latency stays <100ms

---

## Key Files Reference

**Backend Implementation:**

- [models/User.js](models/User.js) — User schema with partial unique indexes
- [app/api/profile/route.js](app/api/profile/route.js) — Main profile GET/PATCH
- [app/api/user/link-identities/route.js](app/api/user/link-identities/route.js) — Identity linking
- [scripts/migrateUserIdentityIndexes.js](scripts/migrateUserIdentityIndexes.js) — Index migration

**Frontend / Integration:**

- [MOBILE_APP_DEVELOPER_QUICKSTART.md](MOBILE_APP_DEVELOPER_QUICKSTART.md) — Quickstart
- [MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md](MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md) — Full reference

**Operations:**

- [BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md](BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md) — Deployment guide
- [package.json](package.json) — Migration npm scripts

---

## Common Questions

**Q: Why uid-first instead of email-first?**  
A: Firebase Auth already assigns each user a unique uid. This is immutable and canonical. Using uid prevents accidental duplicates when users sign in via different methods (Google vs phone OTP) with the same email.

**Q: What happens to old guest orders?**  
A: They remain in the Order collection with `isGuest: true` until the user calls `/api/user/link-identities`. At that point, orders are re-assigned to the user's uid and marked `isGuest: false`. They then appear in order history.

**Q: Can a user have no email or phone?**  
A: Yes. The schema allows both to be null or empty string. Partial unique indexes only enforce uniqueness on non-empty values. A user with phone-only sign-in can have `email: null`.

**Q: What if two users claim the same email?**  
A: The first wins (profile PATCH updates the record). The second gets a 409 CONFLICT response. They must use a different email or clear the field on the first user.

**Q: How do I verify the migration succeeded?**  
A: Check MongoDB:

```javascript
db.users.getIndexes(); // Should show email and phone partial unique indexes
db.users.find({ email: /^test@example\.com$/i }); // Should find 0 or 1 user, never >1
```

---

## Support Contacts

- **Backend questions:** See BACKEND_ACCOUNT_LINKING_DEPLOYMENT.md → "Support & QA"
- **Mobile integration:** See MOBILE_APP_DEVELOPER_QUICKSTART.md → "Common Errors"
- **Database troubleshooting:** See repo admin or DevOps

---

## Version History

| Date       | Change                                                                       | Files                                                     |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 2026-04-30 | COD-to-Prepaid conversion with 5% discount                                   | COD_TO_PREPAID_CONVERSION_5PERCENT_DISCOUNT.md            |
| 2026-04-30 | Account linking implementation (uid-first, partial unique, migration script) | User.js, profile route, link-identities, migration script |
| 2026-04-30 | Mobile API docs (auth, profile, order history, tracking)                     | MOBILE_APP_DEVELOPER_QUICKSTART, comprehensive guide      |
| 2026-04-29 | Pincode auto-fill, order source hardening, guest linking                     | CheckoutPageUI, order routes                              |
| 2026-04-28 | India Post 17track integration                                               | lib/seventeentrack.js, track-order endpoint               |
