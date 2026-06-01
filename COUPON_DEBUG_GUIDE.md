# Coupon Display Issue - Diagnostic Guide

## Problem
The coupon modal is showing "No coupons available at the moment" even when coupons should exist.

## Root Causes (In Order of Likelihood)

### 1. **No Coupons Created Yet** ⚠️ MOST LIKELY
If you haven't created any coupons in the admin panel yet, the checkout will correctly show no coupons.

**Solution**: Create sample coupons for testing

### 2. **StoreId Mismatch**
Coupons might exist but with a different `storeId` than what the checkout is requesting.

**Solution**: Check the browser console logs (see Debugging section below)

### 3. **Coupons Are Expired**
Coupons might exist but have `expiresAt` dates in the past.

**Solution**: Create new coupons with future expiration dates

---

## How to Create Sample Coupons (Development)

### Option A: Using the Test Endpoint (Easiest)

1. **Open your browser and visit:**
   ```
   http://localhost:3001/api/test/create-sample-coupon
   ```

2. **Make a POST request** (using Postman, curl, or your API client):
   ```bash
   POST http://localhost:3001/api/test/create-sample-coupon
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Created 3 sample coupons",
     "storeId": "store_id_here",
     "coupons": [
       {
         "code": "WELCOME10",
         "title": "Welcome 10% Off",
         "discount": "10%"
       },
       {
         "code": "SAVE50",
         "title": "Save ₹50",
         "discount": "₹50"
       },
       {
         "code": "MEGA20",
         "title": "Mega 20% Discount",
         "discount": "20%"
       }
     ]
   }
   ```

4. **Go to checkout and click "Apply Coupon"** - You should now see the coupons!

### Sample Coupons Created
- **WELCOME10**: 10% off (min ₹500)
- **SAVE50**: ₹50 off (min ₹1000)
- **MEGA20**: 20% off (valid for 7 days)

---

## Debugging Steps

### Step 1: Open Browser Console
1. Go to checkout page
2. Press **F12** to open Developer Tools
3. Click **Console** tab

### Step 2: Click "Apply Coupon"
Watch the console for detailed logs:

```
=== COUPON FETCH START ===
Fetching store info...
Store data response: {success: true, store: {_id: "...", name: "...", slug: "..."}}
Store ID found: 652abc123def456ghi789jkl
Fetching coupons for store: 652abc123def456ghi789jkl
Coupon URL: /api/coupons?storeId=652abc123def456ghi789jkl
Coupons API response: {success: true, coupons: [...]}
Response status: 200
Coupons array: [...]
Found 3 coupons
=== COUPON FETCH END ===
```

### Step 3: If Coupons Array is Empty
You'll see:
```
Coupons array is empty - calling debug endpoint to check DB
=== DEBUG INFO ===
Total coupons in DB: 0
Store ID from DB: 652abc123def456ghi789jkl
Requested Store ID: 652abc123def456ghi789jkl
All coupons: []
Active coupons: 0
==================
```

This means **no coupons exist in the database for your store**.

---

## What to Look For in Console Logs

| Log Message | Meaning | Solution |
|---|---|---|
| `Store ID found: ...` | Store exists ✅ | Continue |
| `Failed to get store ID from store-info` | No store found ❌ | Create a store first |
| `Found 0 coupons` | No coupons exist ❌ | Create coupons using test endpoint |
| `Total coupons in DB: 0` | Database has no coupons ❌ | Create coupons using test endpoint |
| `Store ID from DB: X` but `Requested Store ID: Y` | StoreId mismatch ❌ | Check coupon creation code |
| `Found 3 coupons` | Coupons exist ✅ | Check if they display in modal |

---

## Manual Coupon Creation (Admin Panel)

If the test endpoint doesn't work, create coupons manually:

1. Log in as **Admin**
2. Go to **Admin Panel** → **Coupons** section
3. Click **Create New Coupon**
4. Fill in:
   - **Code**: `WELCOME10` (must be UPPERCASE)
   - **Title**: Welcome 10% Off
   - **Description**: Get 10% off on your first order
   - **Discount Type**: Percentage
   - **Discount Value**: 10
   - **Min Order Value**: 500
   - **Max Discount**: 500
   - **Status**: Active
5. Click **Create**

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/coupons?storeId={id}` | GET | Fetch active coupons for checkout |
| `/api/coupons` | POST | Validate coupon when applied |
| `/api/coupons-debug` | GET | Debug info - see all coupons |
| `/api/test/create-sample-coupon` | POST | Create sample coupons (dev only) |
| `/api/test/create-sample-coupon` | GET | Check if sample coupons exist |
| `/api/admin/coupon` | POST | Admin: Create coupon |
| `/api/admin/coupon` | DELETE | Admin: Delete coupon |

---

## Next Steps

1. **Try the test endpoint** to create sample coupons
2. **Go to checkout** and click "Apply Coupon"
3. **Check browser console** for detailed logs
4. **Share console logs** if coupons still don't appear

---

**Note**: The `/api/test/create-sample-coupon` endpoint is for development only. Remove or protect it before going to production.
