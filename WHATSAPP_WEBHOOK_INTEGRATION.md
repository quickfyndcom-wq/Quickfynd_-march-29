# WhatsPortal WhatsApp Webhook Integration

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# WhatsPortal Webhook Configuration
WHATSPORTAL_WEBHOOK_URL=https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt
WHATSPORTAL_WEBHOOK_TOKEN=63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a
```

### 2. Webhook Features Implemented

#### Order Shipped Notification

- **Trigger**: When order status changes to `SHIPPED`
- **Message**: Includes order number, tracking ID, and courier info
- **To**: Customer phone number from shipping address

#### Order Delivered Notification

- **Trigger**: When order status changes to `DELIVERED`
- **Message**: Confirmation with delivery rating link
- **To**: Customer phone number

#### Payment Confirmation Notification

- **Trigger**: When payment status changes to `PAID`
- **Message**: Payment confirmation with order details
- **To**: Customer phone number

### 3. Phone Number Requirements

WhatsApp messages are sent to:

1. Guest phone (if available)
2. Alternate phone (fallback)
3. Shipping address phone (fallback)

Ensure phone numbers include country code format: `+919876543210`

### 4. Integration Points

**File**: `app/api/store/orders/[orderId]/route.js`

The WhatsApp notification is automatically triggered when:

- Order status is updated via seller dashboard
- Payment status changes to paid
- Tracking/shipping info is added

### 5. Testing

To test the webhook:

```javascript
// From browser console or API client:
const phoneNumber = "+919876543210";
const message = "Test message from Quickfynd";

await fetch(
  "https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":
        "63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a",
    },
    body: JSON.stringify({
      phoneNumber,
      message,
      metadata: { test: true },
    }),
  },
);
```

### 6. Available Functions

**`lib/whatsapp-webhook.js`** exports:

- `sendWhatsAppMessage(phone, message, metadata)` - Send custom message
- `sendOrderConfirmation(order)` - Order placed notification
- `sendOrderShipped(order)` - Order shipped notification
- `sendOrderDelivered(order)` - Order delivered notification
- `sendPaymentNotification(order)` - Payment received notification
- `sendReturnNotification(order, reason)` - Return initiated notification

### 7. Monitoring

Check browser console or server logs for:

- `[WhatsApp] Message sent: { phoneNumber, messageId }`
- `[WhatsApp] Send error: ...`
- `[WhatsApp] Webhook error: ...`

### 8. Rate Limiting

- WhatsPortal may have rate limits; check their documentation
- Current implementation doesn't implement retry logic; consider adding if needed

### 9. Common Issues

**Empty phone number**: Ensure customer phone is captured during checkout
**Message too long**: WhatsApp has 4096 character limit per message
**Format issues**: Phone must include country code (+)

### 10. Future Enhancements

- Customize message templates via settings
- Add delivery rating links dynamically
- Send order items list in the message
- Add return/refund status notifications
- Implement message scheduling
- Add delivery agent tracking updates
