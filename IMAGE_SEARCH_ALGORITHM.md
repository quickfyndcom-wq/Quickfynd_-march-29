# Image Search Algorithm Documentation

## Overview

The image search feature uses a **filename-based keyword extraction** combined with a **5-tier search strategy** to find products matching uploaded images. This approach was implemented as a fallback when AI vision APIs were unavailable.

### Key Characteristics
- **Non-AI Based**: Does not analyze image content/pixels
- **Filename-Dependent**: Extracts keywords from image filename
- **Fast & Reliable**: No API calls needed for image analysis
- **Smart Fallback**: Shows similar products when no exact match found

---

## How It Works

### 1. Input Processing

User uploads an image file (via drag-drop, file input, paste, or mobile camera).

```
User Action → Image Upload
    ↓
Extract Filename (e.g., "yoga-mat-blue.jpg" → "yoga-mat-blue")
    ↓
Validate Filename (reject hash-like: IMG_1234, random strings)
    ↓
Process Keywords
```

**Validation Rules:**
- Reject if filename looks like a hash or random string (detected by checking for high frequency of numbers or no vowels)
- Accept descriptive filenames: `shoes.jpg`, `coffee-maker-black.jpg`, `yoga-mat.jpg`
- Reject random filenames: `IMG_1234.jpg`, `a49f68e6b46234a208f4d86183e9d0bc5l.jpg`

### 2. Keyword Extraction & Expansion

**Process:**
1. Split filename by delimiters: `-`, `_`, spaces
2. Filter: Remove numbers and words < 3 chars
3. Expand using synonym map

**Synonym Map (Partial List):**
```javascript
{
  'mat': ['mat', 'rug', 'carpet', 'doormat', 'yoga', 'floor cover'],
  'shoe': ['shoe', 'shoes', 'sneakers', 'footwear', 'loafer'],
  'bag': ['bag', 'handbag', 'purse', 'backpack', 'satchel'],
  'watch': ['watch', 'smartwatch', 'timepiece'],
  'dress': ['dress', 'gown', 'frock'],
  'shirt': ['shirt', 'tee', 'top'],
  'pant': ['pant', 'jeans', 'trousers'],
  'boot': ['boot', 'combat', 'hiking boot'],
  'cup': ['cup', 'mug', 'tumbler'],
  'lamp': ['lamp', 'light', 'fixture'],
  'sofa': ['sofa', 'couch', 'settee'],
  'table': ['table', 'desk']
}
```

**Example:**
```
Input: "yoga-mat-blue.jpg"
  ↓
Split: ["yoga", "mat", "blue"]
  ↓
Filter: ["yoga", "mat"]  // "blue" < 3 chars? No, kept. Actually all 3+ kept
  ↓
Expand: [
    "yoga" (no synonym),
    "mat", "rug", "carpet", "doormat", "yoga", "floor cover" (with synonyms),
    "blue" (no synonym)
  ]
  ↓
Final Keywords: ["yoga", "mat", "rug", "carpet", "floor", "blue"]
```

### 3. 5-Tier Search Strategy

After extracting keywords, the system searches MongoDB products using a cascade of increasingly loose strategies:

#### **Tier 1: Exact Phrase Match (BEST Match)**
Query for exact multi-word phrases in product name.
```javascript
// Search: yoga mat blue
// Query: { name: { $regex: "yoga mat", $options: 'i' } }
// Result: "Premium Yoga Mat - Blue" ✅ MATCHES (Tier 1)
```

#### **Tier 2: Word Boundary + Category Match (GOOD)**
Match complete words at boundaries or in category/tags.
```javascript
// Query: { 
//   $or: [
//     { name: /\byoga\b/i },
//     { category: /yoga/i },
//     { tags: { $regex: "yoga", $options: 'i' } }
//   ]
// }
// Result: "Yoga Equipment Set" ✅ MATCHES (Tier 2)
```

