# ProductDetails Component Documentation

**File:** `components/ProductDetails.jsx`  
**Type:** React Client Component (`'use client'`)

---

## Overview

`ProductDetails` is the full product page component. It renders the product image gallery, pricing, variant selectors (color, size, bundle), delivery info, wishlist, share, add-to-cart, buy-now, FBT (Frequently Bought Together), and related products sections.

---

## Props

| Prop        | Type    | Required             | Description                                          |
| ----------- | ------- | -------------------- | ---------------------------------------------------- |
| `product`   | Object  | Yes                  | Full product object from the database                |
| `reviews`   | Array   | No (default `[]`)    | Initial reviews array; overridden by fetched reviews |
| `hideTitle` | Boolean | No (default `false`) | Hides the product title if `true`                    |
| `offerData` | Object  | No (default `null`)  | External offer data (reserved for future use)        |

---

## Product Object Structure

Key fields consumed from the `product` prop:

| Field              | Type    | Description                                                                                                   |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `_id`              | String  | Unique product ID                                                                                             |
| `name`             | String  | Product name                                                                                                  |
| `slug`             | String  | URL slug                                                                                                      |
| `price`            | Number  | Sale price                                                                                                    |
| `mrp`              | Number  | Original MRP / crossed price                                                                                  |
| `salePrice`        | Number  | Fallback sale price                                                                                           |
| `images`           | Array   | Media URLs (images and videos)                                                                                |
| `imageAspectRatio` | String  | Controls image render ratio. Values: `'1:1'` (default/square), `'4:5'`, `'3:4'`, `'16:9'`. Max 8 media items. |
| `inStock`          | Boolean | Global in-stock flag                                                                                          |
| `stockQuantity`    | Number  | Base stock (used when no variants)                                                                            |
| `variants`         | Array   | Array of variant objects (see Variants section)                                                               |
| `colors`           | Array   | Fallback colors list                                                                                          |
| `sizes`            | Array   | Fallback sizes list                                                                                           |
| `tags`             | Array   | Tags for related-product matching                                                                             |
| `description`      | String  | Product description                                                                                           |
| `attributes`       | Object  | Extra attributes (`condition`, `soldBy`, `deliveredBy`)                                                       |
| `specialOffer`     | Object  | Special offer config (see Special Offers section)                                                             |
| `fastDelivery`     | Boolean | Enables fast delivery badge                                                                                   |
| `storeId`          | String  | Store ID for behavior tracking                                                                                |
| `sellerName`       | String  | Seller display name                                                                                           |
| `averageRating`    | Number  | Pre-computed average rating                                                                                   |
| `ratingCount`      | Number  | Pre-computed review count                                                                                     |

---

## Variants

### Variant Object Structure

```json
{
  "_id": "variant_id",
  "price": 499,
  "mrp": 699,
  "stock": 10,
  "options": {
    "color": "Red",
    "size": "M",
    "bundleQty": 0
  }
}
```

### Variant Types

| Type                    | Condition                                                                 | Description                                      |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| **Color/Size Variant**  | `options.color` and/or `options.size` set, `bundleQty` not set or `0`/`1` | Standard attribute-based variant                 |
| **Bulk/Bundle Variant** | `options.bundleQty` present (including `0`)                               | Pack/bundle variant (e.g., pack of 2, pack of 3) |

### Bulk / Bundle Variant Object Structure

```json
{
  "_id": "variant_id",
  "price": 799,
  "mrp": 999,
  "stock": 5,
  "tag": "MOST_POPULAR",
  "options": {
    "bundleQty": 3,
    "title": "Bundle of 3"
  }
}
```

| Field                  | Type   | Description                                                                                         |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `options.bundleQty`    | Number | Number of units in this bundle (e.g. `1`, `2`, `3`, `6`)                                            |
| `options.title`        | String | Custom display label (e.g. `"Buy 1"`, `"Bundle of 3"`). Falls back to auto-generated label if empty |
| `tag` or `options.tag` | String | Special badge. Supported value: `"MOST_POPULAR"` — shows a pink badge on the option card            |
| `price`                | Number | Bundle price (total for all units)                                                                  |
| `mrp`                  | Number | Bundle MRP used to show savings                                                                     |

