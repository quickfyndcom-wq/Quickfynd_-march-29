# Section4 Component - API Documentation

**Component:** `components/section4.jsx`  
**Purpose:** Horizontal scrolling product sections for homepage  
**Last Updated:** February 25, 2026

---

## Overview

The **Section4** component displays horizontal scrolling product carousels on the homepage. Each section can contain multiple products with full e-commerce functionality including add-to-cart, pricing, ratings, and stock management.

---

## Required Backend APIs

### 1. Homepage Sections API

Fetches the section configuration with product data.

#### **GET** `/api/homepage/sections`

**Alternative endpoints:**
- `/api/sections`
- `/api/home/sections`

**Authentication:** None (public endpoint)

**Response Format:**

```json
{
  "sections": [
    {
      "_id": "section_001",
      "title": "Featured Products",
      "subtitle": "Handpicked for you",
      "category": "Electronics",
      "products": [
        {
          "_id": "prod123",
          "id": "prod123",
          "name": "Premium Wireless Headphones",
          "slug": "premium-wireless-headphones",
          "image": "https://imagekit.io/.../headphones.jpg",
          "images": [
            "https://imagekit.io/.../headphones.jpg",
            "https://imagekit.io/.../headphones-2.jpg"
          ],
          "price": 2999,
          "basePrice": 2999,
          "salePrice": 2999,
          "mrp": 4999,
          "originalPrice": 4999,
          "regularPrice": 4999,
          "rating": 4.5,
          "averageRating": 4.5,
          "reviews": 127,
          "reviewCount": 127,
          "ratingCount": 127,
          "fastDelivery": true,
          "isFastDelivery": true,
          "deliveryFast": true,
          "express": true,
          "inStock": true,
          "stockQuantity": 45,
          "variants": []
        }
      ]
    }
  ]
}
```

#### **Alternative Format with Product IDs:**

If sections only contain product IDs, products are fetched separately:

```json
{
  "sections": [
    {
      "_id": "section_002",
      "title": "Trending Now",
      "subtitle": "Most popular items",
      "productIds": [
        "prod123",
        "prod456",
        "prod789"
      ]
    }
  ]
}
```

---

### 2. Products List API

Used when sections contain `productIds` instead of full product objects.

#### **GET** `/api/products`

**Authentication:** None (public endpoint)

**Query Parameters:**
- `ids` - Comma-separated product IDs (optional)
- `limit` - Number of products to return
- `skip` - Pagination offset

**Response:**

```json
{
  "products": [
    {
      "_id": "prod123",
      "name": "Product Name",
      "slug": "product-name",
      "image": "...",
      "price": 999,
      "mrp": 1299,
      "inStock": true,
      "rating": 4.5,
      "reviews": 50
    }
  ],
  "total": 100,
  "skip": 0,
  "limit": 20
}
```

---

### 3. Cart Management APIs

Used by the "Add to Cart" button in each product card.

#### **POST** `/api/cart/add`

Add a product to the shopping cart.

**Authentication:** Optional (works for both guest and logged-in users)

**Headers:**
```
Authorization: Bearer <firebase-token> (optional)
Content-Type: application/json
```

**Request Body:**

```json
{
  "productId": "prod123",
  "quantity": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "Product added to cart",
  "cart": {
    "items": [
      {
        "productId": "prod123",
        "quantity": 1,
        "price": 999
      }
    ],
    "totalItems": 1,
    "totalAmount": 999
  }
}
```

---

#### **POST** `/api/cart/sync` or `/api/cart/upload`

Syncs local cart state with the backend (for logged-in users).

**Authentication:** Required (logged-in users only)

**Headers:**
```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "cartItems": {
    "prod123": 2,
    "prod456": 1,
    "prod789": 3
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart synced successfully",
  "cartItems": {
    "prod123": 2,
    "prod456": 1,
    "prod789": 3
  }
}
```

---

## Product Data Model

### Required Fields for Section4

The component expects products with the following structure:

