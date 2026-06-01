# Delhivery Integration - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Get Your API Token
```
1. Go to https://track.delhivery.com
2. Login with your Delhivery account
3. Go to: Settings → API
4. Copy the API Token
```

### 2. Set Environment Variable
```bash
# Add to .env.local
DELHIVERY_API_TOKEN=your_copied_token_here
```

### 3. Done! ✅
The integration is already built. You just needed the token.

---

## 📱 How It Works - 3 Screens

### Screen 1: Customer Tracks Order (`/track-order`)
**User enters:** Phone or AWB number
**User sees:** Live tracking from Delhivery + timeline

```
┌─────────────────────────────────┐
│  Track Your Order               │
│  Enter Phone or AWB #           │
│  ┌───────────────────────────┐  │
│  │ 9876543210              │  │
│  └───────────────────────────┘  │
│  [TRACK ORDER]                  │
│                                 │
│  Current Status: OUT_FOR_DELIVERY
│  Location: Delhi Hub
│  Expected: Jan 15, 2026
│                                 │
│  Recent Updates:                │
│  • OUT_FOR_DELIVERY at Delhi    │
│  • PICKED_UP at Warehouse       │
│  • CONFIRMED at Origin          │
└─────────────────────────────────┘
```

### Screen 2: Customer Dashboard (`/dashboard/orders`)
**Shows:** All customer's orders with tracking inline

```
Order #12345
Courier: Delhivery
Tracking: 7847593847
Status: OUT_FOR_DELIVERY
Expected: Jan 15, 2026

[View Timeline]
```

### Screen 3: Seller Dashboard (`/store/orders`)
**Shows:** All seller's orders, can update tracking

```
Order #12345 | Customer: John | ₹5000 | Status: [SHIPPED ▼]

[View Details]
  ├─ Tracking: 7847593847
  ├─ Courier: Delhivery
  ├─ Status: OUT_FOR_DELIVERY (LIVE)
  ├─ Location: Delhi Hub
  ├─ Expected: Jan 15, 2026
  └─ Timeline: [5 recent events shown]
```

---

## 🔄 The Flow

```
Order Created
    ↓
Seller ships with Delhivery
    ↓
Seller adds AWB to order
    ↓
Customer sees live tracking
    ↓
Automatic updates from Delhivery
    ↓
Package delivered ✓
```

---

## 🎯 What Customers See

### Track Order Page
```
Input:  AWB Number or Phone
Output: 
  ✓ Current Status
  ✓ Current Location  
  ✓ Expected Delivery Date
  ✓ All scan events with timestamps
  ✓ Link to Delhivery website
```

### Dashboard
```
For each order:
  ✓ Courier name
  ✓ Tracking ID
  ✓ Status badge
  ✓ Expected delivery
  ✓ Mini timeline (last 8 events)
```

---

## 🔧 What Sellers Can Do

### In Store Orders Page

1. **View Orders** - See all orders with auto-fetched Delhivery status
2. **Update Tracking** - Enter AWB & courier manually
3. **Notify Customer** - Click button to send tracking email/SMS
4. **View Timeline** - See last 5 shipment events

### Data Shown:
```
Current Status:  OUT_FOR_DELIVERY
Location:        Delhi Hub  
Expected Date:   Jan 15, 2026

Events (last 5):
1. OUT_FOR_DELIVERY at Delhi Hub - Jan 12, 5:30 PM
2. PICKED_UP at Warehouse - Jan 12, 2:15 PM
3. CONFIRMED at Origin - Jan 11, 6:00 PM
... (more available in full timeline)
```

---

## 🧪 Test It Now

### Test 1: Track by AWB
```
1. Go to /track-order
2. Enter a Delhivery AWB number
3. Should see: Live status + Timeline
```

### Test 2: View Store Orders
```
1. Login as seller → /store/orders
2. Click any order with tracking
3. Should see: Delhivery status auto-populated
```

### Test 3: View Customer Orders
```
1. Login as customer → /dashboard/orders
2. Expand any order with tracking
3. Should see: Live status + Timeline
```

