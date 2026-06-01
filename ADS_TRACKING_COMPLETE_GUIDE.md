# Facebook/Instagram Ads Tracking Complete Guide

## 📊 What's Tracked Now

Your app now tracks the **complete customer journey** from Facebook/Instagram ads to purchase:

| Step | Tracked | Tool |
|------|---------|------|
| **Ad Click** | UTM source, campaign, medium, ad ID | Meta Pixel + UTM |
| **Landing** | Which page, referrer, bounce | UTM Tracker |
| **Browse** | Product views, page visits | Meta Pixel ViewContent |
| **Add to Cart** | Items added, quantity | Meta Pixel AddToCart |
| **Checkout** | How many initiated checkout | Meta Pixel InitiateCheckout ✨ |
| **Purchase** | Value, items, attribution source | Meta Pixel Purchase ✨ |

## 🚀 Setup Instructions

### 1. Add UTM Parameters to Facebook Ads

When setting up your Facebook/Instagram ads, add UTM parameters to your landing URL:

#### Basic URL:
```
https://quickfynd.com?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale
```

#### With Ad ID (recommended for detailed tracking):
```
https://quickfynd.com?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale&utm_id={ad.id}
```

#### For Instagram:
```
https://quickfynd.com?utm_source=instagram&utm_medium=cpc&utm_campaign=summer_sale
```

### 2. UTM Parameter Examples

**Facebook Campaign:**
```
https://quickfynd.com?utm_source=facebook&utm_medium=cpc&utm_campaign=electronics_sale&utm_content=iphone_13
```

**Instagram Story Ad:**
```
https://quickfynd.com?utm_source=instagram&utm_medium=story&utm_campaign=flash_sale_24h
```

**Google Ads (for comparison):**
```
https://quickfynd.com?utm_source=google&utm_medium=cpc&utm_campaign=search_promotion
```

### 3. Available UTM Parameters

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `utm_source` | facebook, instagram, google | Where traffic came from |
| `utm_medium` | cpc, cpm, story | Type of marketing |
| `utm_campaign` | summer_sale, flash_deal | Campaign name |
| `utm_content` | iphone_13, banner_v1 | Specific content/ad variant |
| `utm_id` | {ad.id} | Specific ad ID |
| `utm_term` | keyword_here | Search term (for search ads) |

## 📈 Data Collection Points

### A. Page Level Tracking
When a visitor lands on your site from an ad:

```javascript
// Automatically tracked by UtmTracker component
localStorage.setItem('utm_data', {
  source: 'facebook',
  medium: 'cpc',
  campaign: 'summer_sale',
  id: 'ad_id_123',
  timestamp: '2026-02-11T10:30:00Z',
  referrer: 'facebook.com'
})
```

### B. Checkout Events
```javascript
// Tracked: When user enters checkout
window.fbq('track', 'InitiateCheckout')

// Tracked: When user adds items to cart
window.fbq('track', 'AddToCart')
```

### C. Purchase Events
```javascript
// Tracked with FULL attribution data:
window.fbq('track', 'Purchase', {
  value: 4999,
  currency: 'INR',
  utm_source: 'facebook',      // ← Shows which ad source
  utm_campaign: 'summer_sale',  // ← Which campaign
  utm_medium: 'cpc',            // ← Type of ad
  utm_id: 'ad_id_123'           // ← Specific ad ID
})
```

## 🔍 Tracking New Files

### Components Created:

**1. `components/FbqInitiateCheckout.js`**
- Tracks when customer opens checkout page
- Sends "InitiateCheckout" event to Meta Pixel
- Added to checkout page automatically

**2. `components/UtmTracker.js`**
- Captures UTM parameters from URL
- Stores in localStorage for session
- Sends to Meta Pixel and Google Analytics
- Auto-runs on all pages

**3. `components/AdsAttribution.js`**
- Creates attribution profile for visitor
- Tracks "Lead" event with source/campaign
- Logs attribution data to database
- Runs on every page visit

### API Endpoint Created:

**`app/api/analytics/track-attribution/route.js`**

**POST:** Log attribution data
```bash
curl -X POST https://yoursite.com/api/analytics/track-attribution \
  -H "Content-Type: application/json" \
  -d '{
    "source": "facebook",
    "medium": "cpc",
    "campaign": "summer_sale",
    "referrer": "facebook.com",
    "timestamp": "2026-02-11T10:30:00Z"
  }'
```

**GET:** Get attribution statistics
```bash
# Get all stats
curl https://yoursite.com/api/analytics/track-attribution

# Filter by date range
curl 'https://yoursite.com/api/analytics/track-attribution?startDate=2026-02-01&endDate=2026-02-28'

# Filter by source
curl 'https://yoursite.com/api/analytics/track-attribution?source=facebook'
```

**Response:**
```json
{
  "stats": [
    {
      "_id": {
        "source": "facebook",
        "medium": "cpc",
        "campaign": "summer_sale"
      },
      "totalVisits": 1250,
      "conversions": 85,
      "conversionRate": 6.8,
      "totalConversionValue": 425000,
      "avgValue": 5000
    }
  ]
}
```

## 📊 What You Can Measure

### In Meta Pixel Dashboard:
✅ **Reach** - How many people saw the ad  
✅ **Clicks** - How many clicked the ad  
✅ **Link Clicks** - Tracked via UTM  
✅ **ViewContent** - Browsed your site  
✅ **AddToCart** - Added items  
✅ **InitiateCheckout** - Started checkout (NEW!)  
✅ **Purchase** - Completed purchase with source  