```javascript
{
  // Identity (at least one required)
  _id: String,              // Primary MongoDB ID
  id: String,               // Alternative ID field
  
  // Basic Info (required)
  name: String,             // Product name
  slug: String,             // URL-friendly slug
  
  // Images (at least one required)
  image: String,            // Primary image URL
  images: [String],         // Array of image URLs
  
  // Pricing (flexible - component checks multiple fields)
  price: Number,            // Current/sale price
  basePrice: Number,        // Base price
  salePrice: Number,        // Sale price
  mrp: Number,              // Maximum retail price (for discount calc)
  originalPrice: Number,    // Original price
  regularPrice: Number,     // Regular price
  
  // Ratings & Reviews (optional but recommended)
  rating: Number,           // Average rating (0-5)
  averageRating: Number,    // Alternative rating field
  reviews: Number,          // Review count
  reviewCount: Number,      // Alternative review count
  ratingCount: Number,      // Alternative rating count
  
  // Stock Management
  inStock: Boolean,         // Stock availability flag
  stockQuantity: Number,    // Available quantity
  variants: [{              // Product variants (if applicable)
    stock: Number           // Stock per variant
  }],
  
  // Features & Badges
  fastDelivery: Boolean,    // Fast delivery badge
  isFastDelivery: Boolean,  // Alternative flag
  deliveryFast: Boolean,    // Alternative flag
  express: Boolean          // Alternative flag
}
```

---

## Component Price Logic

The component uses flexible price resolution:

### Current Price (Display Price)
```javascript
// Priority order:
1. product.basePrice
2. product.price
3. product.salePrice
```

### Regular Price (Strikethrough Price)
```javascript
// Priority order:
1. product.originalPrice
2. product.mrp
3. product.regularPrice
4. product.price
```

### Discount Calculation
```javascript
discountPercent = Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
// Only displayed if regularPrice > currentPrice
```

---

## Stock Management Logic

### Out of Stock Conditions

A product is considered out of stock if any of these conditions are true:

1. **Direct Stock Flag:**
   ```javascript
   product.inStock === false
   ```

2. **Variant Stock Check:**
   ```javascript
   // If product has variants
   if (product.variants && product.variants.length > 0) {
     // Check if ANY variant has stock > 0
     const hasVariantStock = product.variants.some(v => v.stock > 0)
     if (!hasVariantStock) return true // Out of stock
   }
   ```

3. **Stock Quantity:**
   ```javascript
   product.stockQuantity <= 0
   ```

---

## Fast Delivery Badge Logic

Fast delivery badge is displayed if any of these fields are true:

```javascript
product.fastDelivery === true
|| product.isFastDelivery === true
|| product.deliveryFast === true
|| product.express === true
```

---

## Frontend State Management

### Redux Slices Used

1. **Product Slice** (`state.product.list`)
   - Stores all products for product ID mapping
   
2. **Cart Slice** (`state.cart.cartItems`)
   - Stores cart items as object: `{ productId: quantity }`
   - Actions: `addToCart`, `uploadCart`

### Cart State Example

```javascript
{
  cartItems: {
    "prod123": 2,
    "prod456": 1,
    "prod789": 3
  }
}
```

---

## API Integration Examples

### 1. Fetch Homepage Sections

```javascript
// Frontend API call
const response = await fetch('/api/homepage/sections')
const data = await response.json()
// Pass data.sections to Section4 component
```

### 2. Add Product to Cart

```javascript
import { addToCart, uploadCart } from '@/lib/features/cart/cartSlice'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'

const dispatch = useDispatch()

const handleAddToCart = async (productId) => {
  // Add to Redux store (optimistic update)
  dispatch(addToCart({ productId: String(productId) }))
  toast.success('Added to cart')
  
  // Sync with backend (for logged-in users)
  if (userToken) {
    try {
      await dispatch(uploadCart({ getToken }))
    } catch (error) {
      console.error('Cart sync failed:', error)
    }
  }
}
```

### 3. Handle Section with Product IDs

