# Delhivery Integration Guide

## Overview

This guide explains how **Delhivery courier tracking** has been integrated throughout your QuickFynd application. Customers can now see live shipment updates, and sellers can manage tracking information for all orders.

---

## ✅ What's Been Integrated

### 1. **Shared Delhivery Helpers** (`lib/delhivery.js`)

Two new helper functions have been added for consistent Delhivery API usage across your app:

```javascript
// Fetch and normalize Delhivery tracking in one call
await fetchNormalizedDelhiveryTracking(waybill)

// Normalize Delhivery API response to consistent format
normalizeDelhiveryShipment(payload, fallbackWaybill)
```

**Benefits:**
- Single source of truth for Delhivery data format
- Reduced code duplication
- Easy to maintain and update

---

## 🎯 Features By Page/Role

### **For Customers** (Tracking & Order Pages)

#### 1. **Track Order Page** (`/track-order`)
- Enter phone number or AWB number to track any order
- See live Delhivery status updates
- View complete shipment timeline with locations and timestamps
- Expected delivery date
- Direct link to track on Delhivery website

**Delhivery Data Shown:**
```
✓ Current Status (e.g., "OUT_FOR_DELIVERY")
✓ Current Location (Last scanning location)
✓ Expected Delivery Date
✓ Complete Event Timeline (all scans & updates)
✓ Origin & Destination Details
```

#### 2. **Customer Dashboard - My Orders** (`/dashboard/orders`)
- View all your orders with tracking info
- See live Delhivery status inline for each order
- View shipment timeline for active orders
- Click to see complete timeline

**Example:**
```
Order #12345
Courier: Delhivery
Tracking ID: 7847593847
Status: OUT_FOR_DELIVERY
Location: Delhi Hub
Expected Delivery: Jan 15, 2026

[Shipment Timeline]
- OUT_FOR_DELIVERY at Delhi Hub (Jan 12, 5:30 PM)
- PICKED_UP at Warehouse (Jan 12, 2:15 PM)
- CONFIRMED at Origin (Jan 11, 6:00 PM)
```

---

### **For Sellers** (Store Dashboard)

#### **Store Orders Page** (`/store/orders`)

Sellers can now see live Delhivery tracking for their orders:

**Tracking Information Section:**
- **Current Status**: Live status from Delhivery
- **Current Location**: Last scanning location
- **Expected Delivery**: When package will arrive
- **Status Timeline**: Recent shipment updates (last 5 events)
- **Manual Input**: Option to update tracking details

**How to Use:**
1. Open an order from the orders list
2. Scroll to "Tracking Information" section
3. See live Delhivery data (if already shipped)
4. Manually enter tracking details if needed
5. Click "Update Tracking & Notify Customer" to send notification

---

## 🔧 Technical Implementation

### **API Enhancements**

#### 1. **Track Order API** (`/api/track-order`)
```javascript
GET /api/track-order?phone=+919876543210
GET /api/track-order?awb=7847593847
GET /api/track-order?awb=7847593847&carrier=delhivery
```

**What Changed:**
- Now uses shared `fetchNormalizedDelhiveryTracking()` helper
- Reduced code duplication (removed duplicate normalization logic)
- Returns consistent `order` object with `delhivery` field

**Response Format:**
```json
{
  "success": true,
  "order": {
    "_id": "...",
    "status": "SHIPPED",
    "trackingId": "7847593847",
    "courier": "Delhivery",
    "trackingUrl": "https://www.delhivery.com/track/package/7847593847",
    "delhivery": {
      "waybill": "7847593847",
      "current_status": "OUT_FOR_DELIVERY",
      "current_status_time": "2026-01-12T17:30:00Z",
      "current_status_location": "Delhi Hub",
      "expected_delivery_date": "2026-01-15",
      "origin": "Bangalore",
      "destination": "Delhi",
      "events": [
        {
          "time": "2026-01-12T17:30:00Z",
          "status": "OUT_FOR_DELIVERY",
          "location": "Delhi Hub",
          "remarks": "Package out for delivery"
        },
        // ... more events
      ]
    },
    "orderItems": [...],
    "total": 5000
  }
}
```

