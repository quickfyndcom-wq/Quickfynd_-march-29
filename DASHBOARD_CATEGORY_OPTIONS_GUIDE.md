# Dashboard Category Options - Below Home Banner

**For:** App Developer  
**Last Updated:** May 18, 2026  
**Feature:** Category/Product options display below home banner with images

---

## Overview

The **Dashboard Category Options** section displays category tiles/cards below the home banner that link to category pages or product listings. Each option includes:

- Category image
- Category name
- Click-to-navigate functionality
- Mobile responsive design

---

## Feature Location

**On Dashboard:**

- Position: Immediately below Home Banner
- Layout: Horizontal scrollable (mobile) / Grid (desktop)
- Content: 7-10 category options visible

---

## Visual Layout

### Desktop View (Grid Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HOME BANNER (Hero Image/Slider)                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Category Options Section                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │          │  │          │  │          │  │          │            │
│  │  Image   │  │  Image   │  │  Image   │  │  Image   │   ...     │
│  │          │  │          │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│  Ethnic Wear   Western       Menswear      Footwear                 │
│                Dresses                                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │          │  │          │  │          │  │          │            │
│  │  Image   │  │  Image   │  │  Image   │  │  Image   │            │
│  │          │  │          │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│  Home Decor    Beauty        Accessories    Electronics             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile View (Horizontal Scrollable)

```
┌──────────────────────────────────┐
│ HOME BANNER                      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ← Category Options ➜             │
├──────────────────────────────────┤
│                                  │
│ ┌──────┐  ┌──────┐  ┌──────┐    │
│ │Image │  │Image │  │Image │ ➜  │
│ │      │  │      │  │      │    │
│ └──────┘  └──────┘  └──────┘    │
│ Ethnic   Western   Menswear     │
│ Wear     Dresses                │
│                                  │
│ (Scroll horizontally)            │
│                                  │
└──────────────────────────────────┘
```

---

## Data Structure

### Category Option Model

```javascript
{
  categoryId: ObjectId,
  categoryName: String,           // e.g., "Ethnic Wear", "Electronics"
  categorySlug: String,           // e.g., "ethnic-wear", "electronics"
  imageUrl: String,              // ImageKit URL
  imagePath: String,             // e.g., "/category-images/ethnic-wear.jpg"
  displayOrder: Number,          // 1-10 (sort order)
  isActive: Boolean,             // Toggle visibility
  navigateUrl: String,           // e.g., "/category/ethnic-wear" or "/shop?cat=ethnic-wear"
  description: String,           // Optional hover text
  createdAt: Date,
  updatedAt: Date
}
```

### Database Schema (MongoDB)

```javascript
// models/DashboardCategory.js
const categorySchema = new Schema({
  categoryName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  categorySlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  imageUrl: {
    type: String,
    required: true,
    // ImageKit URL (e.g., https://ik.imagekit.io/quickfynd/...)
  },
  imagePath: {
    type: String,
    required: true,
    // Local reference path (e.g., /assets/categories/ethnic-wear.jpg)
  },
  imageAlt: {
    type: String,
    default: "",
    // Alt text for accessibility
  },
  displayOrder: {
    type: Number,
    default: 0,
    // Lower number appears first
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  navigateUrl: {
    type: String,
    required: true,
    // Where clicking the tile navigates to
  },
  description: String,
  metadata: {
    uploadedBy: String,
    uploadedDate: Date,
    imageSize: Number, // bytes
    imageDimensions: {
      width: Number,
      height: Number,
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DashboardCategory", categorySchema);
```

---

## Image Upload Configuration

### Image Specifications

| Property        | Specification         | Notes                      |
| --------------- | --------------------- | -------------------------- |
| **Format**      | JPG, PNG, WebP        | JPG recommended for photos |
| **Dimensions**  | 400x400px (square)    | Aspect ratio: 1:1          |
| **File Size**   | Max 2MB               | Optimized for mobile       |
| **Resolution**  | 72-96 DPI             | Web-optimized              |
| **Color Mode**  | RGB                   | Not CMYK                   |
| **Compression** | High (80-85% quality) | Reduces load time          |

### Recommended Image Sizes

- **Desktop:** 400x400px @ 2x (800x800px for retina displays)
- **Mobile:** 300x300px @ 2x (600x600px for retina displays)
- **Thumbnail:** 150x150px for caching

