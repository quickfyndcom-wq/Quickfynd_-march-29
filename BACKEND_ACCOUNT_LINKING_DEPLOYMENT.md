# Backend Developer — Account Linking & Identity Implementation Guide

**Date:** April 30, 2026  
**Status:** Production-Ready

---

## Overview

Your backend now enforces uid-first account linking with conflict-safe identity (email/phone) persistence. This guide walks your backend team through deployment, testing, and operational expectations.

---

## What Changed

### 1. User Model (`models/User.js`)

- **Primary key:** `_id` = Firebase UID (string)
- **New fields:** `emailVerifiedAt`, `phoneVerifiedAt` (timestamps)
- **Normalization:** Email stored lowercased; phone stored E.164 (e.g., `+919526473883`)
- **Indexes:** Partial unique on non-empty email and phone (prevents duplicates; allows multiple null)

### 2. Profile Endpoint (`/api/profile`)

- **GET**: Fetch profile by uid (auto-backfills email/phone from token on first visit)
- **PATCH**: Update profile with uid resolution, normalization, and conflict checks
- **Compatibility:** Also responds to `GET /api/user/profile`
- **Error contract:** Machine-readable codes (EMAIL_ALREADY_IN_USE, PHONE_ALREADY_IN_USE, INVALID_PHONE)

### 3. New Link-Identities Endpoint (`/api/user/link-identities`)

- **Method:** POST
- **Purpose:** Merge guest activity (orders, wallet, support tickets) with authenticated account
- **Input:** email, phone (optional; at least one required)
- **Output:** `{ ok: true, linked: { email, phone }, mergedGuestOrders }`

### 4. Legacy Endpoints Hardened

- `POST /api/store/profile/update` now resolves by uid (not firebaseUid) to prevent duplicate user accounts

---

## Pre-Deployment Checklist

### Environment & Testing

- [ ] Staging database has full clone of prod data
- [ ] Node.js ≥18 (for native ES6 modules in scripts)
- [ ] `.env` includes `MONGODB_URI` (or `MONGO_URI`/`MONGO_URL`)
- [ ] Firebase service account key loaded (firebase-key.json or `FIREBASE_SERVICE_ACCOUNT_KEY` env var)

### Code Review

- [ ] All modified files pass linting: `npm run lint`
- [ ] No compilation errors: `npm run build`
- [ ] Tested on staging before rolling to production

---

## Deployment Steps

### Step 1: Deploy Code

```bash
# Pull latest code
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Verify no errors
npm run lint
npm run build

# Redeploy app server (Next.js)
npm start  # or restart Docker/Kubernetes pod
```

### Step 2: Run Index Migration (Dry Run First)

**This ensures email/phone uniqueness without data loss.**

On your production database, first run in **dry-run mode** (no writes):

```bash
# Connect to production DB; outputs report without modifying data
node scripts/migrateUserIdentityIndexes.js
```

**Expected dry-run output:**

```
Mode: DRY RUN (no writes)
Scanned users: 1234
Users needing email/phone normalization: 45
Existing email/phone indexes: [...]
Would ensure index: {"key":{"email":1},...}
Would ensure index: {"key":{"phone":1},...}
Final indexes snapshot: [...]
```

**If dry run shows duplicate identities:**

- Script will list conflicting `uid`s by email or phone
- **Action required:** Manually merge or delete duplicate user records **before applying indexes**
- Duplicate scenario example:
  - Two users with email `john@example.com` from old migration
  - Resolve by: keeping one uid, moving orders/wallet/addresses to primary, deleting secondary

**If dry run is clean:**

- Proceed to Step 3

### Step 3: Apply Index Migration

Once dry run confirms no issues:

```bash
# Apply indexes and normalize all email/phone fields
node scripts/migrateUserIdentityIndexes.js --apply
```

**Expected output:**

```
Mode: APPLY (writes enabled)
Scanned users: 1234
Users needing email/phone normalization: 45
[normalizing email/phone in background]
Dropping index: email_1  (old index)
Dropping index: phone_1  (old index)
Created/ensured target indexes.
Final indexes snapshot: [...]
```

