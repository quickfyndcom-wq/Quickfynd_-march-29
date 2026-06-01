# 🎯 Customer Dashboard - Complete Developer Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Dashboard Architecture](#dashboard-architecture)
3. [All Features & APIs](#all-features--apis)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Authentication](#authentication)
6. [Database Models](#database-models)
7. [Integration Guide](#integration-guide)

---

## 🌟 Overview

The Customer Dashboard is a comprehensive user portal that provides customers with complete control over their account, orders, wishlist, wallet, and support tickets. It's built with Next.js 14, Firebase Authentication, and MongoDB.

**Access URL:** `/dashboard/*`

**Key Technologies:**
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Authentication:** Firebase Auth
- **Backend:** Next.js API Routes
- **Database:** MongoDB with Mongoose
- **State Management:** Redux Toolkit (for cart)

---

## 🏗️ Dashboard Architecture

### Main Routes Structure
```
/dashboard
  ├── /profile         → User profile & addresses management
  ├── /orders          → Order history & tracking
  ├── /wishlist        → Saved/favorite products
  └── /tickets         → Support ticket system

/browse-history        → Recently viewed products
/wallet                → Wallet & transaction history
/settings              → Account settings
/track-order           → Public order tracking (by phone/AWB)
```

### Shared Components
- **DashboardSidebar** (`/components/DashboardSidebar.jsx`)
  - Navigation menu for all dashboard sections
  - Responsive mobile/desktop design
  - Active route highlighting

---

## 🎯 All Features & APIs

### 1️⃣ **Profile Management** (`/dashboard/profile`)

#### Features:
- ✅ View and edit user profile information
- ✅ Upload/update profile photo
- ✅ Manage multiple delivery addresses
- ✅ Add, edit, delete addresses
- ✅ View account creation date and UID
- ✅ Display email and phone information

#### API Endpoints:

**GET** `/api/user` - Get current user details
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  user: {
    _id: string,
    name: string,
    email: string,
    image: string,
    phoneNumber: string,
    createdAt: date,
    uid: string
  }
}
```

**GET** `/api/address` - Get user addresses
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  addresses: [{
    _id: string,
    userId: string,
    name: string,
    phone: string,
    address: string,
    city: string,
    state: string,
    pincode: string,
    country: string,
    isDefault: boolean
  }]
}
```

**POST** `/api/address` - Add new address
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  name: string,
  phone: string,
  address: string,
  city: string,
  state: string,
  pincode: string,
  country: string,
  isDefault: boolean
}
```

**PUT** `/api/address/[id]` - Update address
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: { ...address fields }
```

**DELETE** `/api/address/[id]` - Delete address
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
```

**POST** `/api/upload` - Upload profile image
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: FormData with image file
Response: { url: string }
```

---

### 2️⃣ **Orders Management** (`/dashboard/orders`)

#### Features:
- ✅ View complete order history
- ✅ Filter orders by status (All, Processing, Shipped, Delivered, etc.)
- ✅ Real-time Delhivery shipment tracking
- ✅ View order details (products, pricing, address)
- ✅ Expandable order cards with full information
- ✅ Order timeline with status updates
- ✅ Return/Refund request submission
- ✅ Upload return evidence (images)
- ✅ Cancel orders (if not shipped)
- ✅ Download invoices

#### Order Status Flow:
```
PENDING → CONFIRMED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
                   ↓
              CANCELLED
                   ↓
         RETURN_REQUESTED → RETURNED/REFUNDED
```

#### API Endpoints:

**GET** `/api/orders` - Get user's orders
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  orders: [{
    _id: string,
    orderId: string,
    userId: string,
    orderItems: [{
      productId: {
        _id: string,
        name: string,
        image: string,
        price: number
      },
      quantity: number,
      price: number,
      variant: object
    }],
    total: number,
    subtotal: number,
    shippingAddress: object,
    billingAddress: object,
    status: string,
    paymentMethod: string,
    createdAt: date,
    deliveredAt: date,
    trackingNumber: string,
    shippingProvider: string,
    delhiveryTracking: {
      status: string,
      currentLocation: string,
      expectedDelivery: date,
      timeline: array
    }
  }]
}
```

**GET** `/api/orders/[orderId]` - Get single order details
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: { order: {...} }
```