```javascript
// Backend controller example
export async function GET(request) {
  try {
    const sections = await Section.find({ isActive: true })
    
    // Populate products if sections have productIds
    const populatedSections = await Promise.all(
      sections.map(async (section) => {
        if (section.productIds && section.productIds.length > 0) {
          const products = await Product.find({
            _id: { $in: section.productIds },
            inStock: true
          }).lean()
          
          return {
            ...section.toObject(),
            products
          }
        }
        return section
      })
    )
    
    return Response.json({ sections: populatedSections })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

---

## Component Features

### ✅ User Interactions

1. **Horizontal Scroll**
   - Mouse drag to scroll
   - Touch swipe on mobile
   - Arrow buttons (desktop only)
   - Mousewheel scroll

2. **Product Card Click**
   - Navigates to `/product/[slug]`
   - Navigation blocked during drag

3. **Add to Cart Button**
   - Adds 1 quantity to cart
   - Shows current cart quantity badge
   - Color changes when item in cart
   - Prevents navigation when clicked

4. **Out of Stock**
   - Shows "Out of Stock" badge
   - Disables add to cart button

### ✅ Visual Features

1. **Fast Delivery Badge**
   - Green badge on product image
   - Only shown if `fastDelivery` flag is true

2. **Discount Display**
   - Shows original price (strikethrough)
   - Shows discount percentage
   - Green text for discount

3. **Rating Stars**
   - 5-star display (filled/empty)
   - Shows review count
   - Always visible (uses 0 if no ratings)

4. **Product Image Hover**
   - Zoom effect on hover
   - Smooth transition

5. **Skeleton Loading**
   - Shows 5 skeleton cards while loading
   - 800ms delay for better UX

---

## Performance Optimizations

### 1. Image Optimization
- Uses Next.js `<Image>` component
- Lazy loading enabled
- Responsive sizes: `(max-width: 640px) 224px, 256px`
- WebP format via ImageKit

### 2. Scroll Performance
- RequestAnimationFrame for smooth dragging
- Passive event listeners
- CSS `scroll-behavior: smooth`
- Touch-action optimization

### 3. State Management
- Memoized product mapping with `Map`
- Normalized IDs for consistent lookups
- Debounced cart sync

---

## Common Issues & Solutions

### Issue 1: Products Not Displaying

**Possible Causes:**
1. Section has `productIds` but Products API not called
2. Product `_id` format mismatch (ObjectId vs String)
3. Empty `products` array in section

**Solution:**
```javascript
// Normalize IDs for consistent comparison
const normalizeId = (value) => {
  if (value?.$oid) return String(value.$oid)
  return String(value)
}
```

### Issue 2: Cart Count Not Updating

**Cause:** Product ID mismatch between cart state and product data

**Solution:**
```javascript
// Check both string and original ID format
const productId = product._id || product.id
const count = cartItems[productId] || cartItems[String(productId)] || 0
```

### Issue 3: Price Not Displayed

**Cause:** Product missing all price fields

**Solution:** Backend must return at least one price field:
- `price`, `basePrice`, or `salePrice`

### Issue 4: Drag Interfering with Click

**Cause:** Click event fires even during drag

**Solution:** Component tracks drag movement and prevents navigation if `hasMoved > 12px`

---

## Testing Checklist

### Backend API Testing

- [ ] `/api/homepage/sections` returns valid sections
- [ ] Products have all required fields
- [ ] Product images are accessible
- [ ] Stock quantities are accurate
- [ ] Price fields are populated correctly
- [ ] `/api/cart/add` works for guest users
- [ ] `/api/cart/sync` works for logged-in users

### Component Testing

- [ ] Sections load without errors
- [ ] Products display correctly
- [ ] Images load and display
- [ ] Prices calculate discounts correctly
- [ ] Fast delivery badge shows when appropriate
- [ ] Out of stock badge shows correctly
- [ ] Add to cart increments cart count
- [ ] Drag scroll works smoothly
- [ ] Arrow buttons work on desktop
- [ ] Click navigation works (without drag)
- [ ] Skeleton loading displays initially
- [ ] Rating stars display correctly

---

## Related Documentation

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
- [CART_IMPLEMENTATION_GUIDE.md](./CART_IMPLEMENTATION_GUIDE.md) - Cart system details
- [PRODUCT_VARIANTS_GUIDE.md](./PRODUCT_VARIANTS_GUIDE.md) - Product variants

---

## Support & Contact

For questions about Section4 implementation:
- Check component file: `components/section4.jsx`
- Review Redux slices: `lib/features/cart/cartSlice.js`
- Test with sample data in development environment

---

**Last Updated:** February 25, 2026  
**Component Version:** 2.0  
**API Version:** 1.0
