# Meta (Facebook/Instagram) Ads Integration Guide

## 🎯 What This Does

Automatically sync your Facebook and Instagram ad campaigns into your Sales Report:
- **Ad Spend** - Total amount spent on campaigns
- **Clicks** - Number of link clicks
- **Impressions** - Number of times ads were shown
- **Conversions** - Number of purchases tracked via Meta Pixel
- **Campaign Performance** - Breakdown by campaign type and platform

## 🔗 How to Connect Meta Ads

### Step 1: Get Your Ad Account ID

1. Go to [Meta Business Settings](https://business.facebook.com/settings/ad-accounts)
2. Click on your Ad Account
3. You'll see the Ad Account ID at the top (format: `123456789012345`)
4. **Copy this number** (just the numbers, no "act_" prefix)

### Step 2: Generate Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your App (**App ID: 820947720963942**)
3. Click "Generate Access Token"
4. Grant these permissions:
   - ✅ `ads_read` - Read ad campaign data
   - ✅ `ads_management` - Access ad insights
5. Copy the generated Access Token (starts with `EAABs...`)

### Step 3: Sync Your Campaigns

1. In your store dashboard, go to **Marketing Expenses**
2. Click **"Sync from Meta"** button
3. Paste your credentials:
   - Ad Account ID: The 15-digit number
   - Access Token: The long token from Graph API Explorer
   - Date Range: Select which period to sync
4. Click **"Sync Campaigns"**

## 📊 What Gets Synced

For each campaign in the selected date range, we fetch:

```
✅ Campaign Name
✅ Campaign Objective (Sales, Awareness, etc.)
✅ Total Spend (₹)
✅ Link Clicks
✅ Impressions
✅ Reach
✅ Conversions (Purchase events from Meta Pixel)
```

## 🔄 Sync Behavior

- **First Sync**: Creates new marketing expense entries
- **Re-sync**: Updates existing entries with latest data
- **Automatic Categorization**: 
  - Sales Campaigns → "SALES" type
  - Awareness/Reach → "AWARENESS" type
  - Traffic/Engagement → "CONSIDERATION" type

## 🔒 Security & Privacy

- ✅ Access Token is **NOT stored** - used only during sync
- ✅ Data is stored in your private database
- ✅ Only you can see your marketing data
- ✅ Use temporary tokens for one-time syncs

## 💡 Best Practices

### 1. Regular Syncing
- Sync daily/weekly to keep data current
- Use different date ranges for historical data

### 2. Token Management
- Generate a **short-lived token** for each sync
- Don't share your access token
- Regenerate if compromised

### 3. Data Verification
- Cross-check synced data with Meta Ads Manager
- Verify spend and conversion numbers match
- Check for any missing campaigns

## 📈 Integration with Sales Report

Once synced, your marketing expenses automatically appear in:

### Sales Report Dashboard
```
Total Profit = Revenue - Product Costs - Delivery Costs - Marketing Costs
                                                          ^^^^^^^^^^^^^^^^
                                                    Auto-synced from Meta!
```

### Marketing Expenses Page
- View all campaigns with performance metrics
- See cost per click (CPC)
- Track conversion cost
- Compare platform performance

## 🚨 Troubleshooting

### Error: "Invalid Access Token"
**Solution**: 
1. Generate a new token from Graph API Explorer
2. Make sure you selected the correct app
3. Grant required permissions (ads_read, ads_management)

### Error: "Ad Account not found"
**Solution**:
1. Verify Ad Account ID is correct (no spaces, no "act_" prefix)
2. Make sure your account has access to this ad account
3. Check in Meta Business Settings

### Error: "Permission denied"
**Solution**:
1. You need admin or analyst role on the ad account
2. Go to Meta Business Settings → Ad Accounts
3. Check your role and request access if needed

### No campaigns showing up
**Solution**:
1. Make sure campaigns exist in the selected date range
2. Check if campaigns are active or completed
3. Try syncing a different date range

## 🔗 Useful Links

- [Meta Business Manager](https://business.facebook.com/)
- [Meta Ads Manager](https://www.facebook.com/adsmanager)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [Meta API Documentation](https://developers.facebook.com/docs/marketing-apis)

## 📊 Sample Sync Result

After successful sync, you'll see:

```
✅ Successfully synced 5 campaigns from Meta

Example campaigns:
- "Summer Sale 2026" - ₹5,000 spent, 1,234 clicks, 45 conversions
- "New Product Launch" - ₹3,500 spent, 890 clicks, 32 conversions
- "Brand Awareness" - ₹2,000 spent, 5,678 impressions, 234 clicks
```

## 🎯 Next Steps

1. **Configure Product Cost Prices** → Get accurate profit margins
2. **Sync Meta Campaigns** → Track marketing expenses
3. **View Sales Report** → See complete business profitability

---

**Your App Details:**
- **Meta App ID**: 820947720963942
- **Meta App Secret**: Stored securely in .env
- **Meta Pixel ID**: 3093893836517580 (already connected)

Your Meta Pixel is already tracking conversions. Now sync your ad spend to see complete ROI!