### In Your Database (Custom Analytics):
✅ **Visitor Source** - Facebook, Instagram, etc.  
✅ **Campaign Performance** - Which campaigns convert  
✅ **Conversion Rate** - Sales / visitors for each campaign  
✅ **Average Order Value** - By traffic source  
✅ **ROI** - Revenue per ad source  

## 🎯 Example Calculation

**Facebook Summer Sale Ad Results:**

```
Total Visits: 5,000 (utm_source=facebook)
InitiateCheckout: 320 people (6.4% conversion)
Purchases: 85 people (1.7% of visitors)
Total Revenue: ₹425,000
Average Order Value: ₹5,000
ROI = (Revenue - Ad Cost) / Ad Cost
```

## ✅ Checklist for Ads Setup

- [ ] Add Meta Pixel ID to site (already done)
- [ ] Set UTM parameters in Facebook Ads Manager
- [ ] Set UTM parameters in Instagram Ads Manager
- [ ] Test: Click ad link and verify UTM in browser URL
- [ ] Test: Go through checkout and complete purchase
- [ ] Check Meta Pixel dashboard for events
- [ ] Check database for attribution data
- [ ] Set up custom conversion in Meta for "Checkout initiated"
- [ ] Create conversion rate graph (Purchases / Visits)
- [ ] Monitor ROI weekly

## 🧪 Testing Ads Tracking

### Test 1: Landing Page
```
1. Click any ad with UTM parameters
2. Open browser DevTools → Application → LocalStorage
3. Look for "utm_data" entry
4. Should see: source, medium, campaign, etc.
```

**Expected Result:**
```javascript
{
  "source": "facebook",
  "medium": "cpc",
  "campaign": "test_campaign",
  "timestamp": "2026-02-11T10:30:00Z"
}
```

### Test 2: ViewContent Event
```
1. Landing from ad with UTM params
2. Open Meta Pixel debugger (Chrome extension)
3. Should see "PageView" event with UTM params
```

### Test 3: Checkout Event
```
1. Add item to cart
2. Go to /checkout
3. In Meta Pixel debugger, should see "InitiateCheckout" event
```

### Test 4: Purchase Event
```
1. Complete purchase from ad
2. Redirected to /order-success
3. Check Meta Pixel debugger
4. Should see "Purchase" event with:
   - value: 4999
   - currency: INR
   - utm_source: facebook
   - utm_campaign: test_campaign
```

### Test 5: Database Attribution
```
1. Complete purchase from ad
2. In MongoDB, check "ad_attributions" collection
3. Should see record with:
   - source: "facebook"
   - converted: true
   - conversionValue: 4999
```

## 📱 Facebook Ads Manager Setup

### In Ads Manager:

1. **Create Campaign:**
   - Objective: "Sales" or "Conversions"
   - Audience: Target your ideal customers

2. **Set Landing URL:**
   ```
   https://quickfynd.com/shop?utm_source=facebook&utm_medium=cpc&utm_campaign=my_campaign_name&utm_id={ad.id}
   ```

3. **Link Instagram:**
   - Select Instagram accounts
   - Ads will show on both Facebook & Instagram
   - They'll get `utm_source=instagram` (set this separately)

4. **Set Conversion:**
   - Pixel: Select your Meta Pixel
   - Event: "Purchase"
   - Value: "Track purchase value"

## 📊 Dashboard Views

### View Attribution Stats:
```javascript
// Get all attribution stats
const response = await fetch('/api/analytics/track-attribution');
const data = await response.json();

data.stats.forEach(stat => {
  console.log(`
    Campaign: ${stat._id.campaign}
    Source: ${stat._id.source}
    Visits: ${stat.totalVisits}
    Conversions: ${stat.conversions}
    Conv Rate: ${stat.conversionRate}%
    Avg Value: ₹${stat.avgValue}
  `);
});
```

### Filter by Date Range:
```javascript
const start = '2026-02-01';
const end = '2026-02-28';
const response = await fetch(
  `/api/analytics/track-attribution?startDate=${start}&endDate=${end}`
);
```

## 🚨 Troubleshooting

### Issue: UTM Not Captured
**Solution:**
1. Check URL has all required params: `utm_source`, `utm_medium`, `utm_campaign`
2. Open DevTools → Network → find page request
3. Check "utm_data" in localStorage

### Issue: Purchase Not Showing Attribution
**Solution:**
1. Ensure UTM was present when landing
2. Check: `window.attributionData` in browser console
3. Verify localStorage still has `utm_data`
4. Restart session and test again

### Issue: Meta Pixel Not Tracking Events
**Solution:**
1. Verify Meta Pixel code in HTML head
2. Open Meta Pixel Debugger browser extension
3. Check events are firing
4. Ensure no ad blockers running

### Issue: No Attribution Data in Database
**Solution:**
1. Check API endpoint is working: `GET /api/analytics/track-attribution`
2. Verify MongoDB connection
3. Check "ad_attributions" collection exists
4. Monitor network in DevTools for API calls

## 📞 Support

For questions or issues:
- Check browser console for errors
- Verify all components are imported in `/app/(public)/layout.jsx`
- Ensure Meta Pixel ID is set in your HTML head
- Test with different browsers/devices

## Next Steps

1. ✅ Components deployed
2. 📋 Add UTM params to Facebook Ads Manager
3. 🧪 Test end-to-end with test purchase
4. 📊 Review data in Meta Pixel dashboard
5. 📈 Monitor conversion rates daily
6. 🎯 Optimize highest-performing ads
7. 💰 Calculate ROI per campaign
