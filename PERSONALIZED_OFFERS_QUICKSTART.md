# Personalized Offers - Quick Setup Checklist

## 🚀 Setup Steps (5 minutes)

### 1. Database Migration
```bash
# Run these commands in your terminal
npx prisma generate
npx prisma db push
```

### 2. Verify Files Created
✅ Check these files were created:
- `models/PersonalizedOffer.js`
- `app/api/personalized-offers/route.js`
- `app/api/personalized-offers/validate/[token]/route.js`
- `app/dashboard/store/personalized-offers/page.jsx`
- `app/(public)/offer/[token]/page.jsx`
- `components/CountdownTimer.jsx`
- `lib/offerUtils.js`

### 3. Test the Feature

#### As Admin:
1. Navigate to: `/dashboard/store/personalized-offers`
2. Click "Create New Offer"
3. Fill in:
   - Customer Email: `test@example.com`
   - Select any product
   - Discount: `20%`
   - Expires At: Set 1 hour from now
4. Click "Create Offer & Copy Link"
5. The URL is copied to clipboard

#### As Customer:
1. Open the copied URL in a new incognito window
2. You should see:
   - ⏰ Countdown timer
   - 🎉 Special pricing
   - Personalized message
   - "Add to Cart" button

### 4. Integration with Checkout (Optional)

To track offer usage when customers purchase:

**File:** Your checkout/order creation API

```javascript
import { getStoredOfferToken, markOfferAsUsed } from '@/lib/offerUtils';

// After successful order creation
const offerToken = getStoredOfferToken();
if (offerToken) {
  await markOfferAsUsed(offerToken, orderId);
}
```

---

## 📋 Quick Usage Guide

### Creating an Offer

1. Go to `/dashboard/store/personalized-offers`
2. Click "+ Create New Offer"
3. Fill the form
4. Copy the generated URL
5. Send to customer via:
   - Email
   - SMS
   - WhatsApp
   - Direct message

### Offer URL Format
```
https://yoursite.com/offer/{unique-token}
```

### Managing Offers

**Filter by:**
- All offers
- Active (currently valid)
- Expired (past deadline)
- Used (customer purchased)

**Actions:**
- 📋 Copy URL
- 👁️ Preview
- 🗑️ Delete

---

## 🎯 Use Cases

### 1. VIP Customer Rewards
Give your best customers exclusive discounts on premium products.

### 2. Win-Back Campaigns
Re-engage inactive customers with time-limited special pricing.

### 3. Abandoned Cart Recovery
Send personalized discount to customers who left items in cart.

### 4. Seasonal Promotions
Create urgency with countdown timers for holiday sales.

### 5. Bulk Orders
Offer special pricing for customers ordering in quantity.

### 6. Referral Rewards
Thank customers who refer friends with exclusive deals.

---

## ⚙️ Configuration Options

### Discount Range
- Minimum: 1%
- Maximum: 100%
- Recommended: 10-30%

### Expiry Duration
- Short: 2-6 hours (high urgency)
- Medium: 24 hours (recommended)
- Long: 2-7 days (less pressure)

---

## 🎨 Customization

### Change Countdown Colors
**File:** `components/CountdownTimer.jsx`
```javascript
// Line 55: Update gradient colors
className="bg-gradient-to-r from-red-500 to-orange-500"

// Change to blue:
className="bg-gradient-to-r from-blue-500 to-cyan-500"
```

### Modify Offer Page Layout
**File:** `app/(public)/offer/[token]/page.jsx`
- Edit banners (lines 100-110)
- Customize messages (lines 130-145)
- Update trust badges (lines 200-220)

---

## 📊 Monitor Performance

Track in admin dashboard:
- Total offers created
- Active vs expired
- Usage rate (%)
- Revenue generated

---

## 🔒 Security Notes

✅ **Built-in Security:**
- Unique cryptographic tokens
- Server-side validation
- Expiry enforcement
- One-time use tracking

---

## 📱 Share via Email Template

```
Subject: {CustomerName}, Special Offer Just For You! 🎉

Hi {CustomerName},

Great news! We've reserved an exclusive discount for you:

🎁 {ProductName}
💰 {DiscountPercent}% OFF
⏰ Expires: {ExpiryDate}

Your special price: ₹{DiscountedPrice} (Save ₹{Savings})

[Claim Your Discount] → {OfferURL}

Don't wait - this offer expires soon!

Best regards,
Your Store Team
```

---

## ❗ Troubleshooting

### Offer page shows "Invalid offer"
- Check token is correct
- Verify database connection
- Run `npx prisma generate`

### Countdown not showing
- Check browser console for errors
- Verify `expiresAt` date is in future
- Clear browser cache

### Can't create offers
- Verify store ID is set
- Check Firebase auth is working
- Ensure products exist in database

---

## 📚 Full Documentation

For complete details, see: [PERSONALIZED_OFFERS_GUIDE.md](./PERSONALIZED_OFFERS_GUIDE.md)

---

**Ready to create your first personalized offer?** Go to `/dashboard/store/personalized-offers` and click "Create New Offer"!
