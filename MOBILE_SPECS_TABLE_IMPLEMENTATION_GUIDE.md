# Mobile Specs Table - Complete Implementation Guide

This guide covers the complete end-to-end implementation of the Mobile Specs Table feature, from backend APIs to frontend UI components.

## Overview

The Mobile Specs Table allows sellers to define a table of key specifications that display on mobile devices when viewing a product. The table consists of:
- **Toggle**: Enable/disable the specs table for a product
- **Rows**: Each row has a label (e.g., "Display") and value (e.g., "6.7-inch AMOLED")

## Data Model

### Product Schema (Backend)

```javascript
// models/Product.js
{
  // ... other fields ...
  
  mobileSpecsEnabled: {
    type: Boolean,
    default: false,
    description: "Whether to show mobile specs table on mobile app"
  },
  
  mobileSpecs: {
    type: [
      {
        label: {
          type: String,
          required: true,
          maxlength: 100,
          trim: true
        },
        value: {
          type: String,
          required: true,
          maxlength: 500,
          trim: true
        }
      }
    ],
    default: [],
    description: "Array of spec label-value pairs"
  }
}
```

### API Payload Contract

#### Create Product Request
```javascript
POST /api/store/product
Content-Type: multipart/form-data

{
  name: "Samsung Galaxy S24",
  description: "...",
  // ... other fields ...
  
  // Mobile specs fields
  mobileSpecsEnabled: "true",
  mobileSpecs: '[{"label":"Display","value":"6.7-inch AMOLED"},{"label":"RAM","value":"8GB"},{"label":"Storage","value":"256GB"}]'
}
```

#### Create Product Response
```json
{
  "message": "Product added successfully",
  "product": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Samsung Galaxy S24",
    "mobileSpecsEnabled": true,
    "mobileSpecs": [
      { "label": "Display", "value": "6.7-inch AMOLED" },
      { "label": "RAM", "value": "8GB" },
      { "label": "Storage", "value": "256GB" }
    ],
    // ... other fields ...
  }
}
```

#### Update Product Request
```javascript
PUT /api/store/product
Content-Type: multipart/form-data

{
  productId: "507f1f77bcf86cd799439011",
  mobileSpecsEnabled: "true",
  mobileSpecs: '[{"label":"Battery","value":"5000mAh"},{"label":"Camera","value":"50MP"}]'
}
```

#### Fetch Product Response
```json
{
  "product": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Samsung Galaxy S24",
    "mobileSpecsEnabled": true,
    "mobileSpecs": [
      { "label": "Display", "value": "6.7-inch AMOLED" },
      { "label": "RAM", "value": "8GB" }
    ]
  }
}
```

## Backend Implementation

### 1. API Endpoint: POST /api/store/product (Create)

**File:** `app/api/store/product/route.js`

```javascript
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decodedToken = await admin.auth().verifyIdToken(token);
    const sellerId = decodedToken.uid;

    const formData = await req.formData();
    
    // Extract mobile specs from formData
    let mobileSpecsEnabled = formData.get('mobileSpecsEnabled') === 'true';
    let mobileSpecs = [];
    
    if (formData.get('mobileSpecs')) {
      try {
        const parsed = JSON.parse(formData.get('mobileSpecs'));
        mobileSpecs = parseMobileSpecs(parsed);
      } catch (e) {
        console.error('Invalid mobileSpecs JSON:', e);
        mobileSpecs = [];
      }
    }

    // If disabled, clear specs
    if (!mobileSpecsEnabled) {
      mobileSpecs = [];
    }

    const productData = {
      // ... other fields ...
      mobileSpecsEnabled,
      mobileSpecs,
      sellerId
    };

    const product = await Product.create(productData);

    // Safety write: ensure mobile specs fields persist
    await Product.collection.updateOne(
      { _id: product._id },
      { $set: { mobileSpecsEnabled, mobileSpecs } }
    );

    const createdProduct = await Product.findById(product._id).lean();
    return NextResponse.json(
      { message: "Product added successfully", product: createdProduct || product },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// Helper function
function parseMobileSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .filter(spec => spec && spec.label?.trim() && spec.value?.trim())
    .map(spec => ({
      label: spec.label.trim(),
      value: spec.value.trim()
    }))
    .slice(0, 20); // Max 20 specs per product
}
```