#### 2. **Store Orders API** (`/api/store/orders`)
```javascript
GET /api/store/orders              // Default: includes live Delhivery data
GET /api/store/orders?withDelhivery=false  // Skip live data fetch
```

**New Features:**
- Automatically fetches live Delhivery tracking for active orders
- Only fetches for orders with:
  - Active status (not DELIVERED/CANCELLED/RETURNED)
  - Existing tracking ID
  - Delhivery courier or missing tracking URL
- Enriches order with `delhivery` field

**Performance:**
- Uses `Promise.all()` for parallel fetching
- Graceful error handling (fails silently if Delhivery API unavailable)

---

### **Database Fields** (Order Model)

Existing fields used:
```javascript
trackingId:  String      // AWB number (indexed for fast lookup)
courier:     String      // e.g., "Delhivery", "FedEx"
trackingUrl: String      // Link to track on courier website
status:      String      // Order status (ORDER_PLACED, SHIPPED, etc.)

// NEW - added by API responses (not stored in DB)
delhivery: {
  waybill: String,
  current_status: String,
  current_status_time: String,
  current_status_location: String,
  expected_delivery_date: String,
  origin: String,
  destination: String,
  events: Array<{
    time: String,
    status: String,
    location: String,
    remarks: String
  }>
}
```

---

## 🚀 Setup & Configuration

### **Required Environment Variables**
```
DELHIVERY_API_TOKEN=your_delhivery_api_token_here
```

