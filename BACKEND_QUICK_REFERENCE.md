# QuickFynd Backend - Quick Reference Guide
**For: Node.js Backend Developer**

---

## 🎯 At a Glance

**Project:** QuickFynd E-Commerce Platform  
**Current:** Next.js API Routes  
**Target:** Standalone Node.js Backend (Express/Fastify)  
**Database:** MongoDB  
**Auth:** Firebase  
**APIs to Build:** 40+ endpoints  

---

## 📊 Quick Stats

| Aspect | Count |
|--------|-------|
| API Endpoints | 40+ |
| Database Collections | 14 |
| Third-party Integrations | 6 |
| Core Features | 15+ |
| Database Indexes | 8+ |

---

## 🔗 Key Integration Points

### Frontend Connection
```
Next.js Frontend
↓
HTTP Requests to Node.js Backend
Headers: Authorization: Bearer <Firebase_Token>
Base URL: http://backend-url/api
↓
Response: JSON
```

### Authentication Flow
```
User Login (Frontend)
↓
Firebase Auth
↓
Returns: ID Token
↓
Frontend sends: Authorization: Bearer <token>
↓
Backend: Verifies with Firebase Admin SDK
↓
Creates Session/Returns User Data
```

### Payment Flow
```
Order Created
↓
Request Payment Intent (Stripe or Razorpay)
↓
Return Client Secret/Order ID
↓
Frontend processes payment
↓
Webhook: Backend updates order status
```

---

## 📦 Collections at a Glance

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| users | User accounts | firebaseId, email, role |
| products | Product listings | name, slug, price, storeId |
| categories | Product categories | name, slug, parentId |
| orders | Customer orders | userId, items, orderStatus |
| coupons | Discount codes | code, discountType, discountValue |
| addresses | Shipping/billing | userId, street, city, postalCode |
| wallet | User balance | userId, balance, transactions |
| reviews | Product reviews | productId, userId, rating, content |
| store | Seller stores | storeId, storeName, verified |
| storeMenu | Store categories | storeId, categories |
| wishlist | Saved products | userId, productId |
| returnRequests | Returns/replacements | orderId, productId, status |
| tickets | Support tickets | userId, subject, status |
| browseHistory | Product views | userId, productId, viewedAt |

---

## 🔑 Essential Endpoints (Priority Order)

### Phase 1: Core (Week 1-2)
```
✅ Products CRUD
✅ Orders CRUD
✅ Users (register, profile)
✅ Authentication
```

### Phase 2: Commerce (Week 2-3)
```
✅ Payments (Stripe, Razorpay)
✅ Coupons
✅ Addresses
```

### Phase 3: Advanced (Week 3-4)
```
✅ Shipping (Delhivery)
✅ Reviews & Ratings
✅ Wishlist
✅ Wallet
```

### Phase 4: Support (Week 4-5)
```
✅ Email notifications
✅ File uploads
✅ Search & filters
```

---

## 🛠️ Tech Stack Recommendations

### Framework
- **Express.js** (Simple, proven) OR
- **Fastify** (Performance)

### Database
- MongoDB (already chosen)
- Mongoose for ODM

### Authentication
- Firebase Admin SDK
- JWT for sessions (optional)

### Validation
- Joi, Yup, or Zod

### Error Handling
- Custom error classes
- Centralized error middleware

### Logging
- Winston or Pino

### Testing
- Jest for unit tests
- Supertest for API tests

### Deployment
- Docker container
- PM2 for process management
- Nginx reverse proxy

---

## 📝 Endpoint Template

Every endpoint should follow this pattern:

```javascript
/**
 * Route: POST /api/endpoint
 * Auth: Required / Optional / None
 * Body: { ... }
 * Response: { success, data, message }
 * Error: { success, error, code }
 */

router.post('/', authenticate, validate(schema), async (req, res) => {
  try {
    // Logic here
    res.json({ success: true, data: result, message: 'Success' });
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

---

## 🔐 Security Checklist

### Before Going Live
- [ ] Firebase token validation
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Request size limits
- [ ] Helmet.js middleware
- [ ] Environment variables (no secrets in code)
- [ ] HTTPS only
- [ ] Webhook signature verification

---

## ⚡ Performance Checklist

### Optimization
- [ ] Database indexing on all commonly queried fields
- [ ] Pagination for list endpoints (default: 20 items)
- [ ] Lean queries for read-only operations
- [ ] Connection pooling
- [ ] Redis caching (optional)
- [ ] CDN for image delivery (ImageKit already handles)
- [ ] Gzip compression
- [ ] Response time < 500ms (p95)

---

## 🧪 Testing Checklist

### Tests to Write
- [ ] Unit tests for models
- [ ] Unit tests for middleware
- [ ] Integration tests for all endpoints
- [ ] Payment webhook tests
- [ ] Auth/authorization tests
- [ ] Data validation tests
- [ ] Error handling tests
- [ ] Load tests

### Coverage Goal
- Overall: 80%
- Critical paths: 100%

---

## 📋 Deployment Checklist

### Before Production
- [ ] All endpoints tested
- [ ] Database backups configured
- [ ] Error logging setup
- [ ] Monitoring/alerting setup
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Database indexes created
- [ ] Documentation complete

---

## 🐛 Common Issues & Solutions

### Issue: Token Validation Fails
**Solution:** Ensure Firebase Admin SDK is properly initialized with correct credentials

### Issue: Database Connection Slow
**Solution:** Check connection pooling, verify network latency, add indexes

### Issue: Payment Webhook Not Received
**Solution:** Verify webhook URL is public, check signature verification, test with Stripe/Razorpay CLI

### Issue: Image Upload Fails
**Solution:** Verify ImageKit credentials, check file size limits, verify MIME types

### Issue: Email Not Sending
**Solution:** Check SendGrid API key, verify email template, check spam folder, review logs

---

## 📚 Files to Create/Modify

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── firebase.js
│   │   └── environment.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── ... (10+ more)
│   ├── routes/
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── users.js
│   │   └── ... (15+ more)
│   ├── controllers/
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── ... (15+ more)
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── logger.js
│   ├── services/
│   │   ├── paymentService.js
│   │   ├── emailService.js
│   │   ├── shippingService.js
│   │   └── ... (5+ more)
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   └── constants.js
│   └── app.js (main server file)
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
├── README.md
└── docker-compose.yml
```

---

## 🔄 Migration Path

### Step 1: Setup (1-2 days)
```
1. Create Node.js project
2. Setup MongoDB connection
3. Setup Firebase Admin SDK
4. Create folder structure
5. Configure environment variables
```

### Step 2: Models & DB (2-3 days)
```
1. Create all Mongoose schemas
2. Add validation
3. Create indexes
4. Seed sample data
```

### Step 3: Authentication (1-2 days)
```
1. Implement auth middleware
2. Test token verification
3. Setup role-based access
```

### Step 4: Core APIs (1 week)
```
1. Products CRUD
2. Orders CRUD
3. Users management
4. Search & filters
```

### Step 5: Payments & Shipping (4-5 days)
```
1. Stripe integration
2. Razorpay integration
3. Delhivery integration
4. Webhook handlers
```

### Step 6: Advanced Features (3-4 days)
```
1. Coupons system
2. Reviews & ratings
3. Wishlist
4. Wallet
5. Return management
```

### Step 7: Support & Notifications (2-3 days)
```
1. Email service
2. File uploads
3. Support tickets
4. Notifications
```

### Step 8: Testing & Optimization (3-5 days)
```
1. Unit tests
2. Integration tests
3. Performance optimization
4. Security audit
```

### Step 9: Deployment (2-3 days)
```
1. Docker setup
2. CI/CD pipeline
3. Staging deployment
4. Production deployment
```

---

## 📞 Communication Protocol

### Frontend → Backend

**All requests must include:**
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

**Request example:**
```javascript
fetch('http://api.quickfynd.com/api/products', {
  headers: {
    'Authorization': 'Bearer ' + firebaseToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
```

### Backend → Frontend

**Standard response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-02-05T10:30:00Z"
}
```

**Error response:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2026-02-05T10:30:00Z"
}
```

---

## 🎓 Learning Resources

- Firebase Admin SDK Docs
- Mongoose Documentation
- Express.js Guide
- MongoDB Index Strategies
- Stripe API Documentation
- Razorpay Integration Guide
- Delhivery API Documentation
- Node.js Best Practices

---

## 📊 Success Metrics

### Before Going Live
- [ ] All endpoints return proper responses
- [ ] Authentication works for all user roles
- [ ] All payments process correctly
- [ ] All emails send successfully
- [ ] Search returns accurate results
- [ ] API response time < 500ms
- [ ] No unhandled errors in logs
- [ ] 80%+ code coverage
- [ ] Documentation complete
- [ ] Team trained on deployment

---

**You have all the documentation you need. Good luck building! 🚀**

Contact: For questions, refer to BACKEND_REQUIREMENTS.md and API_DOCUMENTATION.md
