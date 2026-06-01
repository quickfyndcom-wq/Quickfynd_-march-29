# QuickFynd Backend API Documentation
**Version 1.0** | **Last Updated:** February 5, 2026

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Database Models](#database-models)
4. [API Endpoints](#api-endpoints)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)

---

## Overview

**QuickFynd** is a full-stack e-commerce platform built with:
- **Frontend:** Next.js 15 (React 19)
- **Backend:** Next.js API Routes
- **Database:** MongoDB
- **Authentication:** Firebase
- **Storage:** ImageKit, Stripe, Razorpay, Delhivery

**Key Features:**
- Multi-store marketplace
- Product management with variants
- Order processing & tracking
- Payment integration (Stripe, Razorpay)
- Shipping integration (Delhivery)
- Coupon & deal management
- Email notifications
- Review & rating system
- Wishlist functionality
- Wallet system

---

## Authentication

### Firebase Authentication
- All protected endpoints require Firebase ID token
- Token passed in `Authorization` header: `Bearer <token>`
- Token verification done via `getAuth().verifyIdToken(token)`

### Admin Endpoints
- Admin emails defined in `.env.local` as `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin check: `adminEmails.includes(user.email)`

### Middleware
- Located in `/middlewares/`
- `authAdmin.js` - Validates admin users
- Firebase Admin SDK for server-side auth

---

## Database Models

### 1. **User** (`/models/User.js`)
User account information and profile

```javascript
{
  firebaseId: String,
  email: String (unique),
  firstName: String,
  lastName: String,
  phone: String,
  avatar: String (image URL),
  role: String (user/seller/admin),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **Product** (`/models/Product.js`)
Product listings and details

```javascript
{
  name: String (required),
  slug: String (unique),
  description: String,
  shortDescription: String,
  mrp: Number,
  price: Number,
  images: [String],
  category: String,
  categories: [String], // Multiple categories
  sku: String,
  inStock: Boolean,
  stockQuantity: Number,
  hasVariants: Boolean,
  variants: Array,
  attributes: Object,
  hasBulkPricing: Boolean,
  bulkPricing: Array,
  fastDelivery: Boolean,
  allowReturn: Boolean,
  allowReplacement: Boolean,
  imageAspectRatio: String,
  storeId: String,
  tags: [String],
  enableFBT: Boolean, // Frequently Bought Together
  fbtProductIds: [String],
  fbtBundlePrice: Number,
  fbtBundleDiscount: Number,
  timestamps: { createdAt, updatedAt }
}
```

### 3. **Category** (`/models/Category.js`)
Product categories with hierarchical support

```javascript
{
  name: String,
  slug: String,
  description: String,
  image: String,
  parentId: ObjectId, // For nested categories
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **Order** (`/models/Order.js`)
Customer orders and transaction details

```javascript
{
  userId: String,
  storeId: String,
  items: [{
    productId: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  totalAmount: Number,
  tax: Number,
  shippingCost: Number,
  discountAmount: Number,
  couponCode: String,
  paymentMethod: String,
  paymentStatus: String (pending/completed/failed),
  orderStatus: String (pending/confirmed/shipped/delivered),
  shippingAddress: Address,
  billingAddress: Address,
  delhiveryAwb: String,
  trackingId: String,
  notes: String,
  timestamps: { createdAt, updatedAt }
}
```

### 5. **Coupon** (`/models/Coupon.js`)
Discount coupons and promotions

```javascript
{
  code: String (unique),
  description: String,
  discountType: String (percentage/fixed),
  discountValue: Number,
  maxDiscount: Number,
  minOrderValue: Number,
  maxUsagePerUser: Number,
  totalUsageLimit: Number,
  usedCount: Number,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  applicableCategories: [String],
  createdBy: String,
  timestamps: { createdAt, updatedAt }
}
```

### 6. **Cart** (Session-based - Not persisted)
Shopping cart items stored client-side with localStorage sync

### 7. **Address** (`/models/Address.js`)
User shipping and billing addresses

```javascript
{
  userId: String,
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  isDefault: Boolean,
  timestamps: { createdAt, updatedAt }
}
```

### 8. **Wallet** (`/models/Wallet.js`)
User wallet balance and transaction history

```javascript
{
  userId: String,
  balance: Number,
  transactions: [{
    type: String (credit/debit),
    amount: Number,
    description: String,
    orderId: String,
    date: Date
  }],
  timestamps: { createdAt, updatedAt }
}
```

### 9. **Rating & Review**
- **Rating** (`/models/Rating.js`) - Star ratings (1-5)
- **Review** (review system) - Text reviews and comments

### 10. **Store** (`/models/Store.js`)
Seller store information

```javascript
{
  storeId: String (seller's Firebase ID),
  storeName: String,
  storeDescription: String,
  storeImage: String,
  categories: [String],
  verified: Boolean,
  timestamps: { createdAt, updatedAt }
}
```

### 11. **StoreMenu** (`/models/StoreMenu.js`)
Custom category menu for store homepage

```javascript
{
  storeId: String,
  categories: [{
    name: String,
    image: String,
    url: String
  }],
  timestamps: { createdAt, updatedAt }
}
```

### 12. Additional Models
- **Ticket** - Customer support tickets
- **Deal** - Flash deals and promotions
- **BrowseHistory** - User product browsing history
- **WishlistItem** - Saved products
- **ReturnRequest** - Product returns
- **EmailTemplate** - Email notification templates
- **HomeCategorySettings** - Homepage category configuration

---

## API Endpoints

### **CATEGORIES** (`/api/categories/`)

#### GET `/api/categories`
Fetch all categories with children (public)

**Method:** `GET`
**Auth:** None
**Response:**
```json
{
  "categories": [
    {
      "_id": "...",
      "name": "Electronics",
      "slug": "electronics",
      "image": "...",
      "children": [
        {
          "_id": "...",
          "name": "Mobile Phones",
          "parentId": "...",
          "children": []
        }
      ]
    }
  ]
}
```

---

### **PRODUCTS** (`/api/products/`)

#### POST `/api/products`
Create new product

**Method:** `POST`
**Auth:** Required (Token)
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "name": "iPhone 15",
  "description": "Latest iPhone",
  "shortDescription": "Premium smartphone",
  "mrp": 99999,
  "price": 79999,
  "images": ["url1", "url2"],
  "category": "electronics",
  "sku": "IPHONE15-001",
  "inStock": true,
  "hasVariants": false,
  "fastDelivery": true,
  "allowReturn": true,
  "allowReplacement": true,
  "storeId": "seller123"
}
```
**Response:**
```json
{
  "product": {
    "_id": "...",
    "name": "iPhone 15",
    "slug": "iphone-15",
    ...
  }
}
```

#### GET `/api/products`
Fetch products with filters

**Method:** `GET`
**Auth:** None
**Query Parameters:**
- `category` - Filter by category
- `search` - Search by name/description
- `skip` - Pagination offset
- `limit` - Items per page
- `sortBy` - Sort field (price, name, etc.)
- `order` - Sort order (1 or -1)
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `inStock` - true/false

**Response:**
```json
{
  "products": [...],
  "total": 100,
  "skip": 0,
  "limit": 20
}
```

#### GET `/api/products/[id]`
Fetch single product details

**Response:**
```json
{
  "product": {
    "_id": "...",
    "name": "...",
    "price": "...",
    "ratings": 4.5,
    "reviews": [...]
  }
}
```

#### PUT `/api/products/[id]`
Update product

**Auth:** Required (Token)

#### DELETE `/api/products/[id]`
Delete product

**Auth:** Required (Admin/Seller)

---

### **ORDERS** (`/api/orders/`)

#### POST `/api/orders`
Create new order

**Method:** `POST`
**Auth:** Required
**Body:**
```json
{
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "price": 999
    }
  ],
  "totalAmount": 1998,
  "tax": 200,
  "shippingCost": 100,
  "paymentMethod": "stripe",
  "shippingAddress": {
    "firstName": "John",
    "street": "123 Main St",
    "city": "New York",
    "postalCode": "10001"
  },
  "couponCode": "SAVE10"
}
```
**Response:**
```json
{
  "order": {
    "_id": "...",
    "orderStatus": "pending",
    "paymentStatus": "pending",
    ...
  }
}
```

#### GET `/api/orders`
Fetch user orders

**Auth:** Required
**Query:**
- `skip`, `limit` - Pagination
- `status` - Filter by order status

#### GET `/api/orders/[id]`
Get order details

**Auth:** Required (Order owner or admin)

#### PUT `/api/orders/[id]`
Update order status

**Auth:** Required (Admin)
**Body:**
```json
{
  "orderStatus": "shipped",
  "paymentStatus": "completed"
}
```

---

### **CART** (`/api/cart/`)

**Note:** Cart is stored client-side in localStorage, synced with backend on order

---

### **ADDRESS** (`/api/address/`)

#### POST `/api/address`
Add new address

**Auth:** Required
**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "isDefault": true
}
```

#### GET `/api/address`
Get user addresses

**Auth:** Required

#### PUT `/api/address/[id]`
Update address

**Auth:** Required

#### DELETE `/api/address/[id]`
Delete address

**Auth:** Required

---

### **COUPON** (`/api/coupon/`)

#### POST `/api/coupon`
Create coupon (admin)

**Auth:** Required (Admin)
**Body:**
```json
{
  "code": "SAVE10",
  "description": "10% discount",
  "discountType": "percentage",
  "discountValue": 10,
  "maxDiscount": 500,
  "minOrderValue": 1000,
  "maxUsagePerUser": 1,
  "totalUsageLimit": 100,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "isActive": true
}
```

#### GET `/api/coupon`
List all coupons

#### POST `/api/coupon/validate`
Validate coupon for order

**Body:**
```json
{
  "code": "SAVE10",
  "cartTotal": 5000
}
```
**Response:**
```json
{
  "valid": true,
  "discountAmount": 500,
  "finalAmount": 4500
}
```

---

### **WISHLIST** (`/api/wishlist/`)

#### POST `/api/wishlist`
Add product to wishlist

**Auth:** Required
**Body:**
```json
{
  "productId": "..."
}
```

#### GET `/api/wishlist`
Get user wishlist

**Auth:** Required

#### DELETE `/api/wishlist/[id]`
Remove from wishlist

**Auth:** Required

---

### **WALLET** (`/api/wallet/`)

#### GET `/api/wallet`
Get wallet balance

**Auth:** Required

#### POST `/api/wallet/add`
Add funds to wallet (admin)

**Auth:** Required (Admin)
**Body:**
```json
{
  "userId": "...",
  "amount": 1000,
  "description": "Refund for order #123"
}
```

---

### **PAYMENT** 

#### **Stripe** (`/api/stripe/`)

**POST** Create payment intent
**Body:**
```json
{
  "amount": 5000,
  "currency": "inr",
  "metadata": {
    "orderId": "..."
  }
}
```

#### **Razorpay** (`/api/razorpay/`)

Order creation and webhook handling

---

### **SHIPPING** (`/api/shipping/`)

#### POST `/api/shipping`
Create shipping label (Delhivery)

**Auth:** Required
**Body:**
```json
{
  "orderId": "...",
  "awb": "...",
  "shippingAddress": {...}
}
```

#### GET `/api/track-order`
Track order shipment

**Query:**
- `orderId` or `awb` - Tracking identifier

---

### **REVIEW & RATING** (`/api/review/`, `/api/rating/`)

#### POST `/api/review`
Add product review

**Auth:** Required
**Body:**
```json
{
  "productId": "...",
  "orderId": "...",
  "title": "Great product!",
  "content": "Very satisfied with purchase",
  "rating": 5
}
```

#### GET `/api/review/[productId]`
Get product reviews

---

### **EMAIL** (`/api/send-*-email/`)

Triggered automatically on certain events:
- `send-welcome-email` - User registration
- `send-login-email` - Login
- `send-shipping-email` - Order shipped
- `send-signout-email` - Account logout

---

### **UPLOAD** (`/api/upload/`)

#### POST `/api/upload`
Upload image to ImageKit

**Auth:** Required
**Content-Type:** multipart/form-data
**Body:**
```
file: <binary>
```
**Response:**
```json
{
  "url": "https://imagekit.io/...",
  "fileId": "..."
}
```

---

### **STORE** (`/api/store/`)

#### GET `/api/store/categories`
Get store categories

#### POST `/api/store/category-menu`
Update custom category menu

**Auth:** Required (Seller)
**Body:**
```json
{
  "categories": [
    {
      "name": "Electronics",
      "image": "...",
      "url": "/shop?category=electronics"
    }
  ]
}
```

#### GET `/api/store/info`
Get store information

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB
- Firebase project
- ImageKit account
- Stripe account
- Razorpay account
- Delhivery account

### Installation Steps

```bash
# 1. Clone repository
git clone <repo-url>
cd quickfynd23.01

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Initialize database
npm run db:init

# 5. Run development server
npm run dev
```

The app will run on `http://localhost:3000`

---

## Environment Variables

Create `.env.local` in project root:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_SDK_KEY=

# MongoDB
MONGODB_URI=mongodb+srv://...

# Admin Emails
NEXT_PUBLIC_ADMIN_EMAIL='admin@example.com,admin2@example.com'

# ImageKit
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Delhivery
DELHIVERY_API_KEY=
DELHIVERY_BASE_URL=https://apiv2.delhivery.com

# Email Service
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Session/JWT
JWT_SECRET=your-secret-key

# Cache (Redis optional)
REDIS_URL=redis://localhost:6379
```

---

## Key Features & APIs

### ✅ Multi-Store Marketplace
- Each seller has their own store
- Store-specific products and menu
- Store management dashboard

### ✅ Product Management
- Multiple variants support
- Bulk pricing
- Fast delivery badges
- Product search & filters
- Category filtering
- Image optimization

### ✅ Order Management
- Order creation & tracking
- Multiple payment methods (Stripe, Razorpay)
- Shipping integration (Delhivery)
- Order status updates
- Return management

### ✅ Coupon System
- Percentage & fixed discounts
- Usage limits & expiration
- Category-specific coupons
- Coupon validation

### ✅ Email Notifications
- Welcome emails
- Login confirmations
- Order shipping alerts
- Custom email templates
- Promotional emails

### ✅ User Features
- Wishlist
- Wallet system
- Browse history
- Reviews & ratings
- Return requests
- Support tickets

---

## Database Indexes

Key indexes for performance:

```javascript
// Product indexes
db.products.createIndex({ slug: 1 })
db.products.createIndex({ category: 1, inStock: 1 })
db.products.createIndex({ storeId: 1, inStock: 1 })
db.products.createIndex({ price: 1, mrp: 1 })

// Order indexes
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ orderStatus: 1 })
db.orders.createIndex({ storeId: 1 })

// User indexes
db.users.createIndex({ firebaseId: 1 })
db.users.createIndex({ email: 1 })
```

---

## Error Handling

Standard error responses:

```json
{
  "error": "Error message",
  "status": 400,
  "details": "..."
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

---

## Caching Strategy

- **Client-side:** localStorage for cart, categories
- **Browser Cache:** Next.js Image optimization
- **Server Cache:** Mongodb lean queries for read-heavy operations
- **Redis (optional):** Product data caching

---

## Rate Limiting

Currently not enforced. Consider implementing for production:
- API rate limits: 100 requests per minute per user
- Upload limits: 10MB per file

---

## Security Notes

✅ **Implemented:**
- Firebase authentication
- CORS protection
- Input validation
- Secure password handling
- Environment variable protection

⚠️ **TODO for Production:**
- API rate limiting
- Request sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens

---

## Support & Contact

For questions about the API:
- Create issues in the repository
- Contact the development team
- Check the documentation for updates

---

**Happy Coding! 🚀**