### **How to Get Delhivery API Token:**
1. Go to [Delhivery Partner Portal](https://track.delhivery.com/)
2. Login to your account
3. Go to API Settings
4. Generate API Token
5. Add to `.env.local`

### **API Endpoints Used:**
```
GET https://track.delhivery.com/api/v1/packages/json/?waybill={waybill}
```

---

## 📱 User Workflows

### **Customer Tracking Workflow**

```
Customer searches order → Track Order page
                          ↓
                    Enter Phone or AWB
                          ↓
                    Fetch from /api/track-order
                          ↓
                    Show live status + timeline
                          ↓
                    Customer can:
                    - See expected delivery
                    - View all updates
                    - Click to Delhivery website
```

### **Seller Order Management Workflow**

```
Seller views orders → Store Orders page
                      ↓
              Click order to open modal
                      ↓
            See Tracking Information section
                      ↓
            View live Delhivery status
            (auto-fetched from API)
                      ↓
            Option to:
            - Update tracking manually
            - Notify customer
            - View shipment timeline
```

---

## 🔄 Live Updates Flow

### **Customer Views Tracking**

```
Customer Page → Fetch /api/track-order
    ↓
    └─→ Check DB for order
    └─→ If Delhivery tracking exists:
        └─→ Call Delhivery API for live data
        └─→ Merge with order data
        └─→ Return to customer
```

### **Seller Views Orders**

```
Seller Page → Fetch /api/store/orders?withDelhivery=true
    ↓
    └─→ Get all seller's orders
    └─→ For each active order with tracking:
        └─→ Call Delhivery API in parallel
        └─→ Enrich order with live data
        └─→ Return enriched orders
```

---

## 🐛 Testing

### **Test Cases**

#### 1. **Track by AWB Number**
```
PUT /track-order?awb=1234567890
Expected: Returns order with Delhivery data
```

#### 2. **Track by Phone Number**
```
GET /track-order?phone=+919876543210
Expected: Returns order with Delhivery data
```

#### 3. **View Store Orders with Live Tracking**
```
GET /api/store/orders
Expected: All orders enriched with live Delhivery status
```

#### 4. **View Customer Orders with Live Tracking**
```
GET /dashboard/orders (logged in)
Expected: All orders show live tracking timeline
```

---

## ⚠️ Error Handling

### **If Delhivery API is Down:**
- ✅ Orders still load normally
- ✅ Old tracking data still shown
- ✅ Live updates skipped gracefully
- ✅ Customer still sees manual tracking info

### **If API Token is Missing:**
- ✅ Tracking pages still work
- ✅ Manual tracking entry works
- ✅ Live Delhivery data unavailable (returns error 503)

---

## 📊 Delhivery Status Codes

Common Delhivery statuses your app will display:

| Status | Meaning |
|--------|---------|
| ORDER_PLACED | Order created |
| CONFIRMED | Order confirmed |
| PROCESSING | Being processed |
| PICKUP_REQUESTED | Pickup scheduled |
| WAITING_FOR_PICKUP | Waiting for pickup |
| PICKED_UP | Picked from seller |
| WAREHOUSE_RECEIVED | Received at warehouse |
| SHIPPED | In transit |
| OUT_FOR_DELIVERY | Out for delivery today |
| DELIVERED | Successfully delivered |
| RETURN_REQUESTED | Return requested |
| RETURNED | Returned to seller |
| CANCELLED | Order cancelled |

---

## 🎨 UI Components

### **Tracking Information Card** (Seller)
- Displays current status
- Shows current location
- Lists recent updates
- Option to manually update

### **Shipment Timeline** (Customer)
- Chronological list of events
- Location for each update
- Timestamp for each scan
- Remarks/instructions

### **Live Status Badge** (Customer Dashboard)
- Shows current Delhivery status
- Expected delivery date
- Quick link to track

---

## 🔐 Security Notes

- ✅ API Token stored in server-side `.env.local`
- ✅ Never exposed to client
- ✅ Firebase auth required for seller dashboard
- ✅ Customers can only see their own orders
- ✅ Track-order endpoint has fallback to manual input

---

## 📝 Checklist Before Going Live

- [ ] Add `DELHIVERY_API_TOKEN` to `.env.local` and production environment
- [ ] Test tracking with real AWB numbers
- [ ] Verify customers see live updates
- [ ] Confirm sellers see Delhivery status
- [ ] Test error scenarios (API down, invalid AWB)
- [ ] Add Delhivery logo/branding if needed
- [ ] Update help/FAQ pages with tracking info
- [ ] Send test emails with tracking links

---

## 🔄 Future Enhancements

Consider these improvements:

1. **Auto-Update Order Status**
   - When Delhivery shows "DELIVERED", auto-update order status
   - Webhook integration for real-time updates

2. **Webhook Notifications**
   - Subscribe to Delhivery webhooks
   - Automatic status sync

3. **Return Shipping**
   - Create return shipments via Delhivery API
   - Track return packages

4. **Pickup Scheduling**
   - Let sellers schedule pickups via API
   - Auto-update pickup status

5. **Analytics Dashboard**
   - Track delivery times
   - Identify problematic routes
   - Performance metrics by location

---

## 📞 Support & Troubleshooting

### **Common Issues**

**Q: Orders not showing Delhivery tracking**
A: Ensure `trackingId` and `courier` fields are set in order

**Q: "API token not configured" error**
A: Add `DELHIVERY_API_TOKEN` to `.env.local`

**Q: Live tracking not updating**
A: Delhivery updates every 2-4 hours; check Delhivery website directly

**Q: High API usage**
A: Add caching layer or fetch only for non-delivered orders

---

## 📚 Related Files

- `lib/delhivery.js` - Core Delhivery helpers
- `app/api/track-order/route.js` - Tracking API
- `app/api/store/orders/route.js` - Store orders with enrichment
- `app/track-order/page.jsx` - Customer tracking page
- `app/dashboard/orders/page.jsx` - Customer orders dashboard
- `app/store/orders/page.jsx` - Seller orders dashboard
- `models/Order.js` - Order schema

---

## 🎓 Key Concepts

**Waybill / AWB**: Unique tracking number assigned by Delhivery (e.g., `7847593847`)

**Shipment Status**: Current state of package (e.g., OUT_FOR_DELIVERY)

**Scan Event**: Each location update with timestamp (e.g., "Picked up at warehouse")

**Enrichment**: Adding live Delhivery data to stored order before returning to user

**Fallback**: Using Delhivery API directly if no order found in database

---

**Last Updated:** January 12, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
