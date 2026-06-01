# Auto Product Details Fill API (Image-Based)

This document covers only the API and what inputs you need to send.

## Endpoint

- Method: `POST`
- URL: `/api/store/product/auto-fill-image-details`
- Auth: Seller token required (`Authorization: Bearer <firebase_id_token>`)
- Content-Type: `multipart/form-data`

## Required Inputs

You must send **at least one** image source:

1. `image` (File)
   - Type: image file (`image/*`)
   - Max size: 10 MB

OR

2. `imageUrl` (String)
   - Public HTTP/HTTPS image URL

If both are missing, API returns `400`.

## Optional Inputs

1. `availableCategories` (Stringified JSON array)
   - Send category list so AI can return constrained category IDs.
   - Format:

```json
[
  { "id": "<category_id>", "name": "<category_name>" },
  { "id": "<category_id>", "name": "<category_name>" }
]
```

2. `imageContext` (String)
   - Extra hints from you (example: capacity, material, pack size, variant details).

## Example Request (cURL)

```bash
curl -X POST "https://<your-domain>/api/store/product/auto-fill-image-details" \
  -H "Authorization: Bearer <firebase_id_token>" \
  -F "image=@/path/to/product.jpg" \
  -F 'availableCategories=[{"id":"abc123","name":"Mobiles"},{"id":"def456","name":"Accessories"}]' \
  -F "imageContext=128GB, dual SIM, metallic body"
```

Alternative using URL instead of file:

```bash
curl -X POST "https://<your-domain>/api/store/product/auto-fill-image-details" \
  -H "Authorization: Bearer <firebase_id_token>" \
  -F "imageUrl=https://example.com/product-image.jpg" \
  -F 'availableCategories=[{"id":"abc123","name":"Mobiles"}]'
```

## Success Response

```json
{
  "success": true,
  "fields": {
    "name": "...",
    "shortDescription": "...",
    "description": "<p>...</p>",
    "metaTitle": "...",
    "metaDescription": "...",
    "seoKeywords": ["..."],
    "tags": ["..."],
    "badges": ["..."],
    "suggestedCategories": ["..."],
    "suggestedCategoryIds": ["..."],
    "sku": "...",
    "stockQuantity": 100,
    "fastDelivery": false,
    "allowReturn": true,
    "allowReplacement": true,
    "mobileSpecsEnabled": false,
    "mobileSpecs": [{ "label": "...", "value": "..." }]
  },
  "categorySelectionMode": "id-constrained"
}
```

## Error Cases

- `401`: Missing/invalid auth token, or seller not authorized.
- `400`: Missing image/imageUrl, invalid file type, or image too large.
- `503`: OpenAI not configured on server.
- `500`: Any processing failure.

## Inputs You Need To Fill Yourself

- `Authorization` token
- `image` file OR `imageUrl`
- `availableCategories` list (recommended)
- `imageContext` (optional but useful)
