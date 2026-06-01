# Order Tracking Setup Guide (Emails Disabled)

Email notifications have been removed from this project. The endpoints remain as no-ops to keep flows working without an email provider.

What still works:
- Order tracking fields on orders: `trackingId`, `trackingUrl`, `courier`.
- Update tracking via `PUT /api/store/orders/[orderId]`.
- The notification endpoints respond with success but do not send emails:
   - `POST /api/notifications/order-status`
   - `POST /api/notifications/guest-order`

If you want to enable email in the future, add your preferred provider (Nodemailer/SES/SendGrid/etc.) inside those routes.

1. **Add tracking details to an order:**
   - Go to Store Dashboard → Orders
   - Click on any order
   - Fill in the tracking form (Tracking ID, Courier, optional URL)
   - Click "Update Tracking & Notify Customer"

2. **Change order status:**
   - In the orders table, change the status dropdown
   - Customer will receive an email notification automatically

---

## 📧 Email Templates

### Shipped Email Example:
\`\`\`
Subject: Order Shipped - #AB12CD34

Great news, John! Your order has been shipped!

Order ID: clxxx...

┌─────────────────────────────┐
│   Tracking Information      │
├─────────────────────────────┤
│ Tracking ID: 1234567890     │
│ Courier: FedEx              │
│ Track Your Order →          │
└─────────────────────────────┘

Order Items:
• Product Name - Qty: 2 - $50
• Another Product - Qty: 1 - $30
\`\`\`

---

## 🔧 How It Works

### When Store Owner Updates Order:

1. **Update Tracking Details:**
   \`\`\`javascript
   PUT /api/store/orders/{orderId}
   Body: {
     trackingId: "1234567890",
     courier: "FedEx", 
     trackingUrl: "https://fedex.com/track?id=1234567890"
   }
   \`\`\`

2. **Update Status:**
   \`\`\`javascript
   PUT /api/store/orders/{orderId}
   Body: { status: "SHIPPED" }
   \`\`\`

3. **API automatically:**
   - Updates order in database
   - Calls email notification API
   - Sends formatted email to customer
   - Returns success message

### Email Notification Flow:
\`\`\`
Order Update → API → Email Service (Resend) → Customer's Inbox
\`\`\`

---

## 🎨 Features

### For Store Owners:
✅ Update order status with dropdown (sends email automatically)
✅ Add tracking details anytime
✅ Update tracking if courier changes
✅ Beautiful redesigned order modal
✅ See tracking info for all orders

### For Customers:
✅ Receive email for every status change
✅ Get tracking details when order ships
✅ Click tracking URL to see live updates
✅ Know courier name
✅ Professional email design

---

## 📱 Email Service Alternatives

### 1. **Resend** (Recommended - What we use)
- Free tier: 3,000 emails/month
- Easy setup
- Great deliverability
- Modern API

### 2. **NodeMailer** (SMTP)
\`\`\`javascript
// Install: npm install nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your@email.com',
    pass: 'your-app-password'
  }
});
\`\`\`

### 3. **SendGrid**
- Free tier: 100 emails/day
- Good for transactional emails

---

## 🧪 Testing Without Email Service

If you don't configure an email service, the system will:
- ✅ Still update tracking details
- ✅ Still update order status
- ✅ Log email content to console
- ⚠️ Not actually send emails to customers

To see the email content, check your terminal/console logs.

---

## 🌐 Popular Courier Tracking URLs

You can use these templates for the tracking URL:

- **FedEx**: `https://www.fedex.com/fedextrack/?tracknumbers={TRACKING_ID}`
- **UPS**: `https://www.ups.com/track?tracknum={TRACKING_ID}`
- **DHL**: `https://www.dhl.com/en/express/tracking.html?AWB={TRACKING_ID}`
- **USPS**: `https://tools.usps.com/go/TrackConfirmAction?tLabels={TRACKING_ID}`
- **Blue Dart**: `https://www.bluedart.com/tracking?trackFor={TRACKING_ID}`
- **Delhivery**: `https://www.delhivery.com/track/package/{TRACKING_ID}`

---

## 🔐 Environment Variables Needed

Add these to your `.env` file:

\`\`\`env
# Email Configuration (Required for sending emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=orders@yourdomain.com

# App URL (Required for email API calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

---

## 📝 Next Steps (Optional Enhancements)

1. **SMS Notifications** - Add Twilio integration
2. **WhatsApp Notifications** - Use WhatsApp Business API
3. **Push Notifications** - Add browser notifications
4. **Customer Dashboard** - Show tracking on customer's order page
5. **Auto-update Tracking** - Fetch real-time updates from courier APIs
6. **Email Templates** - Create custom branded email templates
7. **Notification Preferences** - Let customers choose notification methods

---

## ❓ Troubleshooting

### Emails not sending?
1. Check RESEND_API_KEY is set correctly
2. Check EMAIL_FROM domain is verified in Resend
3. Check console logs for error messages
4. Verify email address is valid

### Tracking not updating?
1. Make sure you ran `npx prisma db push`
2. Check browser console for errors
3. Verify API endpoint is being called

### Database errors?
1. Run `npx prisma generate` after schema changes
2. Restart your dev server

---

## 🎉 You're All Set!

Your order tracking and email notification system is ready to use! Customers will now receive beautiful emails whenever you update their order status or add tracking information.