### Image Path Naming Convention

```
/assets/
  └─ category-images/
      ├─ ethnic-wear.jpg
      ├─ western-dresses.jpg
      ├─ menswear.jpg
      ├─ footwear.jpg
      ├─ home-decor.jpg
      ├─ beauty.jpg
      ├─ accessories.jpg
      ├─ electronics.jpg
      └─ [category-slug].jpg
```

---

## API Endpoints

### 1. Get All Dashboard Categories

```http
GET /api/dashboard/categories
```

**Query Params (optional):**

```
?limit=10&offset=0&sortBy=displayOrder&isActive=true
```

**Response (200):**

```json
{
  "success": true,
  "categories": [
    {
      "categoryId": "507f1f77bcf86cd799439011",
      "categoryName": "Ethnic Wear",
      "categorySlug": "ethnic-wear",
      "imageUrl": "https://ik.imagekit.io/quickfynd/ethnic-wear.jpg?tr=w-400,h-400",
      "imagePath": "/assets/category-images/ethnic-wear.jpg",
      "imageAlt": "Ethnic Wear Category",
      "displayOrder": 1,
      "isActive": true,
      "navigateUrl": "/category/ethnic-wear",
      "description": "Traditional ethnic clothing"
    },
    {
      "categoryId": "507f1f77bcf86cd799439012",
      "categoryName": "Western Dresses",
      "categorySlug": "western-dresses",
      "imageUrl": "https://ik.imagekit.io/quickfynd/western-dresses.jpg?tr=w-400,h-400",
      "imagePath": "/assets/category-images/western-dresses.jpg",
      "imageAlt": "Western Dresses Category",
      "displayOrder": 2,
      "isActive": true,
      "navigateUrl": "/category/western-dresses",
      "description": "Modern western clothing"
    }
    // ... more categories
  ],
  "total": 8,
  "offset": 0,
  "limit": 10
}
```

### 2. Get Single Category

```http
GET /api/dashboard/categories/:categorySlug
```

**Response (200):**

```json
{
  "success": true,
  "category": {
    "categoryId": "507f1f77bcf86cd799439011",
    "categoryName": "Ethnic Wear",
    "categorySlug": "ethnic-wear",
    "imageUrl": "https://ik.imagekit.io/quickfynd/ethnic-wear.jpg",
    "imagePath": "/assets/category-images/ethnic-wear.jpg",
    "imageAlt": "Ethnic Wear",
    "displayOrder": 1,
    "isActive": true,
    "navigateUrl": "/category/ethnic-wear",
    "description": "Traditional ethnic clothing"
  }
}
```

### 3. Create Dashboard Category (Admin)

```http
POST /api/admin/dashboard/categories
```

**Headers:**

```
Authorization: Bearer {adminToken}
Content-Type: multipart/form-data
```

**Request Form Data:**

```
- categoryName: "Ethnic Wear"
- categorySlug: "ethnic-wear"
- navigateUrl: "/category/ethnic-wear"
- displayOrder: 1
- isActive: true
- description: "Traditional ethnic clothing"
- imageFile: [File object]
```

**Response (201):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "category": {
    "categoryId": "507f1f77bcf86cd799439011",
    "categoryName": "Ethnic Wear",
    "imageUrl": "https://ik.imagekit.io/quickfynd/ethnic-wear.jpg",
    "imagePath": "/assets/category-images/ethnic-wear.jpg"
  }
}
```

### 4. Update Dashboard Category (Admin)

```http
PUT /api/admin/dashboard/categories/:categoryId
```

**Request:**

```json
{
  "categoryName": "Ethnic Wear",
  "displayOrder": 1,
  "isActive": true,
  "description": "Updated description"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "category": { ... }
}
```

### 5. Upload Category Image

```http
POST /api/admin/dashboard/categories/upload-image
```

**Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer {adminToken}
```

**Form Data:**

```
- imageFile: [File object] (required)
- categorySlug: "ethnic-wear" (optional, for naming)
```