### 2. API Endpoint: PUT /api/store/product (Update)

**File:** `app/api/store/product/route.js`

```javascript
export async function PUT(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decodedToken = await admin.auth().verifyIdToken(token);
    const sellerId = decodedToken.uid;

    const formData = await req.formData();
    const productId = formData.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const existingProduct = await Product.findById(productId);
    if (!existingProduct || existingProduct.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
    }

    // Extract mobile specs if provided
    const updateData = {};
    if (formData.has('mobileSpecsEnabled')) {
      updateData.mobileSpecsEnabled = formData.get('mobileSpecsEnabled') === 'true';
    }
    if (formData.has('mobileSpecs')) {
      try {
        const parsed = JSON.parse(formData.get('mobileSpecs'));
        updateData.mobileSpecs = parseMobileSpecs(parsed);
      } catch (e) {
        updateData.mobileSpecs = [];
      }
    }

    // If disabling, clear specs
    if (updateData.mobileSpecsEnabled === false) {
      updateData.mobileSpecs = [];
    }

    let product = await Product.findByIdAndUpdate(productId, updateData, { new: true }).lean();

    // Safety write: persist mobile specs explicitly
    if (updateData.mobileSpecsEnabled !== undefined || updateData.mobileSpecs !== undefined) {
      await Product.collection.updateOne(
        { _id: product._id },
        { $set: {
          mobileSpecsEnabled: updateData.mobileSpecsEnabled ?? product.mobileSpecsEnabled,
          mobileSpecs: updateData.mobileSpecs ?? product.mobileSpecs
        }}
      );
      product = await Product.findById(productId).lean();
    }

    return NextResponse.json({ message: "Product updated successfully", product }, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
```

### 3. API Endpoint: GET /api/products (Fetch for Mobile)

**File:** `app/api/products/route.js`

Ensure the SELECT includes these fields:

```javascript
export async function GET(req) {
  try {
    const products = await Product.find()
      .select('name description price mobileSpecsEnabled mobileSpecs image category') // Include mobile specs
      .limit(50)
      .lean();

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

### 4. Validation Rules (Backend)

- `mobileSpecsEnabled`: Must be Boolean (convert from string)
- `mobileSpecs`: Must be Array of objects with `label` and `value`
- Max 20 specs per product
- Max 100 chars per label
- Max 500 chars per value
- Auto-trim whitespace from label and value
- Remove rows where label or value is empty
- If `mobileSpecsEnabled` is `false`, discard all specs

---

## Frontend Implementation

### 1. Dashboard: Product Form Component

**File:** `app/store/add-product/page.jsx`

```jsx
import { useState, useEffect } from 'react';

