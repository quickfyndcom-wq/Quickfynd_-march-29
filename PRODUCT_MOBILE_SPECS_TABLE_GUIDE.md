# Mobile Specs Table - Add Product & Manage Product Feature

**For:** App Developer  
**Last Updated:** May 18, 2026  
**Feature:** Enable Mobile Specs Table option in Add Product and Manage Product flows

---

## Overview

The **Mobile Specs Table** is an optional feature that allows sellers to add detailed specification rows for mobile products in the "Add Product" and "Manage Product" sections. When enabled, sellers can input technical specifications that appear in the product details for buyers.

---

## Feature Location

### In Add Product Flow:

- Step: Product Details
- Section: Product Information
- Option: `☑ Enable Mobile Specs Table`
- Action: When checked → Reveal Mobile Specs input area

### In Manage Product Flow:

- Tab: Product Details
- Section: Specifications
- Option: `☑ Enable Mobile Specs Table`
- Action: When checked → Reveal Mobile Specs table with existing specs

---

## Mobile Specs Table Structure

### Table Columns

| Column            | Type       | Required | Max Length | Example                                        |
| ----------------- | ---------- | -------- | ---------- | ---------------------------------------------- |
| **Spec Category** | Dropdown   | Yes      | N/A        | Display, RAM, Battery, Camera, Processor, etc. |
| **Spec Name**     | Text Input | Yes      | 50 chars   | "Screen Size", "RAM Capacity", "Battery Mah"   |
| **Spec Value**    | Text Input | Yes      | 100 chars  | "6.7 inches", "12GB", "5000mAh"                |
| **Unit**          | Text Input | Optional | 20 chars   | "inches", "GB", "mAh", "MP"                    |

---

## Default Spec Categories (Dropdown Options)

Sellers can select from these predefined categories or create custom:

### Standard Mobile Categories:

1. **Display**
   - Screen size (e.g., "6.7 inches")
   - Resolution (e.g., "2560 x 1440")
   - Refresh rate (e.g., "120Hz")
   - Panel type (e.g., "AMOLED")
   - Brightness (e.g., "1000 nits")

2. **RAM**
   - RAM capacity (e.g., "12GB", "8GB")
   - RAM type (e.g., "LPDDR5")

3. **Storage**
   - Storage capacity (e.g., "256GB", "512GB")
   - Storage type (e.g., "UFS 3.1")
   - Expandable (e.g., "microSD up to 1TB")

4. **Battery**
   - Capacity (e.g., "5000mAh")
   - Charging speed (e.g., "65W Fast Charging")
   - Wireless charging (e.g., "Yes, 15W")
   - Battery type (e.g., "Li-Po")

5. **Camera**
   - Rear camera (e.g., "50MP + 12MP + 8MP")
   - Front camera (e.g., "20MP")
   - Video recording (e.g., "8K@30fps")
   - Features (e.g., "Night Mode, OIS")

6. **Processor**
   - Chipset (e.g., "Snapdragon 8 Gen 3")
   - Cores (e.g., "Octa-core")
   - Clock speed (e.g., "3.4 GHz")

7. **Operating System**
   - OS (e.g., "Android 14")
   - Update support (e.g., "4 years major updates")

8. **Connectivity**
   - 5G (e.g., "Yes, Sub-6 & mmWave")
   - 4G/LTE (e.g., "Yes")
   - Wi-Fi (e.g., "Wi-Fi 7")
   - Bluetooth (e.g., "Bluetooth 5.4")
   - NFC (e.g., "Yes")

9. **Security**
   - Biometric (e.g., "Under-display fingerprint + Face unlock")
   - Secure chip (e.g., "Qualcomm Secure Processor")

10. **Design**
    - Material (e.g., "Corning Gorilla Glass + Aluminum")
    - Durability (e.g., "IP68 rating")
    - Dimensions (e.g., "159.9 x 75.7 x 8.25 mm")
    - Weight (e.g., "189g")
    - Colors (e.g., "Midnight Black, Silver, Gold")

11. **Audio**
    - Speaker (e.g., "Stereo speakers")
    - Audio jack (e.g., "3.5mm jack")
    - Dolby Atmos (e.g., "Yes")

12. **Special Features**
    - Includes any unique features not covered above

---

## Database Schema

### Mobile Specs Model