**Response (200):**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "imageUrl": "https://ik.imagekit.io/quickfynd/ethnic-wear.jpg",
  "imagePath": "/assets/category-images/ethnic-wear.jpg",
  "imageDimensions": {
    "width": 400,
    "height": 400
  },
  "fileSize": 156000
}
```

### 6. Delete Dashboard Category (Admin)

```http
DELETE /api/admin/dashboard/categories/:categoryId
```

**Response (200):**

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

### 7. Reorder Categories (Admin)

```http
PUT /api/admin/dashboard/categories/reorder
```

**Request:**

```json
{
  "categories": [
    { "categoryId": "id1", "displayOrder": 1 },
    { "categoryId": "id2", "displayOrder": 2 },
    { "categoryId": "id3", "displayOrder": 3 }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

---

## Frontend Implementation (React)

### Desktop Component

```jsx
import React, { useState, useEffect } from "react";
import "./DashboardCategories.css";

export function DashboardCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(
        "/api/dashboard/categories?isActive=true&sortBy=displayOrder",
      );
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading categories...</div>;

  return (
    <section className="dashboard-categories">
      <div className="categories-grid">
        {categories.map((category) => (
          <a
            key={category.categoryId}
            href={category.navigateUrl}
            className="category-tile"
            title={category.description}
          >
            <div className="category-image-wrapper">
              <img
                src={category.imageUrl}
                alt={category.imageAlt || category.categoryName}
                loading="lazy"
                className="category-image"
              />
            </div>
            <div className="category-name">{category.categoryName}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
```

### Mobile Component (Horizontal Scroll)

```jsx
import React, { useState, useEffect, useRef } from "react";
import "./DashboardCategoriesMobile.css";

export function DashboardCategoriesMobile() {
  const [categories, setCategories] = useState([]);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/dashboard/categories?isActive=true");
    const data = await res.json();
    if (data.success) setCategories(data.categories);
  };

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    const scrollAmount = 300;
    if (direction === "left") {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  };

  return (
    <section className="dashboard-categories-mobile">
      <div className="scroll-container" ref={scrollContainerRef}>
        {categories.map((category) => (
          <a
            key={category.categoryId}
            href={category.navigateUrl}
            className="category-tile-mobile"
          >
            <img
              src={category.imageUrl}
              alt={category.imageAlt}
              className="category-image"
            />
            <p className="category-name">{category.categoryName}</p>
          </a>
        ))}
      </div>
      <button className="scroll-btn left" onClick={() => scroll("left")}>
        ←
      </button>
      <button className="scroll-btn right" onClick={() => scroll("right")}>
        →
      </button>
    </section>
  );
}
```

---

## CSS Styling

### Desktop Styles

```css
/* DashboardCategories.css */

.dashboard-categories {
  padding: 30px 20px;
  background-color: #f9f9f9;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.category-tile {
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  cursor: pointer;
}

.category-tile:hover {
  transform: translateY(-10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.category-image-wrapper {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-name {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: #333;
  max-width: 150px;
}
```

### Mobile Styles

```css
/* DashboardCategoriesMobile.css */

.dashboard-categories-mobile {
  position: relative;
  padding: 20px 0;
  background-color: #f9f9f9;
}

.scroll-container {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 15px;
  gap: 15px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}

.scroll-container::-webkit-scrollbar {
  height: 4px;
}

.scroll-container::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}

.category-tile-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  scroll-snap-align: start;
}

.category-tile-mobile .category-image {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}

.category-tile-mobile .category-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #333;
  max-width: 110px;
  word-wrap: break-word;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
  z-index: 10;
  display: none;
}

.scroll-btn:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

@media (min-width: 768px) {
  .scroll-btn {
    display: block;
  }
}

.scroll-btn.left {
  left: 10px;
}

.scroll-btn.right {
  right: 10px;
}

@media (max-width: 480px) {
  .scroll-container {
    padding: 10px;
    gap: 10px;
  }

  .category-tile-mobile .category-image {
    width: 100px;
    height: 100px;
  }

  .category-tile-mobile .category-name {
    font-size: 11px;
    max-width: 90px;
  }
}
```

---

## Responsive Breakpoints

| Device                     | Grid Columns | Tile Size | Scroll             |
| -------------------------- | ------------ | --------- | ------------------ |
| **Mobile (< 480px)**       | Scrollable   | 100px     | Horizontal         |
| **Tablet (480px - 768px)** | 3-4 columns  | 120px     | Horizontal or Grid |
| **Desktop (> 768px)**      | 6-8 columns  | 140px     | Grid               |

---

## Backend Implementation (Node.js/Express)

```javascript
// routes/dashboardCategories.js
const express = require("express");
const router = express.Router();
const DashboardCategory = require("../models/DashboardCategory");
const { uploadImage } = require("../middleware/imageUpload");
const { authAdmin } = require("../middleware/auth");

// Get all active categories
router.get("/", async (req, res) => {
  try {
    const { isActive, limit = 10, offset = 0 } = req.query;
    const filter =
      isActive !== undefined ? { isActive: isActive === "true" } : {};

    const categories = await DashboardCategory.find(filter)
      .sort({ displayOrder: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await DashboardCategory.countDocuments(filter);

    res.json({
      success: true,
      categories,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category (admin)
router.post(
  "/",
  authAdmin,
  uploadImage.single("imageFile"),
  async (req, res) => {
    try {
      const {
        categoryName,
        categorySlug,
        navigateUrl,
        displayOrder,
        description,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "Image file required" });
      }

      const newCategory = new DashboardCategory({
        categoryName,
        categorySlug:
          categorySlug || categoryName.toLowerCase().replace(/\s+/g, "-"),
        imageUrl: req.file.imageUrl, // From ImageKit upload
        imagePath: `/assets/category-images/${req.file.filename}`,
        imageAlt: categoryName,
        navigateUrl,
        displayOrder: parseInt(displayOrder) || 0,
        description,
        metadata: {
          uploadedBy: req.user.userId,
          uploadedDate: new Date(),
          imageSize: req.file.size,
          imageDimensions: {
            width: req.file.width || 400,
            height: req.file.height || 400,
          },
        },
      });

      await newCategory.save();

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        category: newCategory,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Update category (admin)
router.put("/:categoryId", authAdmin, async (req, res) => {
  try {
    const { categoryName, displayOrder, isActive, description } = req.body;

    const category = await DashboardCategory.findByIdAndUpdate(
      req.params.categoryId,
      {
        categoryName,
        displayOrder,
        isActive,
        description,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete category (admin)
router.delete("/:categoryId", authAdmin, async (req, res) => {
  try {
    await DashboardCategory.findByIdAndDelete(req.params.categoryId);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reorder categories (admin)
router.put("/reorder", authAdmin, async (req, res) => {
  try {
    const { categories } = req.body;

    for (const cat of categories) {
      await DashboardCategory.findByIdAndUpdate(cat.categoryId, {
        displayOrder: cat.displayOrder,
      });
    }

    res.json({ success: true, message: "Categories reordered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## Image Upload/Management

### ImageKit Integration

```javascript
// middleware/imageUpload.js
const ImageKit = require("imagekit");
const multer = require("multer");

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, WebP allowed."));
    }
  },
});

