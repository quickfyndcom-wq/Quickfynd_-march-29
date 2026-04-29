# Mobile Product Description Rendering Guide

Last Updated: 2026-04-28
Owner: Quickfynd Backend Team

## Goal

Show product description on mobile exactly like dashboard/web output.

## Why Current Mobile Output Looks Broken

If mobile strips HTML tags and renders plain text directly, all block-level formatting gets merged.
This causes output like:

- headings and paragraphs joined together
- list items merged into one line
- table labels/values concatenated

## Source of Truth

Use the `description` field from product APIs as the primary rich content.

Relevant APIs:
- `GET /api/products/by-slug?slug=<slug>`
- `GET /api/products`
- `GET /api/products/batch`
- `POST/PUT /api/store/product` (create/update in dashboard)

Important:
- `description` is rich HTML authored in dashboard editor.
- `shortDescription` is a compact summary (optional), not a replacement for full description.
- `mobileSpecsEnabled` and `mobileSpecs` are separate structured fields for specs table.

## Mobile Rendering Contract (Must Follow)

1. Render `description` as HTML, not as plain text.
2. Do not remove tags with regex like `<[^>]+>`.
3. Preserve line breaks, lists, and table structure.
4. Support horizontal scroll for wide tables.
5. Keep typography consistent with dashboard intent (heading/body/list spacing).

## Minimum HTML Tags To Support

- `p`, `br`
- `strong`, `b`, `em`, `i`, `u`
- `ul`, `ol`, `li`
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `table`, `thead`, `tbody`, `tr`, `th`, `td`
- `a`
- `img` (optional, if editor content contains images)

## Security + Sanitization

Backend stores description content from dashboard editor. Mobile should still sanitize according to platform best practices.

Allow-list approach recommended:
- allow only required tags and safe attributes (`href`, `src`, `alt`, `title`)
- block inline scripts/events (`onClick`, etc.)
- force safe link handling for external URLs

## Rendering Logic Recommendation

Pseudo:

```js
const hasRichDescription = typeof product.description === 'string' && product.description.trim().length > 0;

if (hasRichDescription) {
  renderHtml(product.description); // HTML renderer / webview-based component
} else if (product.shortDescription) {
  renderPlainText(product.shortDescription);
} else {
  hideDescriptionSection();
}
```

## Table Handling Rules

For tables inside `description`:

1. Wrap table in horizontal scroll container on mobile.
2. Keep cell padding and borders readable.
3. Do not collapse columns into a single text line.

## What To Ask Mobile Team To Implement

1. Use an HTML rendering component/library in product details screen.
2. Apply a style map for headings, paragraph spacing, lists, and table cells.
3. Add fallback rendering for `shortDescription` only when `description` is empty.
4. Add QA cases with list + table + multiline content.

## QA Checklist

- Product with heading + paragraph renders with correct line breaks.
- Product with unordered and ordered lists renders each item on its own line.
- Product with specs/features table shows rows and columns correctly.
- No merged text like `FeatureDetailsProduct Name...`.
- Links are tappable and safe.
- Content looks acceptable on small devices (320px width).

## Sample Payload (Expected From API)

```json
{
  "_id": "661234abcd1234abcd123456",
  "name": "Car Sliding Panda Dashboard",
  "description": "<h3>Feature Details</h3><table><tr><th>Product Name</th><td>Car Sliding Panda Dashboard Ornament</td></tr><tr><th>Color</th><td>Black</td></tr></table><p>Ideal for cars, gifts, collectors.</p>",
  "shortDescription": "Cute dashboard panda ornament",
  "mobileSpecsEnabled": true,
  "mobileSpecs": [
    { "label": "Material", "value": "ABS Plastic" },
    { "label": "Installation", "value": "Adhesive Base" }
  ]
}
```

## Common Mistakes (Avoid)

- Converting HTML to plain text by direct regex stripping.
- Rendering raw HTML string in a plain text widget.
- Ignoring table tags and flattening all cells.
- Using `shortDescription` as full description for all products.

## Copy-Paste Handoff For Mobile Developer

Use this message as-is:

```text
Please implement product description rendering exactly like dashboard/web.

Mandatory:
1) Render product.description as HTML (rich text), not plain text.
2) Do NOT strip HTML tags using regex.
3) Preserve headings, paragraphs, line breaks, lists, and tables.
4) For table content, keep row/column layout and allow horizontal scroll on small screens.
5) Use shortDescription only as fallback when description is empty.

Required tags:
p, br, strong, b, em, i, u, ul, ol, li, h1-h6, table, thead, tbody, tr, th, td, a

Expected result:
Whatever design/format is entered in dashboard description must appear the same on mobile product details screen.

Reference docs:
- MOBILE_DESCRIPTION_RENDER_GUIDE.md
- MOBILE_SPECS_API_GUIDE.md
```