#### **Tier 3: Partial Keyword Match (FAIR)**
Match any keyword in any product field (including optional variations).
```javascript
// Query: { 
//   $or: [
//     { name: /yoga|mat|rug|carpet|blue/i },
//     { description: /yoga|mat|rug|carpet|blue/i }
//   ]
// }
// Result: "Blue Fabric Rug" ✅ MATCHES (Tier 3)
```

#### **Tier 4: Prefix Match (LOOSE)**
Match if product name starts with first 3 letters of keyword.
```javascript
// Query: { 
//   name: { 
//     $regex: "^(yog|mat|rug|car|bla)" 
//   } 
// }
// Result: "Yogi Brand Cushion" ✅ MATCHES (Tier 4)
```

#### **Tier 5: Fallback (NO EXACT MATCH)**
Return popular or recently added products in same category (if detected).
```javascript
// Query: { inStock: true }
// Sort: { createdAt: -1 }  // Most recent first
// Limit: 8
// Shows: "Recommended Products"
```

**Search Cascade Flow:**
```
Tier 1: Found? Return ✅
   ↓ Not found
Tier 2: Found? Return ✅
   ↓ Not found
Tier 3: Found? Return ✅
   ↓ Not found
Tier 4: Found? Return ✅
   ↓ Not found
Tier 5: Return Popular/Recent Products (Recommended)
```

### 4. Result Processing & Similar Products

**When Match Found:**
1. Return matched products (up to 8 from best tier)
2. Fetch similar products from same category
3. Show as "Recommended similar products"

**When No Match Found:**
1. Fetch latest in-stock products
2. Show as "Recommended products"

**Result Storage:**
- Stores results in `sessionStorage` as `'imageSearchResults'`
- Avoids repeated API calls
- Lost on page refresh (expected)

---

## Code Implementation

### API Endpoint: `/api/search-by-image/route.js`

**Location:** `app/api/search-by-image/route.js`

**Request:**
```javascript
POST /api/search-by-image
Content-Type: multipart/form-data

Form Data:
- image: File (required)
```

**Response:**
```javascript
{
  success: true,
  searchResults: [...],      // Exact matches
  recommendedProducts: [...], // Similar in category or popular
  strategy: "tier1|tier2|tier3|tier4|tier5",
  message: "string"
}
```

**Key Functions:**
- `extractFilenameKeywords(filename)` - Extract and expand keywords
- `isHashLikeFilename(filename)` - Validate filename quality
- `searchProductsInTiers(keywords)` - Execute 5-tier search

### Search Endpoint: `/api/search-products/route.js`

**Location:** `app/api/search-products/route.js`

**Query Params:**
- `q` - Search query (keyword)
- `category` - Filter by category (optional)
- `limit` - Max results (default: 8)
- `exclude` - Exclude product IDs (optional)

**Response:**
```javascript
{
  success: true,
  results: [...],
  total: number
}
```

### Frontend: Image Search Modal

**Location:** `components/Navbar.jsx`

**Features:**
- Drag-drop upload
- Click-to-upload file input
- Paste image support (Ctrl+V)
- Mobile camera capture (`capture="environment"`)
- Paste cooldown throttle (1 second)

**Flow:**
```javascript
1. User uploads image
2. Component calls POST /api/search-by-image
3. Stores results in sessionStorage['imageSearchResults']
4. Redirects to /search-results
5. Results page displays results
```

### Results Page: `/search-results`

**Location:** `app/(public)/search-results/page.jsx`

**Structure:**
- Wrapped in `<Suspense>` boundary
- Loads results from `sessionStorage`
- Shows exact matches grid
- Shows "Recommended similar products" OR "Recommended products"
- Responsive design (1-4 columns based on screen size)

---

## Limitations & Considerations

### ❌ Does NOT
- Analyze actual image content/pixels
- Use machine learning or AI vision models
- Match images by visual similarity
- Work with non-descriptive filenames

### ✅ Works Well With
- Descriptive, hyphenated filenames (e.g., `red-nike-shoes.jpg`)
- Product names matching common keywords
- Mobile camera uploads with descriptive photo names
- User-provided file names from their device

### ⚠️ Edge Cases
- Random filenames → Fallback to recommended products
- No matches in tier 1-4 → Shows popular/recent products
- Empty keywords → Returns nothing or recommended products
- Special characters in filename → Stripped and normalized