const uploadToImageKit = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const result = await imageKit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: "/quickfynd/category-images/",
    });

    req.file.imageUrl = result.url;
    req.file.imageKitId = result.fileId;
    req.file.filename = result.name;
    req.file.width = result.width;
    req.file.height = result.height;
    req.file.size = result.size;

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: "Image upload failed", details: error.message });
  }
};

module.exports = { upload, uploadToImageKit };
```

---

## Image Upload Paths

### Recommended Structure

```
Public URLs (via ImageKit):
https://ik.imagekit.io/quickfynd/category-images/ethnic-wear.jpg
https://ik.imagekit.io/quickfynd/category-images/western-dresses.jpg
https://ik.imagekit.io/quickfynd/category-images/menswear.jpg

Local Asset Paths (for fallback):
/assets/category-images/ethnic-wear.jpg
/assets/category-images/western-dresses.jpg
/assets/category-images/menswear.jpg

ImageKit Transformations:
https://ik.imagekit.io/quickfynd/category-images/ethnic-wear.jpg?tr=w-400,h-400,q-80
https://ik.imagekit.io/quickfynd/category-images/ethnic-wear.jpg?tr=w-150,h-150,q-75 (thumbnail)
```

---

## Category List (Predefined Options)

| Category Name   | Category Slug   | Image Path                                  | Navigate URL              | Order |
| --------------- | --------------- | ------------------------------------------- | ------------------------- | ----- |
| Ethnic Wear     | ethnic-wear     | /assets/category-images/ethnic-wear.jpg     | /category/ethnic-wear     | 1     |
| Western Dresses | western-dresses | /assets/category-images/western-dresses.jpg | /category/western-dresses | 2     |
| Menswear        | menswear        | /assets/category-images/menswear.jpg        | /category/menswear        | 3     |
| Footwear        | footwear        | /assets/category-images/footwear.jpg        | /category/footwear        | 4     |
| Home Decor      | home-decor      | /assets/category-images/home-decor.jpg      | /category/home-decor      | 5     |
| Beauty          | beauty          | /assets/category-images/beauty.jpg          | /category/beauty          | 6     |
| Accessories     | accessories     | /assets/category-images/accessories.jpg     | /category/accessories     | 7     |
| Electronics     | electronics     | /assets/category-images/electronics.jpg     | /category/electronics     | 8     |

---

## Admin Dashboard Component (Upload)

```jsx
import React, { useState } from "react";
import "./AdminCategoryUpload.css";

