# Email Notification System

This application sends automated emails to customers for various events using Resend API.

## Email Types

### 1. Welcome Email
**Trigger:** When a customer creates a new account (via email/password or Google sign-in)
**Content:**
- Welcome message
- Benefits of having an account (order tracking, wishlist, exclusive deals, etc.)
- "Start Shopping" button
- Contact information

**Implementation:**
- Automatically sent from `SignInModal.jsx` after successful registration
- Uses `/api/send-welcome-email` endpoint
- Function: `sendWelcomeEmail()` in `lib/email.js`

### 2. Order Confirmation Email
**Trigger:** When a customer places a new order (logged-in or guest)
**Content:**
- Order ID and date
- List of ordered items with images
- Total amount breakdown
- Shipping address
- "Track Your Order" button
- Order receipt

**Implementation:**
- Automatically sent from `/api/orders` endpoint after order creation
- Function: `sendOrderConfirmationEmail()` in `lib/email.js`
- Works for both registered users and guest checkout

### 3. Order Shipped Email
**Trigger:** When admin updates order status to "SHIPPED" and adds tracking info
**Content:**
- Shipment notification
- Courier name
- Tracking ID
- Clickable tracking URL
- "Track Your Shipment" button
- Expected delivery information

**Implementation:**
- Sent via `/api/send-shipping-email` endpoint
- Function: `sendOrderShippedEmail()` in `lib/email.js`
- Admin should call this endpoint after updating order with tracking details

## Configuration

### Environment Variables (.env)
```env
RESEND_API_KEY=re_CVyyMDU5_7AQJkrZe2qKq9593VBaApfpA
EMAIL_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_EMAIL=
```

### Email Service
- **Provider:** Resend (https://resend.com)
- **Package:** `resend` (already installed)
- **From Address:** Currently using `onboarding@resend.dev` (Resend default)
- **Note:** For production, verify your domain with Resend to use custom email like `noreply@quickfynd.com`

## Email Templates

All email templates use:
- Responsive HTML/CSS design
- Professional styling with brand colors (slate, orange, blue)
- Mobile-friendly layout
- Clear call-to-action buttons
- Company branding

## How to Customize

### 1. Change Email Design
Edit the HTML templates in `lib/email.js`:
- `sendWelcomeEmail()` - Welcome email template
- `sendOrderConfirmationEmail()` - Order confirmation template
- `sendOrderShippedEmail()` - Shipping notification template

### 2. Add New Email Types
1. Create new function in `lib/email.js`:
```javascript
export async function sendYourNewEmail(data) {
  const subject = 'Your Subject';
  const html = `<your-html-template>`;
  return sendMail({ to: data.email, subject, html });
}
```

2. Call it from your API endpoint or component

### 3. Send Shipping Email (Admin)
When admin marks order as shipped:

```javascript
// Admin panel or order update endpoint
await fetch('/api/send-shipping-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: 'order-id-here' })
});
```

## Testing

### Test Welcome Email
1. Create a new account via the Sign In modal
2. Check the email inbox for welcome message

### Test Order Confirmation
1. Place a new order (as logged-in user or guest)
2. Check email inbox for order confirmation

### Test Shipping Notification
Use API testing tool (Postman/Thunder Client):
```bash
POST /api/send-shipping-email
Content-Type: application/json

{
  "orderId": "your-order-id"
}
```

## Production Setup

1. **Verify Domain with Resend:**
   - Go to https://resend.com/domains
   - Add your domain (e.g., quickfynd.com)
   - Add DNS records as instructed
   - Update `EMAIL_FROM` to `noreply@quickfynd.com`

2. **Update App URL:**
   - Change `NEXT_PUBLIC_APP_URL` to your production domain
   - All email links will automatically update

3. **Monitor Email Delivery:**
   - Check Resend dashboard for email analytics
   - Monitor bounces and failures
   - Set up webhooks for delivery status (optional)

## Troubleshooting

### Emails Not Sending
1. Check `RESEND_API_KEY` is valid
2. Check server logs for error messages
3. Verify email address is valid
4. Check Resend dashboard for API limits

### Emails Going to Spam
1. Verify domain with Resend (SPF/DKIM records)
2. Use professional email template (already done)
3. Avoid spam trigger words
4. Add unsubscribe link (optional)

### Email Content Not Showing
1. Check browser console for JavaScript errors
2. Verify data is being passed correctly
3. Test with simple text email first
4. Check email HTML rendering in different clients

## Future Enhancements

Potential additions:
- [ ] Order delivery confirmation email
- [ ] Password reset email
- [ ] Abandoned cart reminder email
- [ ] Product back in stock notification
- [ ] Special offers/promotional emails
- [ ] Order cancellation email
- [ ] Review request email (after delivery)
- [ ] Birthday/anniversary emails

## Support

For email-related issues:
- Resend Documentation: https://resend.com/docs
- Contact: support@quickfynd.com