---

## Example Workflows

### Workflow 1: Perfect Match
```
User uploads: shoes.jpg
  ↓
Keywords: ["shoes", "shoe", "sneakers", "footwear"]
  ↓
Tier 1 Search: Finds "Premium Running Shoes"
  ↓
Results: [Premium Running Shoes]
  ↓
Similar: [Nike Sneakers, Adidas Shoes, Sports Footwear]
```

### Workflow 2: Partial Match
```
User uploads: coffee-maker-black.jpg
  ↓
Keywords: ["coffee", "maker", "black"]
  ↓
Tier 1: No exact phrase found
Tier 2: No word boundary match
Tier 3: Finds products with "coffee" + "maker"
  ↓
Results: [Coffee Maker - Stainless Steel, Black Coffee Maker]
  ↓
Similar: [Coffee Grinders, Coffee Filters, Coffee Cups]
```

### Workflow 3: No Match (Fallback)
```
User uploads: IMG_1234.jpg
  ↓
Validation: Detected as hash-like filename
  ↓
Rejected: Keywords not extractable
  ↓
Tier 5 Fallback: Return latest in-stock products
  ↓
Results: [Latest 8 Popular Products]
```

---

## Performance Considerations

### Strengths
- **O(1) Response Time**: Filename parsing is instant
- **No External API Calls**: No Gemini/OpenAI latency
- **Database Optimized**: Indexed searches on product fields
- **Scalable**: Works regardless of database size

### Optimization Tips
1. **Index MongoDB fields**: Ensure `name`, `category`, `tags` are indexed
2. **Limit results**: Default 8 per tier prevents memory bloat
3. **Cache categories**: Pre-fetch category list for similar products
4. **Debounce uploads**: Throttle multiple rapid uploads

---

## Future Improvements

### Potential Enhancements
1. **Real AI Vision API** - Integrate working vision API (Claude, GPT-4V)
2. **Image Hash Matching** - Use perceptual hashing for visual similarity
3. **ML-based Ranking** - Retrain model based on click-through rates
4. **Smart Synonym Expansion** - Generate synonyms using NLP
5. **User Feedback Loop** - Track search→click ratios to improve relevance
6. **Caching Layer** - Redis cache for frequent search queries
7. **Analytics Dashboard** - Track which searches fail, what users click

---

## Technical Dependencies

### Required Packages
- `next` - Framework
- `mongodb` - Database client
- `multer` or native FormData - File upload handling

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- Optional: `GEMINI_API_KEY` (not currently in use)

### Database Schema (Product Model)
```javascript
{
  name: String,
  category: String,
  tags: [String],
  description: String,
  inStock: Boolean,
  price: Number,
  images: [String],
  createdAt: Date
}
```

---

## Testing Recommendations

### Test Cases
1. **Valid descriptive filename**: `nike-running-shoes-red.jpg` → Should find shoes
2. **Generic filename**: `shoes.jpg` → Should find shoes
3. **Hash-like filename**: `a4b8c9d2e1f0g5h7.jpg` → Should reject and show recommended
4. **Multi-word match**: `black-coffee-maker.jpg` → Should find coffee makers
5. **Mobile camera**: Filename from device camera → Should work if descriptive
6. **Paste functionality**: Ctrl+V image → Should process like file upload
7. **No matches**: Nonsense filename → Should show recommended products

### Debug Mode
Add `?debug=true` to image search API to get detailed tier information:
```javascript
{
  tier1Results: [],
  tier2Results: [...],
  tier3Results: [],
  tier4Results: [...],
  selectedTier: 2,
  keywords: ["example", "keywords"],
  executionTime: 145  // milliseconds
}
```

---

## Contact & Support

For questions about implementation, refer to:
- API Logic: `app/api/search-by-image/route.js`
- UI Component: `components/Navbar.jsx`
- Results Page: `app/(public)/search-results/page.jsx`

Last Updated: **February 6, 2026**  
Status: **Production Deployed** ✅