export function AdminCategoryUpload() {
  const [form, setForm] = useState({
    categoryName: "",
    categorySlug: "",
    navigateUrl: "",
    displayOrder: 0,
    description: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData();
    formData.append("categoryName", form.categoryName);
    formData.append(
      "categorySlug",
      form.categorySlug || form.categoryName.toLowerCase().replace(/\s+/g, "-"),
    );
    formData.append("navigateUrl", form.navigateUrl);
    formData.append("displayOrder", form.displayOrder);
    formData.append("description", form.description);
    formData.append("imageFile", imageFile);

    try {
      const token = await getAuthToken(); // Your auth method
      const res = await fetch("/api/admin/dashboard/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert("Category uploaded successfully!");
        setForm({});
        setImageFile(null);
        setPreview(null);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-category-upload">
      <h2>Upload Dashboard Category</h2>

      <div className="form-group">
        <label>Category Name *</label>
        <input
          type="text"
          value={form.categoryName}
          onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Category Slug (auto-generated)</label>
        <input
          type="text"
          value={form.categorySlug}
          onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
          placeholder="ethnic-wear"
        />
      </div>

      <div className="form-group">
        <label>Navigate URL *</label>
        <input
          type="text"
          value={form.navigateUrl}
          onChange={(e) => setForm({ ...form, navigateUrl: e.target.value })}
          placeholder="/category/ethnic-wear"
          required
        />
      </div>

      <div className="form-group">
        <label>Display Order</label>
        <input
          type="number"
          value={form.displayOrder}
          onChange={(e) =>
            setForm({ ...form, displayOrder: parseInt(e.target.value) })
          }
          min="0"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Image (400x400px, JPG/PNG/WebP, max 2MB) *</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          required
        />
        {preview && (
          <img src={preview} alt="Preview" className="image-preview" />
        )}
      </div>

      <button type="submit" disabled={uploading} className="submit-btn">
        {uploading ? "Uploading..." : "Upload Category"}
      </button>
    </form>
  );
}
```

---

## Testing Checklist

- [ ] Categories display on dashboard below banner
- [ ] Desktop: Grid layout (6-8 columns)
- [ ] Mobile: Horizontal scroll view
- [ ] Images load correctly from ImageKit
- [ ] Click navigates to category page
- [ ] Responsive on all device sizes
- [ ] Lazy loading works
- [ ] Display order respected
- [ ] Inactive categories hidden
- [ ] Admin can upload/edit/delete categories
- [ ] Image validation (format, size)
- [ ] Alt text displays on image failure
- [ ] Performance: Load time < 2s

---

## Performance Optimization

```javascript
// Image optimization with lazy loading
<img
  src={category.imageUrl + "?tr=w-400,h-400,q-75"}
  srcSet={`
    ${category.imageUrl}?tr=w-300,h-300,q-75 300w,
    ${category.imageUrl}?tr=w-600,h-600,q-80 600w,
    ${category.imageUrl}?tr=w-400,h-400,q-80 400w
  `}
  sizes="(max-width: 480px) 100px, (max-width: 768px) 120px, 140px"
  loading="lazy"
  alt={category.imageAlt}
/>
```

---

**Questions for Implementation?**

- Should categories be searchable?
- Should there be a featured/highlighted category section?
- Do you need analytics on category clicks?
- Should categories support subcategories?
- Need pagination for more than 10 categories?
