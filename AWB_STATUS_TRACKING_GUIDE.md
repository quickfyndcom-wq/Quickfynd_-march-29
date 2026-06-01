# AWB Status Tracking Feature — Orders Dashboard

## Overview

The orders dashboard now displays an **AWB Status** column that shows whether an Air Waybill (AWB) has been generated and/or downloaded for each order.

---

## What's Displayed

The **AWB Status** column shows three states:

### 1. **`—` (Dash)**
- **Meaning:** AWB has not yet been generated
- **Where shown:** For all new orders
- **Action:** Seller can click "Generate AWB" to create the PDF

### 2. **`📄 Generated`** (Blue badge)
- **Meaning:** AWB PDF has been generated and previewed, but NOT downloaded yet
- **Where shown:** After clicking "Preview AWB" button
- **Color:** Blue `bg-blue-100 text-blue-700`
- **Action:** Seller can click "Download AWB" to get the PDF file

### 3. **`✓ Downloaded`** (Green badge)
- **Meaning:** AWB PDF has been successfully downloaded
- **Where shown:** After clicking "Download AWB" button
- **Color:** Green `bg-green-100 text-green-700`
- **Action:** Order is ready to ship — seller has the physical label

---

## How Tracking Works

Each order's AWB status is stored in the `awbStatus` state object:

```javascript
awbStatus = {
  "order_id_1": { generated: true, downloaded: true },
  "order_id_2": { generated: true, downloaded: false },
  "order_id_3": { generated: false, downloaded: false }
}
```

### State Transitions

```
No Flow
   ↓
Preview AWB clicked → "Generated" (generated: true)
   ↓
Download AWB clicked → "Downloaded" (generated: true, downloaded: true)
```

---

## Column Position in Table

The AWB Status column is positioned as:

| Sr. No. | Order No. | Customer | Delivery Rating | Total | Payment | Status | **AWB Status** | Need to Pick | Tracking | Date & Time |

---

## Implementation Details

### File Modified
- `app/store/orders/page.jsx`

### Code Changes

**1. Add State Variable (line ~216)**
```javascript
const [awbStatus, setAwbStatus] = useState({}); 
// { orderId: { generated: true, downloaded: true } }
```

**2. Add Table Header (line ~1202)**
```jsx
<th className="px-4 py-3">AWB Status</th>
```

**3. Add Table Cell (line ~1349)**
```jsx
<td className="px-4 py-3">
  {(() => {
    const status = awbStatus[order._id];
    if (!status || !status.generated) {
      return <span className="text-slate-400 text-xs">—</span>;
    }
    if (status.downloaded) {
      return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">✓ Downloaded</span>;
    }
    return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">📄 Generated</span>;
  })()}
</td>
```

**4. Mark Generated (line ~2542)**
When "Preview AWB" button clicked:
```javascript
setAwbStatus(prev => ({
  ...prev,
  [selectedOrder._id]: { ...prev[selectedOrder._id], generated: true }
}))
```

**5. Mark Downloaded (line ~2569)**
When "Download AWB" button clicked:
```javascript
setAwbStatus(prev => ({
  ...prev,
  [selectedOrder._id]: { ...prev[selectedOrder._id], generated: true, downloaded: true }
}))
```

---

## Use Case Example

**Scenario:** Seller has 3 orders

| Order # | Customer | AWB Status | Action |
|---|---|---|---|
| 55239 | Sujit Nayak | — | Needs to click "Generate AWB" |
| 55240 | Vinish C V | 📄 Generated | Can click "Download AWB" to print label |
| 55241 | Balakrishna | ✓ Downloaded | Ready to handoff to courier |

---

## Important Notes

1. **Session-based tracking:** AWB status is stored in React state, so it resets if the page is refreshed.
2. **Visual indicator:** The blue and green badges make it easy at a glance to see which orders need action.
3. **No database changes required:** Tracking happens client-side only. For persistent storage, the `awbStatus` would need to be saved to the order document in MongoDB.
4. **Mobile responsive:** Badges scale well on mobile devices.

---

## Future Enhancement: Persistent Tracking

To make AWB status persist even after refresh, consider:

1. **Add to Order Model:**
   ```javascript
   awbStatus: {
     generated: { type: Boolean, default: false },
     generatedAt: Date,
     downloaded: { type: Boolean, default: false },
     downloadedAt: Date
   }
   ```

2. **Update when AWB is generated/downloaded:**
   - POST `/api/orders/:id/awb-status` with `{ generated: true/false, downloaded: true/false }`

3. **Load on component mount:**
   - Fetch order details which include `awbStatus` from the API
   - Pre-populate the `awbStatus` state with database values

---

## Testing Checklist

- [ ] Open an order and click "Generate AWB" → AWB Status changes to "📄 Generated"
- [ ] Click "Download AWB" → AWB Status changes to "✓ Downloaded"
- [ ] Verify badges display correct colors (blue for generated, green for downloaded)
- [ ] Open another order → AWB Status should still show "—"
- [ ] Multiple orders with different states are visible in the list
- [ ] On mobile, badges are readable and not cut off
