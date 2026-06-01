# Mobile Banner Slider API Documentation

## Purpose
Use this API to show promotional banners on the mobile app home screen and to manage those banners from an authenticated seller/admin panel.

## Endpoint
- Relative path: `/api/store/mobile-banner-slider`
- Local base URL example: `http://localhost:3003`
- Production base URL: use your live domain

## Authentication Rules
- `GET`:
  - Public call works without token.
  - If token is sent and valid, API first tries to return that seller's own banner.
  - If seller has no enabled slides, API falls back to latest enabled public banner.
- `POST`:
  - Requires Firebase ID token in `Authorization: Bearer <token>`.

## 1) GET Mobile Banner

### Request
```http
GET /api/store/mobile-banner-slider
```

Optional header:
```http
Authorization: Bearer <firebase-id-token>
```

### Success Response (200)
```json
{
  "enabled": true,
  "slides": [
    {
      "image": "https://ik.imagekit.io/.../banner-1.webp",
      "link": "/offers",
      "title": "Festival Sale"
    },
    {
      "image": "https://ik.imagekit.io/.../banner-2.webp",
      "link": "/new-arrivals",
      "title": "New Arrivals"
    }
  ]
}
```

### Empty/No Banner Response (also 200)
```json
{
  "enabled": false,
  "slides": []
}
```

### Notes for App Team
- Treat `enabled: false` or `slides.length === 0` as "do not render banner section".
- GET is intentionally resilient and returns empty data even on internal failures, so UI should not break.

## 2) POST Save Mobile Banner Settings

### Request
```http
POST /api/store/mobile-banner-slider
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Body
```json
{
  "enabled": true,
  "slides": [
    {
      "image": "https://ik.imagekit.io/.../banner-1.webp",
      "link": "/offers",
      "title": "Festival Sale"
    }
  ]
}
```

### Field Validation
- `enabled` (boolean, optional, default `true`)
- `slides` (array, required)
- `slides.length` must be between `1` and `8`
- For each slide:
  - `image` required (non-empty string)
  - `link` optional (defaults to `/offers`)
  - `title` optional

### Success Response (200)
```json
{
  "message": "Mobile banner slider settings updated",
  "data": {
    "enabled": true,
    "slides": [
      {
        "image": "https://ik.imagekit.io/.../banner-1.webp",
        "link": "/offers",
        "title": "Festival Sale"
      }
    ]
  }
}
```

### Error Responses

401 Unauthorized:
```json
{
  "error": "Unauthorized"
}
```

400 Validation errors:
```json
{
  "error": "Slides must be an array"
}
```

```json
{
  "error": "At least one slide is required"
}
```

```json
{
  "error": "Maximum 8 slides allowed"
}
```

```json
{
  "error": "Slide 1: image is required"
}
```

500 Server error:
```json
{
  "error": "Failed to save mobile banner slider settings"
}
```

## App Integration Checklist
1. Call GET `/api/store/mobile-banner-slider` on home load.
2. Render slider only when `enabled === true` and `slides.length > 0`.
3. On slide tap, navigate using `link`.
4. Add fallback behavior for unknown/empty link values.
5. Cache banner response briefly (30-60 seconds) for smoother UX.
6. Handle no-data response gracefully by hiding banner section.

## JavaScript Example (Mobile App Fetch)
```javascript
async function fetchMobileBanners(baseUrl) {
  const res = await fetch(`${baseUrl}/api/store/mobile-banner-slider`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch mobile banners');
  }

  return {
    enabled: !!data?.enabled,
    slides: Array.isArray(data?.slides) ? data.slides : [],
  };
}
```

## JavaScript Example (Admin Save)
```javascript
async function saveMobileBanners(baseUrl, token, payload) {
  const res = await fetch(`${baseUrl}/api/store/mobile-banner-slider`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || 'Failed to save mobile banners');
  }

  return data;
}
```

## Image Guidelines
- Formats: WebP, JPEG, PNG
- Recommended ratio: `16:7`
- Recommended max file size: `< 500KB`
- Use optimized CDN URLs (ImageKit) for fast app loading

## Related APIs
- `/api/store/upload-image` for uploading banner assets
- `/api/store/hero-slider` for desktop hero banners
- `/api/store/featured-products` for featured product section

## Version
- v1.1 (Apr 29, 2026)
- Prepared for mobile app integration handoff
