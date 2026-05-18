# Product Variant Image Selection Feature

**For:** App Developer  
**Last Updated:** May 18, 2026  
**Feature:** Select product images for each product variant

---

## Overview

The **Product Variant Image Selection** feature allows sellers to:

- Choose specific images for each variant (color, size, storage capacity, etc.)
- Set a primary image for each variant
- Reorder variant images
- Share images across variants or use unique images per variant
- Mobile responsive image picker/gallery

---

## Feature Location

**On Add/Manage Product:**

- Section: Variants Management
- Tab: Variant Details
- Action: Click variant → Image Gallery selector appears
- Images source: From product's main image gallery

---

## Visual Layout

### Desktop View - Variant Image Selection

```
┌────────────────────────────────────────────────────────────┐
│ Variants Management                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ Variant 1: Red       │  │ Variant 2: Blue      │        │
│ │ [Edit] [Remove]      │  │ [Edit] [Remove]      │        │
│ │                      │  │                      │        │
│ │ ┌────────────────┐   │  │ ┌────────────────┐   │        │
│ │ │   [Image 1]    │   │  │ │   [Image 1]    │   │        │
│ │ │   (Primary)    │   │  │ │   (Primary)    │   │        │
│ │ └────────────────┘   │  │ └────────────────┘   │        │
│ │ Size: Red Color      │  │ Size: Blue Color     │        │
│ │ Price: ₹1,299        │  │ Price: ₹1,399        │        │
│ │ Stock: 50 units      │  │ Stock: 45 units      │        │
│ │                      │  │                      │        │
│ │ [Change Images] ↓    │  │ [Change Images] ↓    │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                            │
└────────────────────────────────────────────────────────────┘

When [Change Images] clicked:

┌─────────────────────────────────────────────────────────────┐
│ Select Images for Variant: Red (SKU: SHIRT-RED-M)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Available Images from Product Gallery:                      │
│                                                             │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│ │ ☑ [Img] │  │ ☑ [Img] │  │ ☐ [Img] │  │ ☐ [Img] │        │
│ │ Red 1   │  │ Red 2   │  │ Blue 1  │  │ Blue 2  │        │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│ │ ☐ [Img] │  │ ☐ [Img] │  │ ☐ [Img] │                      │
│ │ Blue 3  │  │ Red 3   │  │ Red 4   │                      │
│ └─────────┘  └─────────┘  └─────────┘                      │
│                                                             │
│ Drag to reorder primary image for this variant             │
│                                                             │
│ Selected Images (2):                                        │
│ ☝1 [Red 1] [Primary] [↑↓ Reorder] [✕ Remove]              │
│ ☝2 [Red 2]          [↑↓ Reorder] [✕ Remove]               │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Cancel]                            [Save Images]   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile View - Variant Image Selection

```
┌────────────────────────────────┐
│ Variant 1: Red                 │
│ [Edit] [Remove]                │
├────────────────────────────────┤
│                                │
│   ┌──────────────────┐         │
│   │    [Image 1]     │         │
│   │    (Primary)     │         │
│   └──────────────────┘         │
│                                │
│   Size: Red Color              │
│   Price: ₹1,299                │
│   Stock: 50 units              │
│                                │
│   [Change Images] ↓            │
│                                │
└────────────────────────────────┘

Image Picker Modal:

┌─────────────────────────────────┐
│ ✕ Select Images for Variant     │
│                 Red             │
├─────────────────────────────────┤
│                                 │
│ Available Images:               │
│                                 │
│ ☑ ┌──────────────────┐         │
│   │     [Image 1]    │         │
│   │     Red 1        │         │
│   └──────────────────┘         │
│                                 │
│ ☑ ┌──────────────────┐         │
│   │     [Image 2]    │         │
│   │     Red 2        │         │
│   └──────────────────┘         │
│                                 │
│ ☐ ┌──────────────────┐         │
│   │     [Image 3]    │         │
│   │     Blue 1       │         │
│   └──────────────────┘         │
│                                 │
│ Selected: 2 images              │
│ [Tap to reorder]                │
│                                 │
│ [Cancel]  [Save Images]         │
│                                 │
└─────────────────────────────────┘
```

---

## Variant Form UI Changes

**Key Change:** Remove manual "Image URL" text input. Use **image picker to select from existing product images** only.

### Old Way ❌ (REMOVED)

```
┌─────────────────────────────────────────────────┐
│ Add Variant Row                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Variant Title                  SKU              │
│ [Color        ]                [SKU Value    ]  │
│                                                 │
│ Color                  Size        Stock        │
│ [Black     ]           [S,M,L  ]    [9       ]  │
│                                                 │
│ Image URL (Optional)        ← ❌ REMOVED        │
│ [https://example.com/...  ]     NO MORE TEXT    │
│                                                 │
│ Price (₹)              MRP (₹)                   │
│ [549           ]       [799          ]          │
│                                                 │
│ [Remove Variant] ────────────── [✓ Add Variant]│
│                                                 │
└─────────────────────────────────────────────────┘
```

**Why removed:**

- ❌ Sellers had to manually type/paste URLs
- ❌ No validation of image origin
- ❌ Only 1 image per variant
- ❌ No reordering capability
- ❌ Error-prone manual input

---

### New Way ✅ (ONLY METHOD)

```
┌─────────────────────────────────────────────────┐
│ Add Variant Row                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Variant Title                  SKU              │
│ [Color        ]                [SKU Value    ]  │
│                                                 │
│ Color                  Size        Stock        │
│ [Black     ]           [S,M,L  ]    [9       ]  │
│                                                 │
│ Images for this Variant       ← ✅ IMAGE PICKER │
│ ┌──────────────────────────────────────────┐   │
│ │ ☐                 ☐           ☐         │   │
│ │ [Black1]     [Black2]     [Red1]        │   │
│ │ (selected)   (primary)    (optional)    │   │
│ │                                         │   │
│ │ [+ Select Images from Product Gallery] │   │
│ │   (Opens modal with uploaded images)   │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ Price (₹)              MRP (₹)                   │
│ [549           ]       [799          ]          │
│                                                 │
│ [Remove Variant] ────────────── [✓ Add Variant]│
│                                                 │
└─────────────────────────────────────────────────┘
```

**Benefits:**

- ✅ Select from product gallery images only
- ✅ No manual URL entry needed
- ✅ Multiple images per variant (min 1, max ~10)
- ✅ Reorder images with drag/drop
- ✅ Set primary display image
- ✅ Visual preview before saving
- ✅ Validation enforced

---

### Modal - Select Images from Product Gallery

When seller clicks **[+ Select Images from Product Gallery]**, modal opens:

```
┌──────────────────────────────────────────────────┐
│ Select Images for Variant: Black                │
│                                                  │
│ All uploaded product images shown below.         │
│ Check boxes to select images for this variant.  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Available Product Images (From Gallery):        │
│                                                  │
│ ☐ ┌──────────┐  ☑ ┌──────────┐  ☐ ┌──────────┐ │
│   │[Black 1] │    │[Black 2] │    │[Red 1]   │ │
│   │(uploaded)│    │(selected)│    │(uploaded)│ │
│   └──────────┘    └──────────┘    └──────────┘ │
│                                                  │
│ ☐ ┌──────────┐  ☐ ┌──────────┐  ☐ ┌──────────┐ │
│   │[Red 2]   │    │[Red 3]   │    │[Blue 1]  │ │
│   │(uploaded)│    │(uploaded)│    │(uploaded)│ │
│   └──────────┘    └──────────┘    └──────────┘ │
│                                                  │
│ Selected Images (1):                             │
│ 1. [Black 2] [✓ Primary]  [✕ Remove]           │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ [Cancel]           [Save Selection]        │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Rules:**

- Minimum 1 image per variant (required)
- Maximum ~10 images per variant (recommended)
- Images sourced only from product gallery
- Drag-to-reorder support
- Must set 1 image as primary
- Same image can be used by multiple variants

---

## Data Structure

### Variant Image Model

```javascript
{
  variantId: ObjectId,
  productId: ObjectId,
  variantName: String,           // e.g., "Red - M", "Blue - 256GB"
  sku: String,
  images: [
    {
      imageId: ObjectId,         // Reference to main product image
      imageUrl: String,          // ImageKit URL
      imagePath: String,         // Local path
      alt: String,               // Alt text
      displayOrder: Number,      // Primary image has order 1
      isPrimary: Boolean,        // Primary display image
      uploadedAt: Date
    }
  ],
  primaryImageId: ObjectId,      // Quick reference to primary image
  totalImages: Number,           // Count of images for variant
  createdAt: Date,
  updatedAt: Date
}
```

### Product Model Integration

```javascript
{
  productId: ObjectId,
  name: String,

  // Main product images
  images: [
    {
      _id: ObjectId,
      url: String,
      path: String,
      alt: String,
      uploadedAt: Date
    }
  ],

  // Variants with their image mappings
  variants: [
    {
      _id: ObjectId,
      name: String,              // e.g., "Red", "Blue - 256GB"
      sku: String,
      price: Number,
      stock: Number,
      attributes: {
        color: String,
        size: String,
        storage: String,
        // ... other variant attributes
      },
      imageIds: [ObjectId],      // Array of image IDs from main product images
      primaryImageId: ObjectId,  // Primary image for this variant
      createdAt: Date,
      updatedAt: Date
    }
  ]
}
```

---

## Database Schema (MongoDB)

```javascript
// models/ProductVariant.js
const variantSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
    // e.g., "Red - Medium", "Blue - 256GB"
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  attributes: {
    color: String,
    size: String,
    storage: String,
    capacity: String,
    weight: String,
    material: String,
    // ... dynamic attributes based on product type
  },
  price: Number,
  originalPrice: Number,
  discount: Number,
  stock: Number,

  // Image mappings for this variant
  imageIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Product.images",
      // References images from parent product
    },
  ],
  primaryImageId: {
    type: Schema.Types.ObjectId,
    // Primary display image for this variant
  },
  imageMetadata: [
    {
      imageId: Schema.Types.ObjectId,
      displayOrder: Number,
      isPrimary: Boolean,
      addedAt: Date,
    },
  ],

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductVariant", variantSchema);
```

---

## API Endpoints

### 1. Get Variant with Images

```http
GET /api/products/:productId/variants/:variantId
```

**Response (200):**

```json
{
  "success": true,
  "variant": {
    "variantId": "507f1f77bcf86cd799439011",
    "productId": "507f1f77bcf86cd799439001",
    "name": "Red - Medium",
    "sku": "SHIRT-RED-M",
    "attributes": {
      "color": "Red",
      "size": "Medium"
    },
    "price": 1299,
    "stock": 50,
    "imageIds": ["img_001", "img_002"],
    "primaryImageId": "img_001",
    "images": [
      {
        "imageId": "img_001",
        "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-1.jpg",
        "imagePath": "/assets/products/product-red-1.jpg",
        "alt": "Red Shirt Front View",
        "displayOrder": 1,
        "isPrimary": true
      },
      {
        "imageId": "img_002",
        "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-2.jpg",
        "imagePath": "/assets/products/product-red-2.jpg",
        "alt": "Red Shirt Back View",
        "displayOrder": 2,
        "isPrimary": false
      }
    ]
  },
  "productImages": [
    {
      "imageId": "img_001",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-1.jpg",
      "alt": "Red Shirt Front View"
    },
    {
      "imageId": "img_002",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-2.jpg",
      "alt": "Red Shirt Back View"
    },
    {
      "imageId": "img_003",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-blue-1.jpg",
      "alt": "Blue Shirt Front View"
    },
    {
      "imageId": "img_004",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-blue-2.jpg",
      "alt": "Blue Shirt Back View"
    }
  ]
}
```

### 2. Update Variant Images

```http
PUT /api/products/:productId/variants/:variantId/images
```

**Request:**

```json
{
  "imageIds": ["img_001", "img_002"],
  "primaryImageId": "img_001"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Variant images updated successfully",
  "variant": {
    "variantId": "507f1f77bcf86cd799439011",
    "imageIds": ["img_001", "img_002"],
    "primaryImageId": "img_001",
    "images": [...]
  }
}
```

### 3. Set Primary Image for Variant

```http
PUT /api/products/:productId/variants/:variantId/primary-image
```

**Request:**

```json
{
  "imageId": "img_002"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Primary image updated",
  "primaryImageId": "img_002"
}
```

### 4. Reorder Variant Images

```http
PUT /api/products/:productId/variants/:variantId/reorder-images
```

**Request:**

```json
{
  "imageOrder": ["img_002", "img_001", "img_003"]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Images reordered successfully",
  "imageIds": ["img_002", "img_001", "img_003"]
}
```

### 5. Get All Product Images (for variant picker)

```http
GET /api/products/:productId/images
```

**Response (200):**

```json
{
  "success": true,
  "images": [
    {
      "imageId": "img_001",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-1.jpg",
      "alt": "Red Shirt Front View",
      "uploadedAt": "2026-05-18T10:30:00Z"
    },
    {
      "imageId": "img_002",
      "imageUrl": "https://ik.imagekit.io/quickfynd/product-red-2.jpg",
      "alt": "Red Shirt Back View",
      "uploadedAt": "2026-05-18T10:31:00Z"
    }
    // ... more images
  ],
  "total": 8
}
```

### 6. Add Image to Variant

```http
POST /api/products/:productId/variants/:variantId/images
```

**Request:**

```json
{
  "imageId": "img_003"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Image added to variant",
  "imageIds": ["img_001", "img_002", "img_003"]
}
```

### 7. Remove Image from Variant

```http
DELETE /api/products/:productId/variants/:variantId/images/:imageId
```

**Response (200):**

```json
{
  "success": true,
  "message": "Image removed from variant",
  "imageIds": ["img_001", "img_002"]
}
```

---

## Frontend Implementation (React)

### Variant Image Picker Component

```jsx
import React, { useState, useEffect } from "react";
import "./VariantImagePicker.css";

export function VariantImagePicker({ productId, variantId, onSave }) {
  const [variant, setVariant] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [primaryImageId, setPrimaryImageId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVariantAndImages();
  }, [productId, variantId]);

  const fetchVariantAndImages = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `/api/products/${productId}/variants/${variantId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();

      setVariant(data.variant);
      setProductImages(data.productImages);
      setSelectedImageIds(data.variant.imageIds);
      setPrimaryImageId(data.variant.primaryImageId);
    } catch (error) {
      console.error("Error fetching variant images:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (imageId) => {
    setSelectedImageIds((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );

    // Auto-set first selected image as primary if none set
    if (selectedImageIds.length === 0 && !primaryImageId) {
      setPrimaryImageId(imageId);
    }
  };

  const handleSetPrimary = (imageId) => {
    setPrimaryImageId(imageId);
  };

  const handleReorderImages = (fromIndex, toIndex) => {
    const newOrder = [...selectedImageIds];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setSelectedImageIds(newOrder);
  };

  const handleSave = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `/api/products/${productId}/variants/${variantId}/images`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageIds: selectedImageIds,
            primaryImageId,
          }),
        },
      );

      const data = await res.json();
      if (data.success) {
        alert("Images saved successfully!");
        onSave(data.variant);
      } else {
        alert("Error saving images: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="variant-image-picker">
      <h3>Select Images for Variant: {variant?.name}</h3>

      <div className="image-selector">
        <h4>Available Images from Product</h4>
        <div className="image-gallery">
          {productImages.map((img) => (
            <div key={img.imageId} className="image-item">
              <input
                type="checkbox"
                checked={selectedImageIds.includes(img.imageId)}
                onChange={() => handleImageSelect(img.imageId)}
                id={`img_${img.imageId}`}
              />
              <label htmlFor={`img_${img.imageId}`}>
                <img src={img.imageUrl} alt={img.alt} className="thumbnail" />
                <span className="image-alt">{img.alt}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {selectedImageIds.length > 0 && (
        <div className="selected-images">
          <h4>Selected Images (Drag to Reorder)</h4>
          <div className="selected-list">
            {selectedImageIds.map((imageId, index) => {
              const image = productImages.find(
                (img) => img.imageId === imageId,
              );
              return (
                <div key={imageId} className="selected-item">
                  <span className="order-number">{index + 1}</span>
                  <img
                    src={image?.imageUrl}
                    alt={image?.alt}
                    className="mini-thumb"
                  />
                  <span className="image-name">{image?.alt}</span>
                  {primaryImageId === imageId && (
                    <span className="badge primary">Primary</span>
                  )}
                  <button
                    onClick={() => handleSetPrimary(imageId)}
                    className="btn-primary-small"
                  >
                    Set Primary
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIds(
                        selectedImageIds.filter((id) => id !== imageId),
                      )
                    }
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={() => window.history.back()} className="btn-cancel">
          Cancel
        </button>
        <button onClick={handleSave} className="btn-save">
          Save Images
        </button>
      </div>
    </div>
  );
}
```

### Variant Card Component (showing images)

```jsx
export function VariantCard({ variant, productImages, onEdit }) {
  const primaryImage = productImages.find(
    (img) => img.imageId === variant.primaryImageId,
  );

  return (
    <div className="variant-card">
      <div className="variant-image">
        {primaryImage ? (
          <img src={primaryImage.imageUrl} alt={primaryImage.alt} />
        ) : (
          <div className="no-image">No Image</div>
        )}
      </div>
      <div className="variant-info">
        <h4>{variant.name}</h4>
        <p>SKU: {variant.sku}</p>
        <p>Price: ₹{variant.price}</p>
        <p>Stock: {variant.stock} units</p>
        <p className="image-count">Images: {variant.imageIds.length}</p>
      </div>
      <div className="variant-actions">
        <button onClick={() => onEdit(variant)} className="btn-edit">
          Change Images
        </button>
      </div>
    </div>
  );
}
```

---

## CSS Styling

```css
/* VariantImagePicker.css */

.variant-image-picker {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin: 20px 0;
}

.variant-image-picker h3 {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

.image-selector {
  margin-bottom: 30px;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.image-item {
  position: relative;
}

.image-item input[type="checkbox"] {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  z-index: 10;
}

.image-item label {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.image-item .thumbnail {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 2px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;
}

.image-item input[type="checkbox"]:checked + label .thumbnail {
  border-color: #007bff;
  box-shadow: 0 0 8px rgba(0, 123, 255, 0.3);
}

.image-alt {
  font-size: 12px;
  text-align: center;
  color: #666;
  max-width: 120px;
  word-break: break-word;
}

.selected-images {
  margin-bottom: 30px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.order-number {
  min-width: 30px;
  font-weight: 600;
  color: #007bff;
  font-size: 16px;
}

.mini-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.image-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge.primary {
  background-color: #ffc107;
  color: #333;
}

.btn-primary-small {
  padding: 6px 12px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.btn-primary-small:hover {
  background-color: #218838;
}

.btn-remove {
  padding: 6px 10px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-remove:hover {
  background-color: #c82333;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-cancel,
.btn-save {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

.btn-save {
  background-color: #007bff;
  color: white;
}

.btn-save:hover {
  background-color: #0056b3;
}

/* Variant Card Styles */
.variant-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
}

.variant-image {
  min-width: 100px;
  width: 100px;
  height: 100px;
}

.variant-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.no-image {
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #999;
  font-size: 12px;
}

.variant-info {
  flex: 1;
}

.variant-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.variant-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.image-count {
  color: #007bff;
  font-weight: 600;
}

.variant-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.btn-edit {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-edit:hover {
  background-color: #0056b3;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .variant-card {
    flex-direction: column;
  }

  .variant-image {
    width: 100%;
    height: 200px;
  }

  .actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-save {
    width: 100%;
  }
}
```

---

## Backend Implementation (Node.js/Express)

```javascript
// routes/variantImages.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { authSeller } = require("../middleware/auth");

// Get variant with images
router.get(
  "/products/:productId/variants/:variantId",
  authSeller,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const variant = product.variants.find(
        (v) => v._id.toString() === req.params.variantId,
      );
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }

      // Get variant images with details
      const variantImages = variant.imageIds.map((imageId) => {
        const image = product.images.find(
          (img) => img._id.toString() === imageId.toString(),
        );
        return {
          imageId: image._id,
          imageUrl: image.url,
          imagePath: image.path,
          alt: image.alt,
        };
      });

      res.json({
        success: true,
        variant: {
          variantId: variant._id,
          productId: product._id,
          name: variant.name,
          sku: variant.sku,
          attributes: variant.attributes,
          price: variant.price,
          stock: variant.stock,
          imageIds: variant.imageIds.map((id) => id.toString()),
          primaryImageId: variant.primaryImageId?.toString(),
          images: variantImages,
        },
        productImages: product.images.map((img) => ({
          imageId: img._id,
          imageUrl: img.url,
          alt: img.alt,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update variant images
router.put(
  "/products/:productId/variants/:variantId/images",
  authSeller,
  async (req, res) => {
    try {
      const { imageIds, primaryImageId } = req.body;

      if (!imageIds || imageIds.length === 0) {
        return res.status(400).json({ error: "At least one image required" });
      }

      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const variant = product.variants.find(
        (v) => v._id.toString() === req.params.variantId,
      );
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }

      // Validate all imageIds exist in product
      const invalidIds = imageIds.filter(
        (id) => !product.images.some((img) => img._id.toString() === id),
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: "Invalid image IDs provided" });
      }

      // Update variant
      variant.imageIds = imageIds.map((id) => id);
      variant.primaryImageId = primaryImageId;
      variant.updatedAt = new Date();

      await product.save();

      res.json({
        success: true,
        message: "Variant images updated successfully",
        variant: {
          variantId: variant._id,
          imageIds: variant.imageIds.map((id) => id.toString()),
          primaryImageId: variant.primaryImageId?.toString(),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Set primary image
router.put(
  "/products/:productId/variants/:variantId/primary-image",
  authSeller,
  async (req, res) => {
    try {
      const { imageId } = req.body;

      const product = await Product.findById(req.params.productId);
      const variant = product.variants.find(
        (v) => v._id.toString() === req.params.variantId,
      );

      if (!variant.imageIds.includes(imageId)) {
        return res.status(400).json({ error: "Image not in variant" });
      }

      variant.primaryImageId = imageId;
      await product.save();

      res.json({
        success: true,
        message: "Primary image updated",
        primaryImageId: variant.primaryImageId,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Reorder images
router.put(
  "/products/:productId/variants/:variantId/reorder-images",
  authSeller,
  async (req, res) => {
    try {
      const { imageOrder } = req.body;

      const product = await Product.findById(req.params.productId);
      const variant = product.variants.find(
        (v) => v._id.toString() === req.params.variantId,
      );

      variant.imageIds = imageOrder.map((id) => id);
      await product.save();

      res.json({
        success: true,
        message: "Images reordered successfully",
        imageIds: variant.imageIds.map((id) => id.toString()),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Remove image from variant
router.delete(
  "/products/:productId/variants/:variantId/images/:imageId",
  authSeller,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);
      const variant = product.variants.find(
        (v) => v._id.toString() === req.params.variantId,
      );

      if (variant.imageIds.length === 1) {
        return res
          .status(400)
          .json({ error: "Variant must have at least one image" });
      }

      variant.imageIds = variant.imageIds.filter(
        (id) => id.toString() !== req.params.imageId,
      );

      // Reset primary if it was the removed image
      if (variant.primaryImageId?.toString() === req.params.imageId) {
        variant.primaryImageId = variant.imageIds[0];
      }

      await product.save();

      res.json({
        success: true,
        message: "Image removed from variant",
        imageIds: variant.imageIds.map((id) => id.toString()),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
```

---

## Testing Checklist

- [ ] Get variant with all images loaded
- [ ] Display product image gallery
- [ ] Select/deselect images for variant
- [ ] Set primary image for variant
- [ ] Reorder variant images
- [ ] Save changes to database
- [ ] Variant displays correct primary image
- [ ] Mobile image picker works
- [ ] Min/max image validation
- [ ] Images persist after refresh
- [ ] All variant images are from product gallery
- [ ] Primary image is always included in variant
- [ ] Remove image (with min 1 image check)
- [ ] Add existing image to variant

---

## Business Rules

| Rule               | Details                                          |
| ------------------ | ------------------------------------------------ |
| **Minimum Images** | Each variant must have at least 1 image          |
| **Maximum Images** | No hard limit (recommend max 10 per variant)     |
| **Image Source**   | Images must be from product's main gallery       |
| **Primary Image**  | Must be one of the selected images               |
| **Image Reuse**    | Same image can be used by multiple variants      |
| **Image Deletion** | Deleting product image removes from all variants |

---

**Questions for Implementation?**

- Should variants auto-generate images based on color matching?
- Need bulk image assignment across multiple variants?
- Should there be image templates per variant attribute?
- Do you need image crop/zoom per variant?
