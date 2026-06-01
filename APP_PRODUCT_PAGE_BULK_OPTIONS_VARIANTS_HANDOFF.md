# Product Page: Bulk Options vs Variants (App Developer Handoff)

Last updated: May 8, 2026
Base URL (Production): https://quickfynd.com

## Purpose

This document explains how product **variants** and **bulk (bundle) options** work on the product page, how to detect each mode from API data, and how mobile app UI/cart logic should behave.

---

## Quick Difference

### 1) Standard Variants (Color / Size)

Use this when product options are attribute-based (example: color, size).

- User selects color and/or size.
- Price/stock come from selected variant (or product fallback).
- Typical variant options:
  - `options.color`
  - `options.size`

### 2) Bulk / Bundle Options

Use this when product is sold in packs (example: Buy 1, Bundle of 3, Bundle of 6).

- User selects bundle card instead of color/size chips.
- `options.bundleQty` controls pack size.
- Price is bundle price (total pack price, not per-unit).
- Optional badge: `tag` or `options.tag` = `MOST_POPULAR`.

---

## Priority Rule (Important)

If **any** product variant contains `options.bundleQty`, treat product as **bulk-mode product** on product page.

In bulk mode:

- Show bundle selector UI.
- Hide color/size variant selector UI.
- Sort bundle options by `bundleQty` ascending.
- Select first bundle by default.

---

## API Data Shape (Core Fields)

App should read these fields from product API responses (`/api/products`, `/api/products/:id`, `/api/products/by-slug`).

```json
{
  "_id": "product_id",
  "name": "Product Name",
  "price": 299,
  "mrp": 399,
  "inStock": true,
  "stockQuantity": 100,
  "variants": [
    {
      "_id": "variant_1",
      "price": 299,
      "mrp": 399,
      "stock": 20,
      "tag": "MOST_POPULAR",
      "options": {
        "color": "Red",
        "size": "M",
        "bundleQty": 3,
        "title": "Bundle of 3"
      }
    }
  ]
}
```

---

## Variant Type Detection Logic

Use this logic in app:

```js
const variants = product?.variants || [];
const bulkVariants = variants.filter(
  (v) =>
    v?.options &&
    v.options.bundleQty !== undefined &&
    v.options.bundleQty !== null,
);
const isBulkMode = bulkVariants.length > 0;
```

If `isBulkMode === true`, use bundle flow.
If `isBulkMode === false`, use standard color/size variant flow.

---

## Bulk Option UI Rules

For each bundle option card:

1. Title:

- Use `options.title` if present.
- Else auto label:
  - `bundleQty === 1` -> `Buy 1`
  - `bundleQty > 1` -> `Bundle of {bundleQty}`

2. Price:

- Show variant `price` as bundle total.

3. Optional helper text:

- Qty 2: `Perfect for 2 Pack`
- Qty 3: `Best Value`

4. Badge:

- If `tag === "MOST_POPULAR"` or `options.tag === "MOST_POPULAR"`, show badge.

5. Default selection:

- First card after sorting by `bundleQty` ascending.

---

## Standard Variant UI Rules

When not in bulk mode:

- Build selectable sets from variant options:
  - `options.color`
  - `options.size`
- Resolve selected variant by matching selected color/size.
- Use selected variant price/stock when available.

---

## Price Resolution

Use selected variant first, fallback to product fields.

```js
const basePrice = selectedVariant?.price ?? product?.price ?? 0;
const baseMrp = selectedVariant?.mrp ?? product?.mrp ?? basePrice;
```

If special-offer fields exist:

```js
// if product.specialOffer.isSpecialOffer === true
const discountPercent = product.specialOffer.discountPercent || 0;
const effectivePrice = Number(
  (basePrice * (1 - discountPercent / 100)).toFixed(2),
);
const effectiveMrp = basePrice;
```

---

## Stock Resolution

Recommended app behavior:

1. If selected variant exists:

- Use `selectedVariant.stock`.

2. For bundle variant display quantity logic:

- Available units may be shown as `selectedVariant.stock * bundleQty`.

3. Fallbacks:

- If no variant selected, use `product.stockQuantity`.
- Also honor `product.inStock` global flag.

4. Out-of-stock checks:

- If variants exist and all `variant.stock <= 0`, treat as out of stock.
- If no variants and (`!product.inStock` or `stockQuantity <= 0`), out of stock.

---

## Cart Payload Contract (App -> Cart)

When adding selected product to cart, include selected option info:

```json
{
  "productId": "...",
  "price": 799,
  "variantOptions": {
    "color": "Red",
    "size": "M",
    "bundleQty": 3
  },
  "offerToken": "optional",
  "discountPercent": 10
}
```

Notes:

- In bundle mode, `variantOptions.bundleQty` is important.
- Include `offerToken` and `discountPercent` only when special offer is active.

---

## App Screen Decision Tree

1. Fetch product details.
2. Read `product.variants`.
3. If any variant has `options.bundleQty`, enter bulk mode.
4. Else enter standard variant mode.
5. Resolve selected variant.
6. Render dynamic price/stock based on selected variant.
7. Build cart payload with `variantOptions`.

---

## Edge Cases to Handle

1. Mixed data (both color/size and bundle variants in same product):

- Current web behavior prioritizes bulk mode on product page.

2. Missing `options.title` in bundle variant:

- Auto-generate label from `bundleQty`.

3. Bundle variant has no `mrp`:

- Fallback to product `mrp` or price.

4. Invalid stock values:

- Guard against negative/undefined stock as zero.

5. Empty variants array:

- Use product-level price and stock.

---

## QA Checklist for App Team

- [ ] Product with only color/size variants renders correct selectors.
- [ ] Product with bundle variants shows bundle cards and hides color/size selectors.
- [ ] Bundle options are sorted by `bundleQty` ascending.
- [ ] Default selection is first bundle option.
- [ ] MOST_POPULAR badge appears correctly.
- [ ] Price updates when switching variant or bundle option.
- [ ] Out-of-stock state is correct for both variant and non-variant products.
- [ ] Cart payload includes `variantOptions.bundleQty` for bulk selection.
- [ ] Special-offer token and discount are passed when applicable.

---

## Recommended API Endpoints for App

- `GET /api/products` (list)
- `GET /api/products/:id` (single product)
- `GET /api/products/by-slug?slug=<slug>` (slug-based product details)

---

## Summary

- **Variants** = attribute selection (color/size).
- **Bulk options** = pack-size selection using `options.bundleQty`.
- On product page, if bundle data exists, bulk mode should take precedence.
- Keep cart payload explicit with selected `variantOptions` so backend/cart logic can resolve exact selected SKU/pack behavior.