**POST** `/api/return-request` - Submit return/refund request
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  orderId: string,
  type: "RETURN" | "REFUND",
  reason: string,
  description: string,
  images: [string] // uploaded image URLs
}
Response: { success: true, returnRequest: {...} }
```

**GET** `/api/track-order` - Public order tracking
```javascript
Query: ?phone=<phone> OR ?awb=<tracking-number>
Response: {
  order: {...},
  delhiveryTracking: {
    status: string,
    currentLocation: string,
    expectedDelivery: date,
    timeline: [{
      status: string,
      location: string,
      timestamp: date,
      remarks: string
    }]
  }
}
```

---

### 3️⃣ **Wishlist** (`/dashboard/wishlist`)

#### Features:
- ✅ Save products to wishlist
- ✅ View all wishlist items
- ✅ Multi-select products
- ✅ Bulk add to cart
- ✅ Remove items from wishlist
- ✅ View product ratings and prices
- ✅ Calculate total value of selected items
- ✅ Guest wishlist support (localStorage)

#### API Endpoints:

**GET** `/api/wishlist` - Get user's wishlist
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  wishlist: [{
    _id: string,
    userId: string,
    productId: string,
    product: {
      _id: string,
      name: string,
      price: number,
      image: string,
      rating: number,
      inStock: boolean
    },
    createdAt: date
  }]
}
```

**POST** `/api/wishlist` - Add product to wishlist
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  productId: string
}
Response: { success: true, wishlist: [...] }
```

**DELETE** `/api/wishlist/[productId]` - Remove from wishlist
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: { success: true }
```

---

### 4️⃣ **Wallet System** (`/wallet`)

#### Features:
- ✅ View wallet balance (coins & rupees value)
- ✅ Transaction history with details
- ✅ Earn coins on orders (cashback)
- ✅ Use wallet balance at checkout
- ✅ Automatic bonus coins for new signups
- ✅ Transaction types: CREDIT, DEBIT, REFUND, BONUS
- ✅ Real-time balance updates
- ✅ 1 Coin = ₹1 conversion

#### API Endpoints:

**GET** `/api/wallet` - Get wallet details
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  coins: number,
  rupeesValue: number,
  transactions: [{
    _id: string,
    type: "CREDIT" | "DEBIT" | "REFUND" | "BONUS",
    amount: number,
    description: string,
    orderId: string,
    createdAt: date
  }]
}
```

**POST** `/api/wallet/bonus` - Add bonus coins (internal use)
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  userId: string,
  amount: number,
  description: string
}
```

---

### 5️⃣ **Browse History** (`/browse-history`)

#### Features:
- ✅ Track recently viewed products
- ✅ View browsing history
- ✅ Clear entire history
- ✅ Quick access to previously viewed items
- ✅ Automatic tracking on product views
- ✅ Firebase authenticated users only

#### API Endpoints:

**GET** `/api/browse-history` - Get user's browse history
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  history: [{
    _id: string,
    userId: string,
    productId: string,
    product: {
      _id: string,
      name: string,
      price: number,
      image: string,
      rating: number
    },
    viewedAt: date
  }]
}
```

**POST** `/api/browse-history` - Add product to history
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  productId: string
}
```

**DELETE** `/api/browse-history` - Clear all history
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: { success: true }
```

---

### 6️⃣ **Support Tickets** (`/dashboard/tickets`)

#### Features:
- ✅ Create support tickets
- ✅ View all tickets (open/closed)
- ✅ Filter by status
- ✅ Add messages to tickets
- ✅ Seller responses visible
- ✅ Status indicators (Open, In Progress, Closed)
- ✅ Email notifications on updates
- ✅ Ticket priority levels

#### API Endpoints:

**GET** `/api/tickets` - Get user's tickets
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: {
  tickets: [{
    _id: string,
    ticketNumber: string,
    userId: string,
    subject: string,
    category: string,
    priority: "LOW" | "MEDIUM" | "HIGH",
    status: "OPEN" | "IN_PROGRESS" | "CLOSED",
    messages: [{
      sender: string,
      senderType: "CUSTOMER" | "SELLER",
      message: string,
      timestamp: date
    }],
    createdAt: date,
    updatedAt: date
  }]
}
```