```javascript
mobileSpecs: [
  {
    specId: ObjectId,
    category: String, // e.g., "Display", "Camera", "RAM"
    specName: String, // e.g., "Screen Size", "Rear Camera"
    specValue: String, // e.g., "6.7 inches", "50MP"
    unit: String, // e.g., "inches", "MP", "GB" (optional)
    displayOrder: Number, // For custom sorting
    isActive: Boolean, // Can be hidden without deleting
    createdAt: Date,
    updatedAt: Date,
  },
];
```

### Product Model Integration

```javascript
{
  productId: ObjectId,
  name: String,
  category: String,

  // Mobile Specs Feature
  mobileSpecsEnabled: Boolean,  // Default: false
  mobileSpecs: [
    {
      category: "Display",
      specName: "Screen Size",
      specValue: "6.7 inches",
      unit: "inches"
    },
    {
      category: "Camera",
      specName: "Rear Camera",
      specValue: "50MP + 12MP + 8MP",
      unit: "MP"
    },
    // ... more specs
  ]
}
```

---

## UI/UX Component Structure

### Add Product Flow

```
┌─────────────────────────────────────────────┐
│ Product Information                         │
├─────────────────────────────────────────────┤
│                                             │
│ ☑ Enable Mobile Specs Table                 │
│ Add specification rows for mobile products │
│ (for example: Display, RAM, Battery,       │
│  Camera)                                    │
│                                             │
│ [+ Add Spec Row]                            │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ Category | Spec Name | Value | Unit │   │
│ ├──────────────────────────────────────┤   │
│ │[Display▼] [Screen Size] [6.7]  [in] │   │
│ │[Camera▼]  [Rear Camera] [50MP] [MP] │   │
│ │[Battery▼] [Capacity]  [5000] [mAh]  │   │
│ └──────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Manage Product Flow

```
┌──────────────────────────────────────────────┐
│ Specifications                               │
├──────────────────────────────────────────────┤
│                                              │
│ ☑ Enable Mobile Specs Table                  │
│ Manage technical specifications              │
│ (Display, RAM, Battery, Camera, etc.)        │
│                                              │
│ [+ Add New Spec]  [Clear All]  [Save]        │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ # │Category│Spec Name│Value│Unit│Edit│   │
│ ├────────────────────────────────────────┤   │
│ │1  │Display │Screen   │6.7  │in  │✏️ ❌│   │
│ │2  │Camera  │Rear     │50MP │MP  │✏️ ❌│   │
│ │3  │Battery │Capacity │5000 │mAh │✏️ ❌│   │
│ │4  │RAM     │RAM Size │12   │GB  │✏️ ❌│   │
│ └────────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Add Spec Row Modal/Form

When seller clicks **[+ Add Spec Row]**:

