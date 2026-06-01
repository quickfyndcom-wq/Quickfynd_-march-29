# QuickFynd API Quick Reference
**Developer Quick Start Guide**

## 🚀 Quick Setup (5 minutes)

```bash
# 1. Clone & Install
git clone <repo>
cd quickfynd23.01
npm install

# 2. Environment Variables
cp .env.example .env.local
# Fill in Firebase, MongoDB, API keys

# 3. Run Dev Server
npm run dev

# Visit: http://localhost:3000
```

## 🔐 Authentication

All protected endpoints need Firebase token:
```javascript
// In browser (client-side)
import { auth } from '@/lib/firebase';
const user = auth.currentUser;
const token = await user.getIdToken();

// In API request
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## 📊 Key Database Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Product** | Product listings | name, slug, price, category, storeId |
| **Order** | Customer orders | items, totalAmount, orderStatus, userId |
| **User** | User accounts | email, firebaseId, role |
| **Category** | Product categories | name, slug, parentId, image |
| **Coupon** | Discount codes | code, discountType, discountValue, isActive |
| **Store** | Seller stores | storeId, storeName, verified |
| **Address** | Shipping addresses | userId, street, city, postalCode |
| **Wallet** | User balance | userId, balance, transactions |

## 🔌 API Endpoints Summary

### **Core Endpoints**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/products` | - | List products |
| POST | `/api/products` | ✅ | Create product |
| GET | `/api/categories` | - | List categories |
| POST | `/api/orders` | ✅ | Create order |
| GET | `/api/orders` | ✅ | User orders |
| POST | `/api/address` | ✅ | Add address |
| POST | `/api/coupon/validate` | - | Validate coupon |
| GET | `/api/wallet` | ✅ | Wallet balance |
| POST | `/api/wishlist` | ✅ | Add to wishlist |
| GET | `/api/review/[productId]` | - | Product reviews |

## 📝 Common Request Examples

### Create Product
```javascript
POST /api/products
Authorization: Bearer <token>

{
  "name": "iPhone 15",
  "price": 79999,
  "category": "electronics",
  "images": ["url"],
  "inStock": true,
  "storeId": "seller123"
}
```

### Create Order
```javascript
POST /api/orders
Authorization: Bearer <token>

{
  "items": [{
    "productId": "...",
    "quantity": 1,
    "price": 999
  }],
  "totalAmount": 999,
  "paymentMethod": "stripe",
  "shippingAddress": {...}
}
```

### Validate Coupon
```javascript
POST /api/coupon/validate

{
  "code": "SAVE10",
  "cartTotal": 5000
}
```

## 🗂️ Project Structure

```
quickfynd23.01/
├── app/
│   ├── api/              # API endpoints
│   │   ├── products/
│   │   ├── orders/
│   │   ├── categories/
│   │   └── ...
│   ├── store/            # Seller dashboard
│   ├── admin/            # Admin panel
│   └── (public)/         # Public pages
├── components/           # React components
├── models/               # Database schemas
├── lib/                  # Utilities & helpers
├── middlewares/          # Auth middlewares
└── public/               # Static assets
```

## 🔧 Common Tasks

### Get User's Orders
```javascript
// Client-side
const response = await fetch('/api/orders', {
  headers: { Authorization: `Bearer ${token}` }
});
const { orders } = await response.json();
```

### Upload Image
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});
const { url } = await response.json();
```

### Search Products
```javascript
fetch(`/api/products?search=iPhone&category=electronics&minPrice=50000&maxPrice=100000`)
```

### Create Coupon (Admin)
```javascript
POST /api/coupon
Authorization: Bearer <admin-token>

{
  "code": "SUMMER20",
  "discountType": "percentage",
  "discountValue": 20,
  "maxDiscount": 1000,
  "startDate": "2024-06-01",
  "endDate": "2024-08-31"
}
```

## 📦 External Services Integration

| Service | Purpose | Setup |
|---------|---------|-------|
| **Firebase** | Authentication | Add credentials to .env |
| **MongoDB** | Database | Add connection string to .env |
| **Stripe** | Payments | Add API keys to .env |
| **Razorpay** | Indian payments | Add credentials to .env |
| **Delhivery** | Shipping | Add API key to .env |
| **ImageKit** | Image storage | Add credentials to .env |
| **SendGrid** | Email | Add API key to .env |

## 🚨 Error Handling

```javascript
// Standard error response
{
  "error": "Product not found",
  "status": 404
}

// Handle in frontend
try {
  const response = await fetch('/api/products/123');
  if (!response.ok) {
    const error = await response.json();
    console.error(error.error);
  }
  const data = await response.json();
} catch (err) {
  console.error('Network error:', err);
}
```

## 🔑 Environment Variables Needed

```env
# Must have
MONGODB_URI=
NEXT_PUBLIC_FIREBASE_API_KEY=
FIREBASE_ADMIN_SDK_KEY=
NEXT_PUBLIC_ADMIN_EMAIL=

# Payment
STRIPE_SECRET_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Image Upload
IMAGEKIT_PRIVATE_KEY=

# Shipping
DELHIVERY_API_KEY=

# Email
SENDGRID_API_KEY=
```

## 📱 Frontend Integration

### Get Products
```javascript
const [products, setProducts] = useState([]);

useEffect(() => {
  fetch('/api/products?category=electronics')
    .then(res => res.json())
    .then(data => setProducts(data.products));
}, []);
```

### Create Order
```javascript
const createOrder = async (items, total) => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items,
      totalAmount: total,
      paymentMethod: 'stripe'
    })
  });
  return response.json();
};
```

## 🧪 Testing APIs

Use **Postman** or **cURL**:

```bash
# Get products
curl http://localhost:3000/api/products

# Create product (needs token)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 999,
    "category": "electronics"
  }'
```

## 📊 Performance Tips

- Use product filters (category, price range) to reduce data
- Implement pagination: `?skip=0&limit=20`
- Cache product data client-side
- Use fast delivery badges for better UX
- Index frequently searched fields in MongoDB

## 🐛 Debugging

Enable logs:
```javascript
// In API routes
console.log('Request:', req.body);
console.log('User:', decoded);
console.log('Response:', result);
```

Check browser console for:
- Network errors
- Authentication issues
- CORS problems
- Missing environment variables

## 📞 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check Firebase token is sent in Authorization header |
| 404 Not Found | Verify API endpoint path is correct |
| 500 Server Error | Check MongoDB connection and env variables |
| Image not uploading | Verify ImageKit credentials |
| Coupon not working | Check coupon is active and within date range |
| Order failed | Verify payment credentials (Stripe/Razorpay) |

## 📚 Additional Resources

- **Full Documentation:** See `API_DOCUMENTATION.md`
- **Database Schemas:** Check `/models/` folder
- **API Routes:** Browse `/app/api/` folder
- **Frontend Examples:** Check `/components/` folder

---

**Ready to develop? Let's go! 🚀**