export default function AddProductPage() {
  const [productInfo, setProductInfo] = useState({
    name: '',
    description: '',
    // ... other fields ...
    mobileSpecsEnabled: false,
    mobileSpecs: [
      { label: '', value: '' }
    ]
  });

  // Load existing product for edit
  useEffect(() => {
    const loadProduct = async () => {
      if (productId) {
        const res = await fetch(`/api/store/product?productId=${productId}`);
        const data = await res.json();
        const product = data.product;
        
        setProductInfo(prev => ({
          ...prev,
          mobileSpecsEnabled: product.mobileSpecsEnabled || false,
          mobileSpecs: product.mobileSpecs?.length > 0 
            ? product.mobileSpecs 
            : [{ label: '', value: '' }]
        }));
      }
    };
    loadProduct();
  }, [productId]);

  // Handle toggle
  const handleMobileSpecsToggle = (e) => {
    setProductInfo(prev => ({
      ...prev,
      mobileSpecsEnabled: e.target.checked
    }));
  };

  // Add spec row
  const addSpecRow = () => {
    setProductInfo(prev => ({
      ...prev,
      mobileSpecs: [...prev.mobileSpecs, { label: '', value: '' }]
    }));
  };

  // Remove spec row
  const removeSpecRow = (index) => {
    if (productInfo.mobileSpecs.length > 1) {
      setProductInfo(prev => ({
        ...prev,
        mobileSpecs: prev.mobileSpecs.filter((_, i) => i !== index)
      }));
    }
  };

  // Update spec row
  const updateSpecRow = (index, field, value) => {
    setProductInfo(prev => {
      const newSpecs = [...prev.mobileSpecs];
      newSpecs[index] = { ...newSpecs[index], [field]: value };
      return { ...prev, mobileSpecs: newSpecs };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    // Add all fields
    formData.set('name', productInfo.name);
    // ... other fields ...
    
    // Add mobile specs fields
    formData.set('mobileSpecsEnabled', String(Boolean(productInfo.mobileSpecsEnabled)));
    formData.set('mobileSpecs', JSON.stringify(productInfo.mobileSpecs.filter(
      s => s.label.trim() || s.value.trim()
    )));

    const method = productInfo._id ? 'PUT' : 'POST';
    const endpoint = '/api/store/product';

    const res = await fetch(endpoint, {
      method,
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await res.json();
    if (res.ok) {
      console.log('Product saved:', result.product);
      // Redirect or show success
    } else {
      console.error('Error:', result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other form fields ... */}

      {/* Mobile Specs Section */}
      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Mobile Specs Table</h3>

        {/* Toggle */}
        <div style={{ marginBottom: '15px' }}>
          <label>
            <input
              type="checkbox"
              checked={productInfo.mobileSpecsEnabled}
              onChange={handleMobileSpecsToggle}
            />
            {' '}Enable Mobile Specs Table
          </label>
        </div>

        {/* Specs Table Editor */}
        {productInfo.mobileSpecsEnabled && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '8px' }}>Label</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px' }}>Value</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', width: '50px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {productInfo.mobileSpecs.map((spec, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g., Display"
                        value={spec.label}
                        onChange={(e) => updateSpecRow(index, 'label', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        maxLength="100"
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g., 6.7-inch AMOLED"
                        value={spec.value}
                        onChange={(e) => updateSpecRow(index, 'value', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        maxLength="500"
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeSpecRow(index)}
                        disabled={productInfo.mobileSpecs.length === 1}
                        style={{
                          padding: '5px 10px',
                          cursor: productInfo.mobileSpecs.length > 1 ? 'pointer' : 'not-allowed',
                          opacity: productInfo.mobileSpecs.length > 1 ? 1 : 0.5
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addSpecRow}
              style={{ marginTop: '10px', padding: '8px 15px' }}
            >
              Add Spec
            </button>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button type="submit" style={{ marginTop: '20px', padding: '10px 20px' }}>
        {productInfo._id ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );
}
```

### 2. Mobile App: Specs Table Display Component

**File:** `mobile-app/components/ProductSpecsTable.jsx` (Example for React Native or Web)

```jsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native'; // or use Web components

export function ProductSpecsTable({ product }) {
  // Only render if enabled and has specs
  if (!product.mobileSpecsEnabled || !product.mobileSpecs?.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Specifications</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.table}>
          {product.mobileSpecs.map((spec, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{spec.label}</Text>
              <Text style={styles.value}>{spec.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    width: 100,
    padding: 10,
    fontWeight: '600',
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  value: {
    flex: 1,
    minWidth: 150,
    padding: 10,
    color: '#333',
  },
});
```

---

## Testing & QA Checklist

### Backend API Tests

- [ ] **Create product with specs:**
  - [ ] POST `/api/store/product` with valid payload
  - [ ] Verify response includes `mobileSpecsEnabled: true` and `mobileSpecs` array
  - [ ] Confirm data persisted to database
  - [ ] Verify after page refresh, specs are still there

- [ ] **Create product without specs:**
  - [ ] POST with `mobileSpecsEnabled: false`
  - [ ] Verify `mobileSpecs` is empty array
  - [ ] Confirm toggle respected on fetch

- [ ] **Update product specs:**
  - [ ] PUT `/api/store/product` with new specs
  - [ ] Add, remove, modify rows
  - [ ] Verify all changes persisted

- [ ] **Validation:**
  - [ ] Test with 21+ specs (should truncate to 20)
  - [ ] Test with 101+ char labels (should reject or truncate)
  - [ ] Test with 501+ char values
  - [ ] Test with empty label/value (should filter out)
  - [ ] Test with malformed JSON (should default to empty)

- [ ] **Fetch products:**
  - [ ] GET `/api/products` returns `mobileSpecsEnabled` and `mobileSpecs`
  - [ ] GET `/api/products/by-slug/:slug` includes specs fields
  - [ ] GET `/api/products/batch` includes specs fields

### Frontend Dashboard Tests

- [ ] **Toggle behavior:**
  - [ ] Click checkbox to enable specs table
  - [ ] Add/edit/delete spec rows
  - [ ] Click save
  - [ ] Refresh page - toggle still enabled and rows present

- [ ] **Spec row management:**
  - [ ] Add new row - new empty row appears
  - [ ] Delete row (only when > 1 row exist)
  - [ ] Edit label/value text
  - [ ] Max char limits enforced (100 label, 500 value)

- [ ] **Disable & save:**
  - [ ] Enable specs, add rows, save
  - [ ] Disable toggle, save
  - [ ] Refresh page - should be disabled with no rows shown
  - [ ] Re-enable, spec rows should be empty

- [ ] **Error handling:**
  - [ ] Network error on save - show error message
  - [ ] Invalid data - show validation message
  - [ ] Unauthorized - redirect to login

### Mobile App Tests

- [ ] **Display specs:**
  - [ ] Fetch product with `mobileSpecsEnabled: true`
  - [ ] Specs table renders with all rows
  - [ ] Labels and values display correctly
  - [ ] Table is horizontally scrollable if wide

- [ ] **Hide specs:**
  - [ ] Fetch product with `mobileSpecsEnabled: false`
  - [ ] Specs section not visible
  - [ ] No layout shift or empty space

- [ ] **Data handling:**
  - [ ] Specs with HTML characters render as-is
  - [ ] Long values wrap or scroll appropriately
  - [ ] Special characters (emoji, unicode) display correctly

---

## Common Issues & Solutions

### Issue: Toggle saved but doesn't persist after refresh

**Solution:**
- Ensure `mobileSpecsEnabled` and `mobileSpecs` are included in the `.select()` of product fetch
- Check that collection-level `$set` write is being executed after Mongoose create/update
- Restart Next.js dev server to clear model cache

### Issue: Specs appear in form but don't save to database

**Solution:**
- Verify formData is being serialized correctly as JSON string
- Check `parseMobileSpecs()` is filtering invalid rows properly
- Look for validation errors in server logs

### Issue: Mobile app shows specs but values are truncated

**Solution:**
- Ensure value field supports multi-line text (use scrollable container)
- Check backend isn't truncating values (max is 500 chars, should be enough)
- Increase table value column width in mobile UI

---

## Integration Checklist

- [ ] Update `models/Product.js` with schema fields
- [ ] Implement backend API handlers (POST, PUT, GET)
- [ ] Add mobile specs fields to product form component
- [ ] Implement dashboard spec row mgmt UI
- [ ] Create mobile app specs display component
- [ ] Test end-to-end: add specs → save → fetch → display
- [ ] Test persistence across page/app refreshes
- [ ] Test disable & re-enable specs toggle
- [ ] Update API documentation (this guide)
- [ ] Deploy to production with migration if needed

---

## Related Documentation

- [Mobile Specs API Guide](MOBILE_SPECS_API_GUIDE.md) - API contracts reference
- [Mobile Description Render Guide](MOBILE_DESCRIPTION_RENDER_GUIDE.md) - Related product detail feature
- [Product API Documentation](API_DOCUMENTATION.md) - Complete API reference

---

## Version History

- **v1.0** (Apr 28, 2026) - Initial complete implementation guide with backend & frontend code