### Bulk Variant UI (Product Page)

When `bulkVariants.length > 0`, a **"BUNDLE AND SAVE MORE!"** section is rendered on the product page instead of color/size selectors. Each bundle option is shown as a selectable card:

- **Radio-style selector** — orange border and filled dot when selected
- **Label** — uses `options.title` if set; otherwise auto-generated:
  - `bundleQty === 1` → `"Buy 1"`
  - `bundleQty > 1` → `"Bundle of {qty}"`
- **Sub-label** — auto-shown based on qty:
  - qty `2` → `"Perfect for 2 Pack"`
  - qty `3` → `"Best Value"`
- **Price** — shown per bundle (not per unit)
- **MOST POPULAR badge** — shown if `tag === 'MOST_POPULAR'`
- Options are **sorted ascending by `bundleQty`** (`sortedBulkVariants`)
- First option (smallest bundle) is selected by default

**Example rendered options:**

```
○  Buy 1                               ₹ 299.00
● [MOST POPULAR] Bundle of 3           ₹ 799.00
    Best Value
○  Bundle of 6                         ₹ 1499.00
```

### How Variants Are Resolved

1. **Bulk variants take priority** — if any variant has `bundleQty` set, the entire product uses the bundle selector (color/size selectors are hidden).
2. **Bundle variants** — sorted ascending by `bundleQty`. Active bundle controlled by `selectedBundleIndex`.
3. **Color/Size variants** — matched by comparing `selectedColor` and `selectedSize` against `options.color` / `options.size`.
4. **Active variant price** — `selectedVariant.price ?? product.price`
5. **Active variant MRP** — `selectedVariant.mrp ?? product.mrp ?? basePrice`

### Variant State Variables

| State                 | Default                                    | Description                     |
| --------------------- | ------------------------------------------ | ------------------------------- |
| `selectedColor`       | First variant color or `product.colors[0]` | Currently selected color        |
| `selectedSize`        | First variant size or `product.sizes[0]`   | Currently selected size         |
| `selectedBundleIndex` | `0` if bundle variants exist, else `null`  | Index into `sortedBulkVariants` |

### Auto-Selection Logic

On mount, if only one variant has stock, its color and size are auto-selected. If all available colors resolve to one, or all available sizes resolve to one, they are auto-selected.

### Stock Determination

```
availableStock =
  selectedVariant.stock (if bundle: stock × bundleQty)
  OR product.stockQuantity
  OR 0

maxOrderQty = min(20, availableStock)

isGloballyOutOfStock =
  if variants exist → no variant has stock OR product.inStock === false
  if no variants    → product.inStock === false OR stockQuantity === 0
```

---

## Pricing Logic

### Normal Pricing

```
basePrice = selectedVariant.price ?? product.price
baseMrp   = selectedVariant.mrp ?? product.mrp ?? basePrice
effPrice  = basePrice
effMrp    = baseMrp
```

### Special Offer Pricing

When `product.specialOffer.isSpecialOffer === true`:

```
offerBase   = basePrice > 0 ? basePrice : baseMrp
effPrice    = offerBase × (1 - discountPercent / 100)   [rounded to 2 decimals]
effMrp      = offerBase
```

### Display Pricing (with quantity multiplier)

```
displayPrice          = effPrice × max(1, quantity)
displayMrp            = effMrp  × max(1, quantity)
displayDiscountPercent = round((displayMrp - displayPrice) / displayMrp × 100)
```

### Non-Bundle Variant Price

Used when a bundle is selected but the base (non-bundle) per-unit price is needed:

```
nonBundleVariant     = variant matching selectedColor+selectedSize where bundleQty ≤ 1
nonBundleEffPrice    = getEffectivePrice(nonBundleVariant.price, nonBundleVariant.mrp)
```

---

## Special Offers

`product.specialOffer` object:

| Field             | Type    | Description                                 |
| ----------------- | ------- | ------------------------------------------- |
| `isSpecialOffer`  | Boolean | Enables special offer pricing               |
| `discountPercent` | Number  | Discount % to apply on base price           |
| `offerToken`      | String  | Token passed to cart payload for validation |

When `offerToken` is present, it is included in every `addToCart` payload as `{ offerToken, discountPercent }`.

---

## Cart Integration

### `handleAddToCart()`

1. Calculates bundle vs non-bundle units from `quantity` and `bundleQty`.
2. Dispatches `addToCart` for bundle units (with `bundleQty`) and normal units separately.
3. If signed in, dispatches `uploadCart` to sync with server.
4. Shows cart toast for 3 seconds.

### `handleOrderNow()`

Same cart logic as above, then immediately navigates to `/checkout`.

### Cart Payload Structure

```json
{
  "productId": "...",
  "price": 499,
  "variantOptions": {
    "color": "Red",
    "size": "M",
    "bundleQty": 3
  },
  "offerToken": "...", // only if special offer
  "discountPercent": 10 // only if special offer
}
```

---

## FBT (Frequently Bought Together)

### Data Source

Fetched from `GET /api/products/:id/fbt`.

Response:

```json
{
  "enableFBT": true,
  "products": [...],
  "bundlePrice": 999,
  "bundleDiscount": 10
}
```

### Bundle Pricing

```
bundleTotal =
  if bundlePrice > 0  → bundlePrice
  if bundleDiscount > 0 → (mainPrice + sum of selected FBT prices) × (1 - discount/100)
  else                → mainPrice + sum of selected FBT prices

bundleSavings = baseBundleTotal - bundleTotal
```

### `handleAddBundleToCart()`

Dispatches `addToCart` for the main product and all selected FBT products, then navigates to `/checkout`.

---

## Wishlist

- **Signed-in users:** Server-side via `GET/POST /api/wishlist` with Bearer token.
- **Guest users:** `localStorage` key `guestWishlist` (array of wishlist item objects).
- Fires `window.dispatchEvent(new Event('wishlistUpdated'))` on any change.

---

## Related Products (Same Tag)

Fetched via `GET /api/products?limit=120&includeOutOfStock=true`. Products are ranked by number of matching tags (up to 3 tags from current product). Top 6 matches displayed.

---

## Behavior Tracking

`trackCustomerBehaviorEvent` is called for:

| Event            | Trigger                             |
| ---------------- | ----------------------------------- |
| `product_view`   | On mount (once per product ID)      |
| `product_exit`   | On page hide or component unmount   |
| `add_to_cart`    | On add-to-cart click                |
| `go_to_checkout` | On buy-now or bundle checkout click |

Scroll depth and time-on-page (`durationMs`) are tracked and sent with the exit event.

---

## Meta Pixel Tracking

`trackMetaEvent('ViewContent', {...})` fires once per session per product (tracked via `sessionStorage`).

---

## Image Gallery

### Media Capacity

Up to **8 media items** (images or videos) per product. Stored in `product.images` array as URLs.

### Image Aspect Ratio

Set via `product.imageAspectRatio` in the admin panel. Controls how all product images render on the product page.

| Value             | CSS Class       | Use Case                  |
| ----------------- | --------------- | ------------------------- |
| `1:1` _(default)_ | `aspect-square` | Square product photos     |
| `4:5`             | `aspect-[4/5]`  | Portrait fashion/apparel  |
| `3:4`             | `aspect-[3/4]`  | Portrait general          |
| `16:9`            | `aspect-video`  | Landscape / wide products |

> The aspect ratio picker in the admin UI shows: **1:1 · 4:5 · 3:4 · 16:9**. If not set, defaults to `1:1` (square).

