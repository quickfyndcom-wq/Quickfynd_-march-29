# WhatsApp Webhook - Debugging Guide

## Issue: WhatsApp Messages Not Sending

### Root Causes & Solutions

#### 1. **Environment Variables Missing**

**Status**: ✅ FIXED - Added to `.env`

Check your `utils/.env` has:

```
WHATSPORTAL_WEBHOOK_URL=https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt
WHATSPORTAL_WEBHOOK_TOKEN=63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a
```

---

#### 2. **Phone Number Formatting**

**Status**: ✅ FIXED - Auto-formatting in `lib/whatsapp-webhook.js`

Phone numbers are now auto-formatted:

- **10-digit**: `9876543210` → `+919876543210` (assumes India)
- **12-digit**: `919876543210` → `+919876543210`
- **Already formatted**: `+919876543210` → kept as-is

**If still not working**: Ensure order has phone in one of these fields:

- `guestPhone`
- `alternatePhone`
- `shippingAddress.phone`
- `shippingAddress.phoneNumber`

---

#### 3. **Order Status Not Matching**

**Solution**: Check exact status values trigger WhatsApp

Messages send only when:
| Status | Trigger |
|--------|---------|
| `SHIPPED` | Sends order shipped notification |
| `DELIVERED` | Sends delivery confirmation |
| `PAID` | Sends payment received (if payment status = PAID) |

**Debug**: Update order status to exactly `SHIPPED` or `DELIVERED`

---

#### 4. **Check Server Logs**

**Where to look**: Browser DevTools Console → Network → watch for errors

Look for these log patterns:

```
[WhatsApp] Sending message to: +919876543210
[Order API] WhatsApp check - Status: SHIPPED, Phone: 9876543210
[WhatsApp] Message sent successfully: { phoneNumber, messageId }
```

---

#### 5. **Webhook URL & Token Issues**

**Status**: ✅ ADDED with credentials

If WhatsPortal returns errors:

- `401 Unauthorized` → Token is incorrect
- `400 Bad Request` → Phone number format invalid
- `429 Too Many Requests` → Rate limit exceeded (wait a minute)

---

### Step-by-Step Testing

#### Test 1: Direct Webhook Call (Frontend Console)

```javascript
const phone = "+919876543210";
const message = "Test WhatsApp from Quickfynd";

const response = await fetch(
  "https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":
        "63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a",
    },
    body: JSON.stringify({
      phoneNumber: phone,
      message: message,
      metadata: { test: true },
    }),
  },
);

const data = await response.json();
console.log("Response:", response.status, data);
```

#### Test 2: Via Store Order Update

1. Go to Store Orders
2. Edit any order
3. Change status to `SHIPPED` (or `DELIVERED`)
4. Save
5. Check browser console for `[WhatsApp]` logs
6. Check order API response

#### Test 3: Check Phone Number is Present

In browser console:

```javascript
// When editing order in store/orders page
console.log(
  "Order phone:",
  selectedOrder?.phoneNumber ||
    selectedOrder?.shippingAddress?.phone ||
    selectedOrder?.guestPhone,
);
```

---

### Common Errors & Fixes

| Error                      | Cause                     | Fix                                               |
| -------------------------- | ------------------------- | ------------------------------------------------- |
| `Missing phone or message` | Phone number not in order | Add phone during order creation/edit              |
| `Invalid phone number`     | Wrong format (no digits)  | Ensure phone like `9876543210` or `+919876543210` |
| `Webhook failed: 401`      | Wrong token               | Regenerate token from WhatsPortal                 |
| `Webhook failed: 400`      | Invalid payload           | Check phone format in logs                        |
| No logs at all             | Env vars not loaded       | Restart dev server: `npm run dev`                 |

---

### Real-Time Troubleshooting

1. **Open DevTools** → Console tab
2. **Update an order** status to `SHIPPED`
3. **Watch for logs**:

   ```
   [Order API] WhatsApp check - Status: SHIPPED, Phone: ...
   [Order API] WhatsApp action - Status: SHIPPED
   [WhatsApp] Sending message to: +919876543210
   [Order API] WhatsApp SHIPPED result: { success: true, messageId: ... }
   ```

4. **If error appears**: Copy full error and check against table above

---

### Network Issues

If WhatsPortal URL is unreachable:

- Check internet connection
- Verify WhatsPortal service is online: `curl https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt`
- WhatsPortal might be down (check their status page)

---

### Next Steps

If still not working after these checks:

1. Share the **exact error from console**
2. Confirm **phone number format** in order
3. Verify **order status changed correctly**
4. Check **WhatsPortal workspace token** is active

---

## Summary of Improvements Made

✅ Added phone number auto-formatting (handles 10/12 digit numbers)
✅ Added detailed logging to track message flow
✅ Added environment variables to `.env`
✅ Improved error handling with stack traces
✅ Added payload debugging output