**Index creation is background=true**, so production queries are not blocked.

---

## API Testing (Staging)

### Test 1: Google Sign-In → Profile Fetch

```bash
# Firebase ID token from Google sign-in
export TOKEN="<bearer_token_from_google_signin>"

curl -X GET https://staging.quickfynd.com/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (200):**

```json
{
  "profile": {
    "id": "firebase_uid_xyz",
    "uid": "firebase_uid_xyz",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919526473883",
    "image": "",
    "phoneVerifiedAt": null,
    "emailVerifiedAt": "2026-04-30T10:00:00.000Z",
    "updatedAt": "2026-04-30T10:00:00.000Z"
  }
}
```

### Test 2: Update Profile (Email Conflict)

```bash
# Attempt to claim email already in use by another uid
curl -X PATCH https://staging.quickfynd.com/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@example.com"}'
```

**Expected response (409):**

```json
{
  "error": {
    "code": "EMAIL_ALREADY_IN_USE",
    "message": "Email is already linked to another account."
  }
}
```

### Test 3: Link Identities (Guest Order Merge)

```bash
# Phone OTP sign-in token (Firebase with phone_number claim)
export PHONE_TOKEN="<bearer_token_from_phone_otp>"

curl -X POST https://staging.quickfynd.com/api/user/link-identities \
  -H "Authorization: Bearer $PHONE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "guest@example.com", "phone": "+919526473883"}'
