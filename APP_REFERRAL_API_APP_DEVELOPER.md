# Referral Program API - Mobile App Developer Handoff

Last updated: May 5, 2026
Base URL (Production): https://quickfynd.com

## Overview

This document covers backend APIs for the customer referral flow.
No website UI changes are required for this integration.

Referral logic implemented on backend:

- Inviter shares referral code.
- Invited customer logs in and links referral.
- When invited customer's order is marked DELIVERED, inviter gets wallet bonus.
- Reward is configurable from seller dashboard (default 25 coins/INR).
- Bonus is credited once per invited customer per store.

## Auth Requirements

Customer-auth APIs require Firebase ID token in header:

Authorization: Bearer <firebase_id_token>

Token must be from Firebase project: quickfynd.

## Endpoints

### 1) Get Referral Program Config (Public)

GET /api/referrals/config?storeId=<storeId>

Purpose:

- Check if referral program is enabled.
- Get inviter reward amount to display in app UI.

Response 200:

```json
{
  "enabled": true,
  "inviterRewardCoins": 25
}
```

Errors:

- 400: { "error": "storeId is required" }
- 500: { "error": "Failed to fetch referral config" }

---

### 2) Get My Referral Code (Customer Auth)

GET /api/referrals/code?storeId=<storeId>
Authorization: Bearer <firebase_id_token>

Purpose:

- Get current customer's referral code for this store.
- If code does not exist, backend generates and returns one.

Response 200:

```json
{
  "code": "ABCD1234"
}
```

Errors:

- 401: { "error": "Missing Authorization" }
- 401: { "error": "Invalid token" }
- 400: { "error": "storeId is required" }
- 500: { "error": "Failed to get referral code" }

---

### 3) Link Invited Customer to Inviter (Customer Auth)

POST /api/referrals/link
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Preferred body:

```json
{
  "storeId": "<storeId>",
  "referralCode": "ABCD1234"
}
```

Legacy fallback body (supported):

```json
{
  "storeId": "<storeId>",
  "inviterUserId": "<firebase_uid>"
}
```

Success (new link) - 201:

```json
{
  "success": true,
  "message": "Referral linked successfully",
  "referralId": "<mongo_id>"
}
```

Success (already linked) - 200:

```json
{
  "success": true,
  "message": "Referral already linked for this store",
  "inviterUserId": "<firebase_uid>"
}
```

Errors:

- 401: Missing/invalid auth token
- 400: storeId missing
- 400: referralCode or inviterUserId missing
- 404: invalid referralCode
- 400: self referral ("You cannot refer yourself")
- 500: server failure

## Reward Credit Behavior (Backend)

Reward credit happens in order status update pipeline when:

- order status becomes DELIVERED
- order has userId
- referral record exists for that invited customer
- referral reward for that link has not already been credited
- referral program is enabled for store

Credit details:

- Wallet transaction type: BONUS
- Amount: inviterRewardCoins from store referral setting (default 25)
- One-time credit per invited customer per store

## Seller-side Setting API (Dashboard only)

This is for seller dashboard/admin configuration, not customer app UI.

### GET /api/store/referral-program

Auth: Seller Firebase token
Returns:

```json
{
  "enabled": true,
  "inviterRewardCoins": 25
}
```

### POST /api/store/referral-program

Auth: Seller Firebase token
Body:

```json
{
  "enabled": true,
  "inviterRewardCoins": 25
}
```

## Recommended Mobile Integration Flow

1. App loads referral section:

- Call GET /api/referrals/config?storeId=...
- If enabled=false, hide referral section.

2. Logged-in inviter opens "Invite Friends":

- Call GET /api/referrals/code?storeId=...
- Show code and share text/link.

3. Invited user logs in and enters code:

- Call POST /api/referrals/link with storeId + referralCode.
- If 201 or 200(success), show "Referral linked" state.

4. Invited user places order:

- No app API needed for reward trigger.
- Reward is credited automatically when backend marks order DELIVERED.

## Suggested App UI Copy

- Referral headline: Invite friends and earn wallet rewards.
- Reward line: Earn {inviterRewardCoins} wallet on your friend's first delivered order.
- Input placeholder: Enter referral code.

## Notes

- Referral code is store-specific.
- Keep referralCode uppercase in app (backend also normalizes to uppercase).
- Linking is idempotent for same invited user + store.
- Do not expose inviter Firebase UID in app links; use referralCode flow.