**POST** `/api/tickets` - Create new ticket
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  subject: string,
  category: string,
  priority: string,
  message: string,
  orderId?: string
}
```

**GET** `/api/tickets/[ticketId]` - Get single ticket
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Response: { ticket: {...} }
```

**POST** `/api/tickets/[ticketId]` - Add message to ticket
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  message: string
}
```

**PATCH** `/api/tickets/[ticketId]` - Update ticket status
```javascript
Headers: { Authorization: "Bearer <firebase-token>" }
Body: {
  status: "OPEN" | "IN_PROGRESS" | "CLOSED"
}
```

---

### 7️⃣ **Order Tracking** (`/track-order`)

#### Features:
- ✅ Public order tracking (no login required)
- ✅ Track by phone number OR AWB/tracking number
- ✅ Real-time Delhivery integration
- ✅ View shipment timeline
- ✅ Expected delivery date
- ✅ Current package location
- ✅ Direct link to courier website
- ✅ Status badges with visual indicators

#### API Endpoints:

**GET** `/api/track-order?phone=<phone>` - Track by phone
```javascript
Query: phone=<phone-number>
Response: {
  orders: [{...order details with tracking}]
}
```

**GET** `/api/track-order?awb=<tracking>` - Track by AWB
```javascript
Query: awb=<tracking-number>
Response: {
  order: {...},
  delhiveryTracking: {
    waybill: string,
    status: string,
    currentLocation: string,
    origin: string,
    destination: string,
    expectedDelivery: date,
    scans: [{
      location: string,
      status: string,
      time: date,
      instructions: string
    }]
  }
}
```

---

### 8️⃣ **Account Settings** (`/settings`)

#### Features:
- ✅ Email notification preferences
- ✅ Privacy settings
- ✅ Account security options
- ✅ Delete account option
- ✅ Export user data
- ✅ Change password (for email/password users)

---

## 🔐 Authentication

All customer dashboard endpoints require Firebase Authentication.

### Authentication Flow:
1. User signs in via Firebase (Google, Email, Phone)
2. Frontend gets Firebase ID token
3. Token sent in Authorization header
4. Backend verifies token with Firebase Admin SDK
5. User ID extracted from verified token

### Code Example:
```javascript
// Frontend - Getting token
import { auth } from '@/lib/firebase';
const token = await auth.currentUser.getIdToken(true);

// Making authenticated request
const response = await axios.get('/api/orders', {
  headers: { Authorization: `Bearer ${token}` }
});

// Backend - Verifying token
import { getAuth } from '@/lib/firebase-admin';

