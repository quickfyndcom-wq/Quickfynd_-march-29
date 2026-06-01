# Support Ticket System - Email Setup Guide

## Overview
The support ticket system now includes automatic email notifications to both customers and administrators when:
- A new ticket is created
- A reply is added to a ticket
- Ticket status changes

## Features Added

### 1. Priority Levels
Tickets now support 4 priority levels:
- **Low**: General inquiries
- **Normal**: Standard support (default)
- **High**: Important issues
- **Urgent**: Critical problems

Priority is displayed with color-coded badges throughout the system.

### 2. Email Notifications

#### Customer Emails:
- Ticket creation confirmation with full details
- Notifications when admin replies to their ticket
- All emails include direct links to view/reply to tickets

#### Admin Emails:
- New ticket notifications with priority highlighted
- Customer reply notifications
- All emails include direct links to admin panel

## Email Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin email for notifications
ADMIN_EMAIL=admin@quickfynd.com

# Site URL for email links
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account

2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS`

3. **Update Environment Variables**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASS=your-16-character-app-password
   ADMIN_EMAIL=admin@quickfynd.com
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

### Alternative SMTP Providers

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

## Testing

### Test Email Functionality

1. **Create a test ticket**:
   - Go to `/help`
   - Fill out the "Submit a Ticket" form
   - Check both customer and admin emails

2. **Test replies**:
   - Go to `/dashboard/tickets`
   - Open a ticket and add a reply
   - Check that emails are sent

3. **Check email logs**:
   - Monitor server console for email sending status
   - Look for "Email sent successfully" or error messages

### Development Mode (Optional)

For development without real email sending, you can use **Ethereal Email**:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated-user@ethereal.email
SMTP_PASS=generated-password
```

Get credentials from: https://ethereal.email/create

## Files Modified

### Email Service
- `lib/emailService.js` - Email templates and sending logic

### API Routes
- `app/api/tickets/route.js` - Ticket creation with email
- `app/api/tickets/[ticketId]/route.js` - Reply handling with email

### UI Components
- `app/help/page.jsx` - Added priority selector
- `app/dashboard/tickets/page.jsx` - Display priority badges
- `app/dashboard/tickets/[ticketId]/page.jsx` - Show priority in details

### Models
- `models/Ticket.js` - Already had priority field

## Troubleshooting

### Emails not sending

1. **Check environment variables**:
   ```bash
   # Verify .env file has correct values
   cat .env | grep SMTP
   ```

2. **Check server logs**:
   - Look for email errors in console
   - Common issues: wrong password, port blocked

3. **Gmail troubleshooting**:
   - Ensure 2FA is enabled
   - Use App Password, not regular password
   - Check "Less secure app access" is OFF

4. **Port issues**:
   - Try port 465 (SSL) instead of 587 (TLS)
   - Update secure setting: `secure: true` for port 465

### Emails going to spam

1. Add SPF record to your domain
2. Add DKIM signing
3. Use a verified sending domain
4. Keep email content professional

## Admin Panel Integration

To allow admins to reply to tickets, you'll need to:

1. Create admin ticket management pages in `/store/tickets`
2. Add admin reply functionality
3. Set `sender: 'admin'` when admin replies
4. Email will automatically notify customer

## Future Enhancements

Consider adding:
- Ticket assignment to specific support agents
- SLA tracking based on priority
- Email templates customization in admin panel
- Attachment support in tickets
- Ticket categories with auto-routing
- Knowledge base integration
- Customer satisfaction ratings

## Support

For issues or questions about the ticket system, please check:
- Server console logs for detailed errors
- Email provider documentation
- SMTP connection settings
