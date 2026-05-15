# WhatsApp Integration - Complete Fix & Testing Guide

## Root Cause Found ✓

**Environment variables were in `utils/.env` instead of `.env.local` (root)**

- Next.js only reads from `.env.local` in the project root
- Fixed: Added variables to `.env.local`

## Step 1: Restart Development Server

This is **CRITICAL** - env vars only load on startup:

```bash
# Stop current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 2: Test WhatsApp Integration

### Option A: Test UI (Easiest)

1. Go to: `http://localhost:3000/api/whatsapp-test`
2. You'll see a form with fields:
   - Phone Number (e.g., 9876543210)
   - Country (select India)
   - Test Type (select "Simple Message")
3. Click "Send Test Message"
4. Check response - should show `"success": true`

### Option B: Direct API Call

```bash
curl -X POST http://localhost:3000/api/whatsapp-test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "country": "IN",
    "testType": "simple"
  }'
```

### Option C: Test via Store Orders

1. Go to Store → Orders
2. Select any order
3. Change status to `SHIPPED` (or `DELIVERED`)
4. Click Save
5. Check browser console for `[WhatsApp]` logs
6. Check network tab for `/api/store/orders/[orderId]` response

## Step 3: Check Console Logs

### Expected Success Logs:

```
[WhatsApp] Sending message to: +919876543210 Country: IN
[WhatsApp] Message sent successfully: { phoneNumber, messageId }
```

### Expected Error Logs (if phone missing):

```
[WhatsApp] Missing phone or message
[WhatsApp] Invalid phone number
```

### Expected Network Errors (if token wrong):

```
[WhatsApp] Webhook error: 401
[WhatsApp] Webhook error: 400
```

## Step 4: Troubleshooting

| Problem                                  | Solution                                                          |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Still says env vars missing              | Restart dev server (`npm run dev`)                                |
| 401 Unauthorized                         | Token is wrong, check `.env.local`                                |
| 400 Bad Request                          | Phone number format wrong (must be digits only)                   |
| No logs appearing                        | Open browser DevTools → Console tab                               |
| Message sends but don't receive WhatsApp | WhatsPortal workspace not configured for your number              |
| `sendOrderShipped is not a function`     | File not saved, clear `.next` folder: `rm -rf .next` then restart |

## Step 5: Verify Environment Variables Loaded

Test endpoint shows what's loaded:

```
GET /api/whatsapp-test
```

Response will show:

```json
{
  "debug": {
    "envCheck": {
      "WEBHOOK_URL": "✓ Loaded",
      "WEBHOOK_TOKEN": "✓ Loaded"
    }
  }
}
```

If either shows `✗ Missing`:

1. Check `.env.local` has both variables
2. Restart dev server
3. Clear `.next` cache: `rm -rf .next`

## Files Modified

- `.env.local` - Added WhatsApp credentials
- `lib/whatsapp-webhook.js` - Multi-country support
- `app/api/store/orders/[orderId]/route.js` - Integrated notifications
- `app/api/whatsapp-test/route.js` - **NEW** Test endpoint

## Quick Checklist

- [ ] Restart dev server after changing `.env.local`
- [ ] Test phone number is in format: `9876543210` or `+919876543210`
- [ ] Verify order has `SHIPPED` or `DELIVERED` status
- [ ] Check browser console for WhatsApp logs
- [ ] Check `.env.local` has both WHATSPORTAL variables
- [ ] Visit `/api/whatsapp-test` to verify env vars loaded

## After Testing Works:

1. Deploy to production
2. Add `.env.local` variables to production environment
3. Restart production app
4. Test with real phone numbers

## Contact WhatsPortal Support if:

- Messages send but don't arrive on phone
- Need to verify workspace is setup correctly
- Want to add template messages
- Rate limiting issues