const authHeader = request.headers.get('authorization');
const idToken = authHeader.split('Bearer ')[1];
const decodedToken = await getAuth().verifyIdToken(idToken);
const userId = decodedToken.uid;
```

---

## 🗄️ Database Models

### User Model
```javascript
{
  _id: ObjectId,
  uid: String,           // Firebase UID
  name: String,
  email: String,
  image: String,
  phoneNumber: String,
  role: String,          // 'customer', 'seller', 'admin'
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model
```javascript
{
  _id: ObjectId,
  orderId: String,
  userId: String,        // Firebase UID
  guestEmail: String,    // For guest orders
  guestName: String,
  storeId: String,
  orderItems: [{
    productId: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    variant: Object
  }],
  subtotal: Number,
  shippingCost: Number,
  tax: Number,
  discount: Number,
  total: Number,
  couponCode: String,
  walletUsed: Number,
  paymentMethod: String,
  paymentStatus: String,
  status: String,
  shippingAddress: Object,
  billingAddress: Object,
  trackingNumber: String,
  shippingProvider: String,
  notes: String,
  createdAt: Date,
  deliveredAt: Date
}
```

### Wishlist Model
```javascript
{
  _id: ObjectId,
  userId: String,
  productId: ObjectId,
  createdAt: Date
}
```

### Wallet Model
```javascript
{
  _id: ObjectId,
  userId: String,
  coins: Number,
  transactions: [{
    type: String,        // CREDIT, DEBIT, REFUND, BONUS
    amount: Number,
    description: String,
    orderId: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Address Model
```javascript
{
  _id: ObjectId,
  userId: String,
  name: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
  isDefault: Boolean,
  createdAt: Date
}
```

### BrowseHistory Model
```javascript
{
  _id: ObjectId,
  userId: String,
  productId: ObjectId,
  viewedAt: Date
}
```

### Ticket Model
```javascript
{
  _id: ObjectId,
  ticketNumber: String,
  userId: String,
  storeId: String,
  subject: String,
  category: String,
  priority: String,
  status: String,
  orderId: String,
  messages: [{
    sender: String,
    senderType: String,
    message: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛠️ Integration Guide

### For New Developers:

#### 1. **Setting Up Local Environment**
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Required ENV variables:
MONGODB_URI=<your-mongodb-uri>
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-key>
FIREBASE_ADMIN_PROJECT_ID=<project-id>
# ... other Firebase credentials
```

#### 2. **Understanding the Flow**
```
User Login (Firebase Auth)
    ↓
Get Firebase Token
    ↓
Make API Request with Token
    ↓
Backend Verifies Token
    ↓
Access MongoDB Data
    ↓
Return Response to Frontend
```

#### 3. **Adding New Dashboard Feature**

**Step 1:** Create page in `/app/dashboard/[feature]/page.jsx`
```javascript
'use client'
import { useAuth } from '@/lib/useAuth'
import DashboardSidebar from '@/components/DashboardSidebar'

export default function NewFeaturePage() {
  const { user, getToken } = useAuth()
  // Your component logic
}
```

**Step 2:** Create API route in `/app/api/[feature]/route.js`
```javascript
import { getAuth } from '@/lib/firebase-admin'
import connectDB from '@/lib/mongodb'

export async function GET(request) {
  // Verify auth
  const authHeader = request.headers.get('authorization')
  const token = authHeader.split('Bearer ')[1]
  const { uid } = await getAuth().verifyIdToken(token)
  
  // Database operations
  await connectDB()
  // ... your logic
  
  return NextResponse.json({ data: '...' })
}
```

**Step 3:** Add to DashboardSidebar navigation
```javascript
// components/DashboardSidebar.jsx
const menuItems = [
  // ... existing items
  { label: 'New Feature', href: '/dashboard/new-feature' }
]
```

#### 4. **Testing Dashboard Features**
```bash
# Run development server
npm run dev

# Test authenticated endpoints
# Use Postman/Thunder Client with Bearer token

# Check database
# Use MongoDB Compass to view collections
```

---

## 📊 Key Metrics Tracked

- Total orders per user
- Total amount spent
- Wallet balance & usage
- Wishlist items count
- Browse history entries
- Support tickets (open/closed)
- Average order value
- Return/refund requests

---

## 🚀 Performance Optimization

1. **Lazy Loading:** Components load on-demand
2. **Image Optimization:** Next.js Image component
3. **API Caching:** React Query for data fetching
4. **MongoDB Indexes:** On userId, orderId, productId
5. **Firebase Token Caching:** Reduce auth calls

---

## 🔒 Security Features

- ✅ Firebase Authentication required
- ✅ Token verification on every API call
- ✅ User data isolation (userId filtering)
- ✅ HTTPS only in production
- ✅ No sensitive data in URLs
- ✅ SQL injection prevention (Mongoose)
- ✅ XSS protection (React escaping)

---

## 📱 Responsive Design

All dashboard pages are fully responsive:
- **Mobile:** Single column, hamburger menu
- **Tablet:** 2-column grid
- **Desktop:** Sidebar + main content layout

---

## 🎨 UI/UX Highlights

- Clean, modern interface
- Intuitive navigation
- Loading states & skeletons
- Error handling with toast notifications
- Empty states with call-to-action
- Color-coded status badges
- Interactive animations
- Accessible design (WCAG compliant)

---

## 📞 Support & Troubleshooting

### Common Issues:

**1. Token Expired Error**
- Solution: Call `getIdToken(true)` to force refresh

**2. Orders Not Loading**
- Check Firebase Auth state
- Verify MongoDB connection
- Check userId matches

**3. Wishlist Not Syncing**
- For logged-in users: Check API endpoint
- For guests: Check localStorage

---

## 🔄 Future Enhancements

- [ ] Order notifications (push/email)
- [ ] Subscription management
- [ ] Loyalty points program
- [ ] Social sharing features
- [ ] Product reviews in dashboard
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode toggle

---

## 📄 API Response Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | Success | Data retrieved successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## 📝 Code Examples

### Fetching Orders
```javascript
const fetchOrders = async () => {
  try {
    const token = await auth.currentUser.getIdToken(true)
    const { data } = await axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    })
    setOrders(data.orders)
  } catch (error) {
    console.error('Error:', error)
    toast.error('Failed to load orders')
  }
}
```

### Adding to Wishlist
```javascript
const addToWishlist = async (productId) => {
  try {
    const token = await auth.currentUser.getIdToken(true)
    await axios.post('/api/wishlist', 
      { productId },
      { headers: { Authorization: `Bearer ${token}` }}
    )
    toast.success('Added to wishlist!')
  } catch (error) {
    toast.error('Failed to add to wishlist')
  }
}
```

### Using Wallet Balance
```javascript
const applyWallet = async (amount) => {
  try {
    const token = await auth.currentUser.getIdToken(true)
    const { data } = await axios.post('/api/wallet/deduct',
      { amount },
      { headers: { Authorization: `Bearer ${token}` }}
    )
    return data.newBalance
  } catch (error) {
    throw new Error('Failed to apply wallet balance')
  }
}
```

---

## 🎓 Quick Start Checklist

- [ ] Understand authentication flow
- [ ] Review database models
- [ ] Test API endpoints with Postman
- [ ] Run project locally
- [ ] Navigate through all dashboard pages
- [ ] Check responsive design on mobile
- [ ] Review error handling
- [ ] Test with different user accounts
- [ ] Read related documentation files
- [ ] Set up development environment

---

## 📚 Related Documentation Files

- `CART_IMPLEMENTATION_GUIDE.md` - Cart system details
- `COUPON_SYSTEM_FINAL_GUIDE.md` - Coupon functionality
- `DELHIVERY_COMPLETE.md` - Shipping integration
- `EMAIL_NOTIFICATIONS.md` - Email system
- `PRODUCT_VARIANTS_GUIDE.md` - Product variants

---

## 💡 Tips for Developers

1. **Always verify Firebase token** on backend
2. **Use error boundaries** for React components
3. **Implement loading states** for better UX
4. **Test with guest and authenticated users**
5. **Follow existing code patterns** for consistency
6. **Add proper TypeScript types** (if applicable)
7. **Document new API endpoints** immediately
8. **Test on multiple devices** before deploying

---

## ✅ Testing Checklist

### Profile
- [ ] View profile information
- [ ] Edit name and details
- [ ] Upload profile photo
- [ ] Add new address
- [ ] Edit existing address
- [ ] Delete address
- [ ] Set default address

### Orders
- [ ] View all orders
- [ ] Filter by status
- [ ] Expand order details
- [ ] Track shipment
- [ ] Request return/refund
- [ ] Upload return images
- [ ] View order timeline

### Wishlist
- [ ] Add items to wishlist
- [ ] Remove items
- [ ] Multi-select items
- [ ] Bulk add to cart
- [ ] View product details

### Wallet
- [ ] View balance
- [ ] Check transaction history
- [ ] Receive bonus coins
- [ ] Use wallet at checkout

### Support
- [ ] Create ticket
- [ ] View all tickets
- [ ] Add message to ticket
- [ ] Filter tickets
- [ ] Receive email notifications

---

## 🌐 Environment Variables Required

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Other
NEXT_PUBLIC_CURRENCY_SYMBOL=₹
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

**Created:** February 3, 2026  
**Version:** 1.0  
**Maintained by:** Development Team  

---

*For any questions or clarifications, please reach out to the development team or create a support ticket in the system.*