---

## ❌ If Something Doesn't Work

### Error: "API token not configured"
→ Add `DELHIVERY_API_TOKEN` to `.env.local` and restart server

### Error: "Tracking ID not found"
→ Make sure the AWB number is correct and shipped via Delhivery

### Missing live data?
→ Delhivery updates every 2-4 hours. Check back later.

### Page loads slowly?
→ First Delhivery fetch takes ~1-5 seconds. It's normal.

---

## 📊 Files Changed

```
✅ lib/delhivery.js
   Helper functions for consistent Delhivery data handling

✅ app/api/track-order/route.js  
   Cleaner code, uses shared helpers

✅ app/api/store/orders/route.js
   Auto-fetches live Delhivery data for seller

✅ app/store/orders/page.jsx
   Shows live tracking in seller dashboard

✅ app/dashboard/orders/page.jsx
   Shows live tracking & timeline for customers

📄 DELHIVERY_INTEGRATION_GUIDE.md
   Complete documentation (you're reading this!)

📄 DELHIVERY_CHECKLIST.md
   Step-by-step setup & testing guide
```

---

## 💡 Key Concepts

| Term | Meaning |
|------|---------|
| **AWB** | Airway Bill (tracking number from Delhivery) |
| **Waybill** | Same as AWB |
| **Status** | Current state (e.g., OUT_FOR_DELIVERY) |
| **Scan** | Location update with timestamp |
| **Enrichment** | Adding live Delhivery data to order |

---

## 📈 What Happens Next

1. ✅ Customer orders product
2. ✅ Seller ships via Delhivery
3. ✅ Seller adds AWB to order in dashboard
4. ✅ Customer sees live tracking immediately
5. ✅ Delhivery updates every 2-4 hours
6. ✅ Customer sees package delivered

---

## 🎨 UI Features

### For Customers
- 📍 Current location display
- 📅 Expected delivery date
- ⏱️ Timestamps for each event
- 🔗 Direct link to Delhivery website
- 📜 Complete event history
- 🔍 Search by phone or AWB

### For Sellers
- 📊 Live status dashboard
- 📝 Manual tracking entry
- 📢 One-click notifications
- 📋 Event timeline
- 🔄 Auto-refresh on page load

---

## 🔐 Security

✅ API token is server-side only  
✅ Never exposed to browser  
✅ Firebase auth protects seller dashboard  
✅ Customers can only see their orders  

---

## 📞 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No live data | Check API token is set, refresh page |
| Wrong AWB | Verify the number, try Delhivery website |
| Slow loading | Normal (1-5s for first Delhivery call) |
| API error | Delhivery might be down, try later |
| Can't find order | Make sure it has tracking ID set |

---

## 🚀 Next Steps (Optional)

Want to go further? See [DELHIVERY_INTEGRATION_GUIDE.md](./DELHIVERY_INTEGRATION_GUIDE.md) for:

- ✅ Webhook integration (auto-update status)
- ✅ Return shipping (track returns)  
- ✅ Auto status sync (DELIVERED)
- ✅ Analytics dashboard
- ✅ SMS/WhatsApp notifications

---

## 🎓 Learning Resources

- **Track Order Page** → Shows customer perspective
- **Store Orders Page** → Shows seller perspective  
- **Dashboard Orders** → Shows customer order history
- **API Documentation** → See integration guide
- **Code** → Check specific file comments

---

## ✨ That's It!

You now have:
- ✅ Live order tracking for customers
- ✅ Automatic Delhivery status for sellers
- ✅ Timeline of shipment events
- ✅ Expected delivery dates
- ✅ Error handling & fallbacks

**Status:** 🟢 Ready to use  
**Setup Time:** 5 minutes  
**Maintenance:** Minimal (token + monitoring)

---

**Questions?** Check [DELHIVERY_INTEGRATION_GUIDE.md](./DELHIVERY_INTEGRATION_GUIDE.md) for detailed docs.
