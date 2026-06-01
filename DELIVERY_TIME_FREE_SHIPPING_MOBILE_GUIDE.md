# Delivery Time & Free Shipping — Mobile App Integration Guide

The web app shows two key delivery-related pieces of information on the product page:

1. **Estimated delivery date** — "Delivery by 30 Apr, Thu"
2. **Free delivery eligibility** — whether the product/order ships for free

Both are calculated **client-side** using data from the shipping settings API.

---

## Part 1 — Estimated Delivery Date

### How It Works

The delivery date is calculated based on a daily **2:00 PM cutoff**:

| Order placed | Days added | Example (today = 28 Apr) |
|---|---|---|
| Before 2:00 PM | +2 days | Delivery by **30 Apr, Thu** |
| After 2:00 PM | +3 days | Delivery by **01 May, Fri** |

### Calculation Logic (replicate on mobile)

```javascript
function getDeliveryDateLabel() {
  const now = new Date();
  const cutoffHour = 14; // 2:00 PM (24hr)

  let daysToAdd = now.getHours() >= cutoffHour ? 3 : 2;

  const deliveryDate = new Date(now);
  deliveryDate.setDate(now.getDate() + daysToAdd);

  const dateStr = deliveryDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  });
  const weekday = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short' });

  return `${dateStr}, ${weekday}`; // e.g. "30 Apr, Thu"
}
```

### When to Show the Delivery Badge

Show the delivery date badge **only when `product.fastDelivery === true`**.

```javascript
if (product.fastDelivery) {
  showDeliveryBadge("Delivery by " + getDeliveryDateLabel());
  showCutoffNote("Order before 2:00 PM to get delivery by this date");
}
```

### UI Text to Display

```
Delivery by 30 Apr, Thu  ⓘ
Order before 2:00 PM to get delivery by this date
```

---

## Part 2 — Free Delivery Logic

### API to Call

```
GET /api/shipping
```

No auth required. Returns the store's shipping settings.

### Response Fields You Need

```json
{
  "setting": {
    "enabled": true,
    "shippingType": "FLAT_RATE",
    "flatRate": 49,
    "freeShippingMin": 499,
    "estimatedDays": "3-5",
    "enableCOD": true,
    "codFee": 30,
    "enableExpressShipping": false,
    "expressShippingFee": 99,
    "expressEstimatedDays": "1-2",
    "stateCharges": [
      { "state": "kerala", "fee": 30 }
    ]
  }
}
```

### How to Calculate Shipping Fee on Mobile

```javascript
function calculateShippingFee({ cartItems, setting, paymentMethod, shippingState }) {
  if (!setting || !setting.enabled) return 0;

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const normalizedState = (shippingState || '').trim().toLowerCase();
  const stateFeeEntry = (setting.stateCharges || [])
    .find(e => e.state.trim().toLowerCase() === normalizedState);
  const stateFee = stateFeeEntry ? Number(stateFeeEntry.fee) : null;

  let shippingFee = 0;

  if (setting.shippingType === 'FLAT_RATE') {
    // Free if subtotal exceeds free shipping minimum (and no state override)
    if (setting.freeShippingMin && subtotal >= setting.freeShippingMin && stateFee === null) {
      shippingFee = 0; // FREE
    } else {
      shippingFee = setting.flatRate || 0;
    }
  } else if (setting.shippingType === 'PER_ITEM') {
    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let fee = (setting.perItemFee || 0) * totalQty;
    if (setting.maxItemFee) fee = Math.min(fee, setting.maxItemFee);
    shippingFee = fee;
  }

  // State-specific charge overrides base fee
  if (stateFee !== null) {
    shippingFee = stateFee;
  }

  // COD surcharge
  if (paymentMethod === 'COD' && setting.enableCOD && setting.codFee) {
    shippingFee += setting.codFee;
  }

  return shippingFee;
}
```

### "Free Delivery" Label — When to Show

| Condition | Label |
|---|---|
| Calculated `shippingFee === 0` | Show **"FREE Delivery"** in green |
| `shippingFee > 0` | Show **"₹{shippingFee} Delivery"** |
| `!setting.enabled` | Show **"Free Delivery"** (shipping disabled globally) |

### Show "Free Delivery" on Product Page (before cart)

On the product detail page you don't have a cart total yet, so show the threshold hint:

```javascript
// Example: freeShippingMin = 499, product price = 399
if (productPrice >= setting.freeShippingMin) {
  show("FREE Delivery");
} else {
  const amountNeeded = setting.freeShippingMin - productPrice;
  show(`Add ₹${amountNeeded} more for FREE Delivery`);
  // or simply show flat rate: show("₹49 Delivery");
}
```

---

## Part 3 — Product API Fields

### Endpoint

```
GET /api/products/:id
```

### Relevant Fields in Product Response

```json
{
  "product": {
    "_id": "...",
    "name": "...",
    "price": 599,
    "fastDelivery": true,        // true → show delivery date badge
    "freeDelivery": false        // optional override per product (if present)
  }
}
```

> **`fastDelivery`** is the flag that controls whether the delivery date badge appears.

---

## Part 4 — Checkout Shipping Fee

When the user places an order, send the pre-calculated shipping fee in the order payload:

```json
POST /api/orders
{
  "items": [...],
  "paymentMethod": "COD",
  "shippingFee": 0,
  "addressId": "...",
  "couponCode": ""
}
```

The `shippingFee` value must match what `calculateShippingFee()` returned on the client.

---

## Part 5 — Summary for Mobile Dev

| Feature | Where to get data | When to show |
|---|---|---|
| Delivery date label | Calculate client-side (2PM cutoff logic) | `product.fastDelivery === true` |
| "Order before 2 PM" note | Static text | Same as above |
| FREE Delivery badge | `GET /api/shipping` → check `freeShippingMin` vs subtotal | `shippingFee === 0` |
| Shipping fee amount | Calculate using `calculateShippingFee()` | `shippingFee > 0` |
| COD surcharge | `setting.codFee` (add when `paymentMethod === 'COD'`) | COD selected at checkout |
| Express shipping | `setting.enableExpressShipping`, `setting.expressShippingFee` | If express option offered |

---

## Part 6 — Flutter / React Native Pseudocode

### Delivery Date Widget

```dart
// Flutter
String getDeliveryLabel() {
  final now = DateTime.now();
  final cutoff = 14; // 2 PM
  final daysToAdd = now.hour >= cutoff ? 3 : 2;
  final deliveryDate = now.add(Duration(days: daysToAdd));
  final formatted = DateFormat('dd MMM, EEE').format(deliveryDate);
  return 'Delivery by $formatted';
}

// Show only if product.fastDelivery == true
if (product.fastDelivery) {
  Text(getDeliveryLabel());
  Text('Order before 2:00 PM to get delivery by this date');
}
```

### Free Delivery Widget

```dart
// Flutter
Widget shippingLabel(double fee) {
  if (fee == 0) {
    return Text('FREE Delivery', style: TextStyle(color: Colors.green));
  }
  return Text('₹${fee.toStringAsFixed(0)} Delivery');
}
```