```

**Expected response (200):**

```json
{
  "ok": true,
  "linked": {
    "email": true,
    "phone": true
  },
  "mergedGuestOrders": 4
}
```

### Test 4: Invalid Phone Format

```bash
curl -X PATCH https://staging.quickfynd.com/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "invalid"}'
```

**Expected response (422):**

```json
{
  "error": {
    "code": "INVALID_PHONE",
    "message": "Phone format is invalid"
  }
}
```

---

## End-to-End Flow (Mobile App → Backend)

### Scenario: New User, Phone OTP Sign-In, then Adds Email

**Step 1: User signs in via phone OTP**

- App calls Firebase signInWithPhoneNumber → getIdToken (has `phone_number` claim)
- Backend stores: `users._id = uid`, `phone = "+919526473883"`, `phoneVerifiedAt = now`

**Step 2: User adds email in Account Details**

- App sends PATCH /api/profile with `email: "john@example.com"`
- Backend normalizes email, checks uniqueness, stores
- Backend does NOT mark `emailVerifiedAt` until user verifies email link (outside this impl)

**Step 3: User links guest orders from before sign-in**

- App sends POST /api/user/link-identities with email/phone
- Backend finds guest orders matching email/phone, sets userId to uid
- Returns `mergedGuestOrders: 2` (2 guest orders now show in order history)

**Step 4: User signs out, signs back in via Google**

- Firebase creates same uid (because email already exists)
- GET /api/profile returns same account data (email, phone, orders, addresses)

---

## Operational Notes

### Uniqueness Enforcement

- **Partial unique indexes** allow multiple users with `email = null` or `phone = null`
- **This is safe:** null means unset/unverified; multiple users can be "unset"
- **Duplicate prevention:** Non-empty emails and phones are globally unique

### Normalization Rules

**Email:**

- Trim whitespace
- Lowercase
- Stored: `john@example.com`

**Phone (E.164 canonical form):**

- Input: `9526473883` → Stored: `+919526473883`
- Input: `+91-9526-473883` → Stored: `+919526473883`
- Input: `00919526473883` → Stored: `+919526473883`
- Invalid inputs (non-numeric, wrong length) rejected with `INVALID_PHONE`

### Audit Logging

Link-identity endpoint logs all successful links:

```javascript
console.info("[AccountLink] Linked identities", {
  uid: "firebase_uid_xyz",
  oldEmail: "previous@example.com",
  newEmail: "new@example.com",
  oldPhone: "+919526473883",
  newPhone: "+911234567890",
  source: "phone_otp" or "google",
  timestamp: "2026-04-30T10:00:00.000Z",
  mergedGuestOrders: 2,
});
```

**Recommendation:** Forward these logs to a centralized audit trail (Datadog, Splunk, CloudWatch, etc.) for compliance.

---

## Rollback Plan

If issues occur post-deployment:

### Revert Code (5 min)

```bash
git revert HEAD  # or git reset --hard HEAD~1
npm run build
npm start
```

### Keep Indexes (safe; non-blocking)

Index changes do not require rollback—they're additive and use partial filters. Old code will still work with new indexes.

---

## Monitoring & Alerts

### Metrics to Track

1. **Profile API latency** — Should stay <100ms (no new DB queries)
2. **Link-identities call volume** — Expected spike on day 1 (guests converting)
3. **Email/phone uniqueness errors** — Should drop to near zero after migration (pre-existing duplicates resolved)
4. **Index creation background progress** — Monitor MongoDB op log; should complete in <1h for typical scale

### Alert Thresholds

- Profile PATCH >500ms → investigate DB latency
- Link-identities returning >100 mergedGuestOrders → large backlog; may indicate old stale guest data
- Unique constraint violations (E11000) on email/phone → duplicate detection failed; escalate

---

## Support & QA

### Known Gotchas

1. **Stale Firebase tokens:** If client doesn't refresh token, profile update may fail with UNAUTHORIZED. App must always call `getIdToken(true)` to force refresh.
2. **Old guest orders:** Pre-linking, guest orders remain in separate collection. Only after link-identities do they appear in user's order history.
3. **Email casing:** `John@Example.COM` and `john@example.com` are treated as duplicates (both stored lowercase). QA should test this explicitly.

### Troubleshooting

**Issue:** "EMAIL_ALREADY_IN_USE" when email should be free

- **Cause:** Email exists but is (logically) soft-deleted or orphaned
- **Fix:** Check collection for duplicates; `db.users.findOne({email: "claimed@ex.com"})` should return only one doc

**Issue:** Migration script hangs

- **Cause:** Large collection (>1M users) or slow network
- **Fix:** Run in maintenance window; increase timeout: `node --max-http-header-size=100000 scripts/migrateUserIdentityIndexes.js`

**Issue:** "INVALID_PHONE" when phone looks valid

- **Cause:** Phone length out of E.164 bounds (8-15 digits) or leading zeros not handled
- **Fix:** Log the normalized value; check for typos in data migration

---

## Files Modified

| File                                    | Change                                                         | Impact                                                |
| --------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `models/User.js`                        | Added emailVerifiedAt, phoneVerifiedAt; partial unique indexes | **Breaking:** old code may fail on email/phone writes |
| `app/api/profile/route.js`              | Uid-first, normalization, conflict checks                      | **Requires:** code deploy first, then data migration  |
| `app/api/user/profile/route.js`         | New compatibility endpoint                                     | **Non-breaking:** just re-exports GET                 |
| `app/api/user/link-identities/route.js` | New endpoint for guest merge                                   | **Non-breaking:** new functionality only              |
| `app/api/store/profile/update/route.js` | Changed lookup from firebaseUid → uid                          | **Non-breaking:** same outcome, safer logic           |
| `scripts/migrateUserIdentityIndexes.js` | New migration script                                           | **Operational:** run after code deploy                |
| `package.json`                          | Added npm scripts for migration                                | **Non-breaking:** new scripts only                    |

---

## Success Criteria

After full deployment:

✅ All users can sign in via Google and see their account details  
✅ All users can sign in via phone OTP and see their account details  
✅ Email/phone conflict rejection works (409 responses observed)  
✅ Guest order linking shows `mergedGuestOrders > 0` on first link call  
✅ No duplicate email/phone entries in production DB  
✅ Profile API latency <100ms (no degradation from normalization)  
✅ Audit logs show successful account links with source and counts

---

## Questions?

Refer to:

- Backend API contract: `MOBILE_AUTH_PROFILE_ORDER_TRACKING_IMPLEMENTATION_GUIDE.md`
- Mobile integration: `MOBILE_APP_DEVELOPER_QUICKSTART.md`
- Index architecture: This guide, "Uniqueness Enforcement" section