### Video Support

- Supported formats: `.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`
- Videos are detected automatically by URL extension via `isVideoUrl()`
- On the product page, videos **autoplay**, **muted**, **looped**, no controls
- In the thumbnail strip, a play icon overlay is shown; the thumbnail preview uses the next non-video image in the list
- Videos do **not** open the quick-view zoom modal (only images do)

### Desktop Layout

- Vertical scrollable thumbnail strip on the left (56×56px each)
- Main image/video on the right, fills available height (up to `560px` / `100vh - 140px`)
- Active thumbnail highlighted with an orange border

### Mobile Layout

- Single full-width main image, swipeable left/right (touch gesture)
- Aspect ratio applied via `aspectRatioClass`
- Dot indicators for current image position

### Quick-View Zoom Modal

- Opens on click of main image (not videos)
- Pinch/scroll to zoom (`quickViewZoom` state)
- Closes via the × button or clicking outside

---

## Delivery Info

| Source        | Field                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| Delivered by  | `product.attributes.deliveredBy` → `product.deliveryInfo.deliveredBy`                  |
| Sold by       | `product.attributes.soldBy` → `product.sellerName` → `product.store.name`              |
| Fast delivery | Any of: `fastDelivery`, `fast_delivery`, `expressDelivery`, `deliverySpeed === 'fast'` |

Fast delivery ETA: +2 days if before 2pm, +3 days if after 2pm, formatted as `DD MMM, Weekday`.

If signed in, the user's default delivery address is fetched and shown from `GET /api/address`.

---

## Payment Offers (Static Display)

Three hardcoded offer tabs shown in the UI:

| Tab            | Content                               |
| -------------- | ------------------------------------- |
| Cashback       | Up to 5% cashback via super.money UPI |
| Bank Offer     | HDFC, ICICI, SBI card discounts       |
| Partner Offers | GST invoice claim                     |

---

## Share

Supports sharing to: **WhatsApp**, **Facebook**, **Twitter/X**, **Telegram**, and **Copy Link**.

---

## Key State Summary

| State                 | Purpose                         |
| --------------------- | ------------------------------- |
| `mainImage`           | Currently displayed media URL   |
| `quantity`            | Selected quantity (1–20)        |
| `selectedColor`       | Active color variant            |
| `selectedSize`        | Active size variant             |
| `selectedBundleIndex` | Active bundle variant index     |
| `selectedVariant`     | Resolved active variant object  |
| `isInWishlist`        | Wishlist status                 |
| `showCartToast`       | Add-to-cart confirmation toast  |
| `showShareMenu`       | Share dropdown visibility       |
| `isQuickViewOpen`     | Zoom modal open/close           |
| `fbtProducts`         | FBT product list                |
| `selectedFbtProducts` | Map of selected FBT product IDs |
| `deliveryAddress`     | User's default delivery address |
| `fetchedReviews`      | Reviews fetched from API        |
| `sameTagProducts`     | Related products by tag         |

---

## Dependencies

| Library / Module                 | Usage                                                            |
| -------------------------------- | ---------------------------------------------------------------- |
| `react-redux`                    | Cart state (`addToCart`, `uploadCart`, `cartItems`)              |
| `axios`                          | API calls for reviews, FBT, address, wishlist, same-tag products |
| `next/navigation`                | Router for checkout navigation                                   |
| `next/image`                     | Optimized image rendering                                        |
| `lucide-react`                   | Icons (StarIcon, HeartIcon, ShareIcon, etc.)                     |
| `@/lib/useAuth`                  | Firebase auth user, token                                        |
| `@/lib/metaPixelClient`          | Meta Pixel ViewContent event                                     |
| `@/lib/customerBehaviorTracking` | Behavior event tracking                                          |
| `@/lib/features/cart/cartSlice`  | Redux cart actions                                               |
| `MobileProductActions`           | Mobile sticky add-to-cart bar                                    |
