# Mobile Specs Table API Guide

This guide explains how to enable/disable and manage the Mobile Specs table per product.

## Feature Summary

The product model now supports:
- `mobileSpecsEnabled` (Boolean): ON/OFF toggle for showing mobile specs table.
- `mobileSpecs` (Array): List of specs, each with:
  - `label` (String)
  - `value` (String)

Example stored data:

```json
{
  "mobileSpecsEnabled": true,
  "mobileSpecs": [
    { "label": "Display", "value": "6.7-inch AMOLED" },
    { "label": "RAM", "value": "8 GB" },
    { "label": "Battery", "value": "5000 mAh" }
  ]
}
```

## APIs

### 1) Create Product

- **Method:** `POST`
- **Endpoint:** `/api/store/product`
- **Auth:** Seller token in `Authorization: Bearer <token>`
- **Content-Type:** `multipart/form-data`

Add these fields in form-data:
- `mobileSpecsEnabled`: `"true"` or `"false"`
- `mobileSpecs`: JSON string array

Example form-data values:

```text
mobileSpecsEnabled = true
mobileSpecs = [{"label":"Display","value":"6.7-inch AMOLED"},{"label":"Battery","value":"5000 mAh"}]
```

### 2) Update Product

- **Method:** `PUT`
- **Endpoint:** `/api/store/product`
- **Auth:** Seller token in `Authorization: Bearer <token>`
- **Content-Type:** `multipart/form-data`

Required field:
- `productId`

Optional mobile specs fields:
- `mobileSpecsEnabled`: `"true"` or `"false"`
- `mobileSpecs`: JSON string array

If `mobileSpecsEnabled` is `false`, UI/app should hide the table.

## ON/OFF Usage (Important)

### Turn ON Mobile Specs Table

Send:

```text
mobileSpecsEnabled = true
mobileSpecs = [{"label":"Display","value":"6.7-inch AMOLED"},{"label":"Camera","value":"50MP + 12MP"}]
```

### Turn OFF Mobile Specs Table

Send:

```text
mobileSpecsEnabled = false
mobileSpecs = []
```

Notes:
- Backend accepts ON/OFF independently from specs rows.
- Specs are sanitized server-side (trimmed, empty label/value rows removed).

## Response Fields

Create/Update responses include product object with:

```json
{
  "product": {
    "_id": "...",
    "name": "...",
    "mobileSpecsEnabled": true,
    "mobileSpecs": [
      { "label": "Display", "value": "6.7-inch AMOLED" }
    ]
  }
}
```

## Read in Application

You can read these fields from product payloads returned by your existing product APIs.

Frontend render logic recommendation:
- Render table only when:
  - `product.mobileSpecsEnabled === true`
  - `Array.isArray(product.mobileSpecs)`
  - `product.mobileSpecs.length > 0`

Pseudo:

```js
const showSpecsTable = Boolean(product.mobileSpecsEnabled) && Array.isArray(product.mobileSpecs) && product.mobileSpecs.length > 0;
```

## Postman Sample (Update ON)

- Method: `PUT`
- URL: `/api/store/product`
- Body: form-data

```text
productId = 661234abcd1234abcd123456
mobileSpecsEnabled = true
mobileSpecs = [{"label":"Display","value":"6.7-inch AMOLED"},{"label":"RAM","value":"8 GB"}]
```

## Postman Sample (Update OFF)

- Method: `PUT`
- URL: `/api/store/product`
- Body: form-data

```text
productId = 661234abcd1234abcd123456
mobileSpecsEnabled = false
mobileSpecs = []
```

## Validation Notes

- Each spec row should contain both `label` and `value`.
- Empty rows are ignored by backend sanitizer.
- Keep spec labels concise and consistent for app UI alignment.

## Related Document

For product description rendering parity between dashboard and mobile, also follow:

- `MOBILE_DESCRIPTION_RENDER_GUIDE.md`