```
┌─────────────────────────────────────────┐
│ Add Mobile Specification                │
├─────────────────────────────────────────┤
│                                         │
│ Spec Category *                         │
│ [Display         ▼]                     │
│ Display, RAM, Storage, Battery,         │
│ Camera, Processor, OS, Connectivity,    │
│ Security, Design, Audio, Features       │
│                                         │
│ Specification Name *                    │
│ [Screen Size                        ]   │
│                                         │
│ Specification Value *                   │
│ [6.7 inches                         ]   │
│                                         │
│ Unit (optional)                         │
│ [inches                             ]   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Cancel]          [Add Spec]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Validation Rules

### Spec Category

- **Required:** Yes
- **Type:** Select from dropdown
- **Custom allowed:** Yes (sellers can enter custom category)
- **Validation:** Max 50 characters

### Spec Name

- **Required:** Yes
- **Type:** Text input
- **Min length:** 3 characters
- **Max length:** 50 characters
- **Validation:** No special characters (alphanumeric, spaces, hyphens allowed)

### Spec Value

- **Required:** Yes
- **Type:** Text input
- **Min length:** 1 character
- **Max length:** 100 characters
- **Validation:** Alphanumeric, spaces, special chars (+, -, /, x, .), commas allowed

### Unit

- **Required:** No
- **Type:** Text input
- **Max length:** 20 characters
- **Examples:** "inches", "GB", "mAh", "MP", "Hz", "%", "nits"

---

## API Endpoints

### 1. Get Mobile Specs (Manage Product)

```http
GET /api/products/:productId/mobile-specs
```

**Response:**

```json
{
  "success": true,
  "mobileSpecsEnabled": true,
  "specs": [
    {
      "specId": "507f1f77bcf86cd799439011",
      "category": "Display",
      "specName": "Screen Size",
      "specValue": "6.7",
      "unit": "inches",
      "displayOrder": 1
    },
    {
      "specId": "507f1f77bcf86cd799439012",
      "category": "Camera",
      "specName": "Rear Camera",
      "specValue": "50MP + 12MP + 8MP",
      "unit": "MP",
      "displayOrder": 2
    }
  ]
}
```

### 2. Add Mobile Spec

```http
POST /api/products/:productId/mobile-specs
```

**Request:**

```json
{
  "category": "Display",
  "specName": "Screen Size",
  "specValue": "6.7",
  "unit": "inches"
}
```

**Response:**

```json
{
  "success": true,
  "spec": {
    "specId": "507f1f77bcf86cd799439011",
    "category": "Display",
    "specName": "Screen Size",
    "specValue": "6.7",
    "unit": "inches"
  }
}
```

### 3. Update Mobile Spec

```http
PUT /api/products/:productId/mobile-specs/:specId
```

**Request:**

```json
{
  "category": "Display",
  "specName": "Screen Size",
  "specValue": "6.8",
  "unit": "inches"
}
```

### 4. Delete Mobile Spec

```http
DELETE /api/products/:productId/mobile-specs/:specId
```

### 5. Reorder Mobile Specs

```http
PUT /api/products/:productId/mobile-specs/reorder
```

**Request:**

```json
{
  "specs": [
    { "specId": "id1", "displayOrder": 1 },
    { "specId": "id2", "displayOrder": 2 },
    { "specId": "id3", "displayOrder": 3 }
  ]
}
```

### 6. Toggle Mobile Specs Feature

```http
PUT /api/products/:productId/mobile-specs/toggle
```

**Request:**

```json
{
  "enabled": true
}
```

---

## Frontend Implementation (React Example)

### Component Structure

```jsx
export function MobileSpecsSection({ productId, enabled, specs }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [specList, setSpecList] = useState(specs);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleToggle = async (checked) => {
    setIsEnabled(checked);
    await fetch(`/api/products/${productId}/mobile-specs/toggle`, {
      method: "PUT",
      body: JSON.stringify({ enabled: checked }),
    });
  };

  const handleAddSpec = async (spec) => {
    const res = await fetch(`/api/products/${productId}/mobile-specs`, {
      method: "POST",
      body: JSON.stringify(spec),
    });
    const data = await res.json();
    setSpecList([...specList, data.spec]);
    setShowAddModal(false);
  };

  const handleDeleteSpec = async (specId) => {
    await fetch(`/api/products/${productId}/mobile-specs/${specId}`, {
      method: "DELETE",
    });
    setSpecList(specList.filter((s) => s.specId !== specId));
  };

  return (
    <section>
      <div className="checkbox-group">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        <label>Enable Mobile Specs Table</label>
        <p className="help-text">
          Add specification rows for mobile products (Display, RAM, Battery,
          Camera)
        </p>
      </div>

      {isEnabled && (
        <div className="specs-table-section">
          <button onClick={() => setShowAddModal(true)}>+ Add Spec Row</button>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Spec Name</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {specList.map((spec) => (
                <tr key={spec.specId}>
                  <td>{spec.category}</td>
                  <td>{spec.specName}</td>
                  <td>{spec.specValue}</td>
                  <td>{spec.unit || "-"}</td>
                  <td>
                    <button onClick={() => handleDeleteSpec(spec.specId)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddSpecModal
          onAdd={handleAddSpec}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </section>
  );
}
```

---

## Display on Product Detail Page (Customer View)

When buyer views product with mobile specs enabled:

```
┌──────────────────────────────────────────┐
│ iPhone 15 Pro                            │
├──────────────────────────────────────────┤
│                                          │
│ Specifications                           │
│ ┌────────────────────────────────────┐   │
│ │ Display      │ 6.7 inch AMOLED     │   │
│ │ Refresh Rate │ 120Hz               │   │
│ │ Rear Camera  │ 50MP + 12MP + 8MP   │   │
│ │ Battery      │ 5000mAh             │   │
│ │ Fast Charge  │ 65W                 │   │
│ │ RAM          │ 12GB                │   │
│ │ Storage      │ 256GB               │   │
│ │ Processor    │ Snapdragon 8 Gen 3  │   │
│ └────────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

---

## Backend Implementation (Node.js/Express Example)

```javascript
// models/ProductMobileSpecs.js
const mobileSpecSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  mobileSpecsEnabled: { type: Boolean, default: false },
  specs: [
    {
      category: { type: String, required: true },
      specName: { type: String, required: true },
      specValue: { type: String, required: true },
      unit: String,
      displayOrder: Number,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
});

// routes/productSpecs.js
app.get("/api/products/:productId/mobile-specs", async (req, res) => {
  try {
    const specs = await Product.findById(req.params.productId).select(
      "mobileSpecsEnabled specs",
    );
    res.json({ success: true, ...specs.toObject() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/products/:productId/mobile-specs", async (req, res) => {
  const { category, specName, specValue, unit } = req.body;

  // Validation
  if (!category || !specName || !specValue) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const product = await Product.findById(req.params.productId);
    const newSpec = {
      category,
      specName,
      specValue,
      unit: unit || null,
      displayOrder: product.specs.length + 1,
    };

    product.specs.push(newSpec);
    await product.save();

    res.json({ success: true, spec: newSpec });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete(
  "/api/products/:productId/mobile-specs/:specId",
  async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.productId,
        { $pull: { specs: { _id: req.params.specId } } },
        { new: true },
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);
```

---

## Seller Guidelines

### Tips for Adding Mobile Specs:

1. **Be Accurate** - Enter exact specifications from device manual/spec sheet
2. **Use Consistent Format** - "6.7 inches" not "6.7\"", "50MP" not "50 megapixels"
3. **Include Key Specs** - Display, Camera, Battery, RAM, Storage at minimum
4. **Add Units** - Always include unit (GB, MP, mAh, inches) for clarity
5. **Order Logically** - Most important specs first (display, camera, battery)
6. **Update When Relevant** - Change specs only if product variant changes

### Mobile Category Best Practices:

| Category      | Include Examples                     | Format Examples                               |
| ------------- | ------------------------------------ | --------------------------------------------- |
| **Display**   | Size, resolution, refresh rate, type | "6.7 inches", "2560x1440", "120Hz", "AMOLED"  |
| **Camera**    | Megapixels, configurations, features | "50MP + 12MP + 8MP", "Night Mode", "8K@30fps" |
| **Battery**   | Capacity, charging speed, type       | "5000mAh", "65W fast charge", "Li-Po"         |
| **RAM**       | Amount, type                         | "12GB LPDDR5", "8GB LPDDR4X"                  |
| **Storage**   | Capacity, type, expandable           | "256GB UFS 3.1", "microSD up to 1TB"          |
| **Processor** | Chipset, cores, speed                | "Snapdragon 8 Gen 3", "Octa-core", "3.4GHz"   |

---

## Error Handling

| Error               | Status | Message                           | Solution                 |
| ------------------- | ------ | --------------------------------- | ------------------------ |
| Missing category    | 400    | "Spec category is required"       | Select or enter category |
| Missing spec name   | 400    | "Specification name is required"  | Enter spec name          |
| Missing spec value  | 400    | "Specification value is required" | Enter spec value         |
| Spec name too long  | 400    | "Spec name max 50 characters"     | Shorten name             |
| Spec value too long | 400    | "Spec value max 100 characters"   | Shorten value            |
| Unit too long       | 400    | "Unit max 20 characters"          | Shorten unit             |
| Product not found   | 404    | "Product not found"               | Verify product ID        |
| Unauthorized        | 403    | "You don't have permission"       | Verify seller access     |

---

## Testing Checklist

- [ ] Enable/disable toggle works
- [ ] Add spec row opens modal
- [ ] Add spec saves to database
- [ ] Specs display in table
- [ ] Edit spec updates correctly
- [ ] Delete spec removes from table
- [ ] Specs appear on product detail page
- [ ] Validation works for all fields
- [ ] Unit field is optional
- [ ] Reorder specs functionality (if implemented)
- [ ] Specs persist after save
- [ ] Multiple products have independent specs
- [ ] Display on mobile and desktop

---

**Questions for App Developer?**

- Should specs be searchable by category?
- Should sellers be able to set specs as "not available" vs "no data"?
- Do specs need versioning (track changes)?
- Should there be a pre-filled template for common phones?
