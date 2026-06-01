# Promotional Email Campaign System

## Overview
Automated daily promotional email system that sends attractive, themed marketing emails to customers. The system includes 20 unique email templates and can be triggered manually or via scheduled cron jobs.

## Features
- ✨ **20 Unique Templates**: Each with distinctive design, colors, and messaging
- 📧 **Daily Automation**: Scheduled to send at 10 AM daily via Inngest
- 🎯 **Smart Targeting**: Sends to verified customers with valid emails
- 🛍️ **Dynamic Products**: Automatically includes top-selling products
- 📊 **Tracking**: Monitors sent/failed emails for each campaign
- 🎨 **Responsive Design**: Beautiful HTML templates that work on all devices

## Email Templates

### Available Templates
1. **Buy Now, Pay Later** - Flexible payment options theme
2. **Price Dropped** - Price reduction alerts
3. **Limited-Time Deals** - Urgency-driven promotions
4. **Trending Now** - Popular products showcase
5. **Wishlist Cheaper** - Personalized price drops
6. **Selling Fast** - Low stock alerts
7. **Best Finds** - Daily curated selections
8. **Flash Deals** - Time-sensitive offers
9. **Smart Buys** - Value-focused messaging
10. **Popular Products** - Bestseller highlights
11. **Last Chance** - Final opportunity alerts
12. **Daily Essentials** - Everyday items focus
13. **Don't Wait** - Urgency messaging
14. **More Value** - Fast delivery emphasis
15. **New Deals** - Fresh product launches
16. **Shop Smart** - Budget-conscious theme
17. **Almost Sold Out** - Scarcity marketing
18. **Smart Buy** - Personalized recommendations
19. **Limited Stock** - Inventory alerts
20. **Love Quickfynd** - Brand-focused messaging

## API Endpoints

### 1. Send Promotional Emails
**Endpoint**: `/api/promotional-emails`

#### GET Request (Random Campaign)
Sends a random template to 50 customers.

```bash
curl https://yoursite.com/api/promotional-emails
```

**Response**:
```json
{
  "success": true,
  "template": {
    "id": "trending-now",
    "subject": "Trending Now on Quickfynd 🔥"
  },
  "totalCustomers": 50,
  "emailsSent": 48,
  "emailsFailed": 2
}
```

#### POST Request (Targeted Campaign)
Send specific template to specific customers.

```bash
curl -X POST https://yoursite.com/api/promotional-emails \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "price-dropped",
    "customerEmails": ["customer@example.com"],
    "limit": 100
  }'
```

**Request Body**:
- `templateId` (optional): Specific template ID to use
- `customerEmails` (optional): Array of specific customer emails
- `limit` (optional): Maximum number of customers (default: 50)

### 2. Get Templates
**Endpoint**: `/api/promotional-emails/templates`

#### Get All Templates
```bash
curl https://yoursite.com/api/promotional-emails/templates
```

**Response**:
```json
{
  "success": true,
  "totalTemplates": 20,
  "templates": [
    {
      "id": "buy-now-pay-later",
      "subject": "Buy Now, Pay Later – Don't Miss Out",
      "title": "Buy Now, Pay Later",
      "subtitle": "Don't Miss Out",
      "emoji": "💳",
      "color": "#8b5cf6",
      "content": "Shop now and pay at your convenience...",
      "cta": "Start Shopping"
    }
  ]
}
```

#### Get Specific Template
```bash
curl https://yoursite.com/api/promotional-emails/templates?id=trending-now
```

## Automated Schedule (Inngest)

The system automatically sends promotional emails daily at 10 AM via Inngest cron job.

### Function: `sendDailyPromotionalEmail`
- **Schedule**: `0 10 * * *` (10 AM daily)
- **Recipients**: 100 customers per day
- **Template**: Random selection
- **Products**: Top 4 best-selling items

### How It Works:
1. Selects a random template from the 20 available
2. Fetches 100 customers with verified emails
3. Retrieves top 4 best-selling products
4. Sends personalized emails to each customer
5. Returns statistics on sent/failed emails

## Template Structure

Each template includes:
```javascript
{
  id: 'unique-template-id',
  subject: 'Email Subject Line',
  title: 'Main Title',
  subtitle: 'Subtitle Text',
  emoji: '🔥',
  color: '#hex-color',
  content: 'Email body description',
  cta: 'Call to Action Button Text',
  template: (products) => 'HTML Email Template'
}
```

## Email Design Features

✅ **Gradient Headers**: Eye-catching color gradients
✅ **Product Grid**: Displays up to 4 products with images
✅ **Responsive**: Works on mobile and desktop
✅ **Brand Logo**: Quickfynd logo included
✅ **CTA Buttons**: Prominent call-to-action buttons
✅ **Footer**: Help links and company information
✅ **Price Display**: Shows current and original prices

## Testing

### Manual Testing
1. **Test Random Campaign**:
```bash
GET /api/promotional-emails
```

2. **Test Specific Template**:
```bash
POST /api/promotional-emails
{
  "templateId": "flash-deals",
  "customerEmails": ["your-test-email@example.com"]
}
```

3. **View All Templates**:
```bash
GET /api/promotional-emails/templates
```

### Development Mode
In development, the API returns detailed results including individual email statuses.

## Configuration

### Environment Variables
Make sure these are set in `.env`:
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@quickfynd.com
NEXT_PUBLIC_BASE_URL=https://quickfynd.com
```

### Customization

#### Modify Send Frequency
Edit `inngest/functions.js`:
```javascript
{ cron: '0 10 * * *' } // Change to your preferred schedule
```

#### Adjust Recipients Count
Modify the `limit` in the API or Inngest function:
```javascript
.limit(100) // Change number of recipients
```

## Best Practices

1. **Monitor Performance**: Check email sent/failed ratios
2. **Avoid Spam**: Don't send too frequently (1 per day recommended)
3. **Segment Customers**: Use customer preferences for targeting
4. **A/B Testing**: Track which templates perform best
5. **Unsubscribe Option**: Add unsubscribe links (future enhancement)
6. **Product Relevance**: Ensure products match template theme

## Future Enhancements

- [ ] Customer segmentation by purchase history
- [ ] Unsubscribe/preference management
- [ ] Email open/click tracking
- [ ] A/B testing framework
- [ ] Personalized product recommendations
- [ ] Time zone-aware scheduling
- [ ] Campaign performance analytics
- [ ] Email template preview UI

## Troubleshooting

### Emails Not Sending
1. Check Resend API key is valid
2. Verify customers have valid email addresses
3. Check email service quota limits
4. Review server logs for errors

### Template Not Found
- Verify template ID matches one from `/api/promotional-emails/templates`
- Check for typos in template ID

### Low Delivery Rate
- Verify email provider settings
- Check spam folder
- Ensure FROM email is verified in Resend

## Support

For issues or questions:
- Check server logs: `npm run dev`
- Review Inngest dashboard for cron job status
- Test emails in development mode first

---

**Created**: January 30, 2026
**System**: Quickfynd E-commerce Platform
**Technology**: Next.js, Inngest, Resend
