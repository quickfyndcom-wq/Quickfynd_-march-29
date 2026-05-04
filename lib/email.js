const EMAIL_LOGO_URL = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.quickfynd.com'}/assets/logo/logo3.png`;
const SUPPORT_EMAIL = 'support@quickfynd.com';
const STORE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://quickfynd.com';

/**
 * Shared builder for all order status emails.
 * Produces a consistent modern design with order details, seller info, and fast-selling products.
 */
async function buildOrderStatusHtml({ name, order = {}, heroTitle, heroSubtitle, heroGradient, statusLabel, extraHtml = '' }) {
  const displayOrderNumber = getDisplayOrderNumber(order) || order?.shortOrderNumber || 'N/A';
  const trackingId = order?.trackingId || order?.awb || order?.airwayBillNo || 'Will be shared soon';
  const courier = order?.courier || 'Will be assigned shortly';
  const paymentMethod = order?.paymentMethod || 'N/A';
  const orderDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });
  const orderTotal = Number(order?.total || order?.amount || 0).toFixed(2);
  const shippingAddress = order?.shippingAddress || {};
  const sellerName = process.env.EMAIL_FROM_NAME || 'QuickFynd';
  const sellerAddress = '14/380 Kunnamangalam MLA Road, Peruvayal, Kozhikode, Kerala 673571, India';
  const returnAddress = 'Nilaas Shop, MLA Road, Near Police Station, Ambalamukku, Kunnamangalam, Kozhikode - 673571, Kerala, India';
  const gradient = heroGradient || 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 45%, #7c3aed 100%)';

  // Fetch real products from DB for the "Deals & Offers" section
  let dealProducts = [];
  try {
    const { default: dbConnect } = await import('@/lib/mongodb');
    const { default: Product } = await import('@/models/Product');
    await dbConnect();
    const dbProducts = await Product.find({ inStock: true })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('name images slug price mrp')
      .lean();
    dealProducts = dbProducts.map((p) => ({
      name: p.name,
      mrp: p.mrp || p.price || 0,
      offer: p.price || 0,
      discount: (p.mrp && p.mrp > (p.price || 0))
        ? `${Math.round(((p.mrp - (p.price || 0)) / p.mrp) * 100)}% OFF`
        : '',
      link: `${STORE_BASE_URL}/product/${p.slug}?ref=email`,
      image: p.images?.[0] || '',
    }));
  } catch (e) {
    console.error('[email] Failed to fetch deal products:', e);
  }

  const makeCard = (p) => {
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:140px;object-fit:cover;display:block;" />`
      : `<div style="background:#f0f4ff;height:140px;text-align:center;line-height:140px;font-size:40px;">🛍️</div>`;
    const mrpHtml = (p.mrp && p.mrp !== p.offer)
      ? `&nbsp;<span style="font-size:11px;color:#94a3b8;text-decoration:line-through;">₹${p.mrp}</span>`
      : '';
    const discHtml = p.discount
      ? `&nbsp;<span style="font-size:10px;font-weight:700;background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;">${p.discount}</span>`
      : '';
    return `<a href="${p.link}" style="text-decoration:none;color:#0f172a;display:block;border-radius:14px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.10);">${imgHtml}<div style="background:#fff;padding:12px 12px 14px;"><p style="margin:0 0 6px;font-size:13px;font-weight:700;line-height:1.35;color:#0f172a;">${p.name}</p><p style="margin:0 0 8px;"><span style="font-size:16px;font-weight:800;color:#16a34a;">₹${p.offer}</span>${mrpHtml}${discHtml}</p><span style="display:inline-block;background:#2563eb;color:#fff;font-size:12px;font-weight:800;padding:7px 14px;border-radius:7px;letter-spacing:.3px;">Shop Now →</span></div></a>`;
  };
  const productRows = [];
  for (let i = 0; i < dealProducts.length; i += 2) {
    const left = dealProducts[i];
    const right = dealProducts[i + 1];
    productRows.push(`
      <tr>
        <td style="width:50%;padding:6px;vertical-align:top;">${makeCard(left)}</td>
        <td style="width:50%;padding:6px;vertical-align:top;">${right ? makeCard(right) : ''}</td>
      </tr>
    `);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{margin:0;padding:16px 0;background:#e8eeff;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;}
  .wrap{max-width:620px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(37,99,235,.18);}
  .hero{background:${gradient};color:#fff;text-align:center;padding:32px 24px 28px;}
  .hero h1{margin:14px 0 8px;font-size:26px;font-weight:800;letter-spacing:.1px;line-height:1.25;}
  .hero p{margin:0;opacity:.95;font-size:14px;line-height:1.5;}
  .pill{display:inline-block;margin-top:14px;background:rgba(255,255,255,.22);border:1.5px solid rgba(255,255,255,.5);border-radius:999px;padding:6px 18px;font-size:12px;font-weight:800;letter-spacing:.6px;color:#fff;}
  .body{background:#f0f4ff;padding:20px 16px;}
  .card{background:#fff;border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 2px 8px rgba(37,99,235,.07);}
  .card-title{margin:0 0 14px;font-size:13px;color:#1e40af;font-weight:800;text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid #e0e7ff;padding-bottom:8px;}
  .grid{width:100%;border-collapse:collapse;}
  .grid td{width:50%;padding:8px 4px;vertical-align:top;}
  .lbl{color:#94a3b8;font-size:10px;margin:0 0 3px;text-transform:uppercase;letter-spacing:.5px;font-weight:600;}
  .val{color:#0f172a;font-size:14px;font-weight:700;margin:0;word-break:break-word;line-height:1.4;}
  .track-btn{display:inline-block;margin-top:14px;padding:13px 28px;border-radius:10px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff !important;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(37,99,235,.4);}
  .footer{text-align:center;font-size:13px;color:#64748b;padding:22px 16px;border-top:1px solid #e2e8f0;background:#fff;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <img src="${EMAIL_LOGO_URL}" alt="QuickFynd" style="max-width:150px;height:36px;object-fit:contain;" />
    <h1>${heroTitle}</h1>
    <p>${heroSubtitle}</p>
    ${statusLabel ? `<div class="pill">${statusLabel}</div>` : ''}
  </div>
  <div class="body">
    <div class="card" style="background:linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%);border:1.5px solid #c7d2fe;">
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Hi ${name || 'there'}! 👋</p>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;">${heroSubtitle}</p>
    </div>
    ${extraHtml}
    <div class="card">
      <p class="card-title">📦 Order Details</p>
      <table class="grid" role="presentation">
        <tr>
          <td><p class="lbl">Order Number</p><p class="val">#${displayOrderNumber}</p></td>
          <td><p class="lbl">Order Date</p><p class="val">${orderDate}</p></td>
        </tr>
        <tr>
          <td><p class="lbl">Status</p><p class="val" style="color:#2563eb;">${statusLabel || 'In Progress'}</p></td>
          <td><p class="lbl">Total Amount</p><p class="val" style="color:#059669;font-size:16px;">₹${orderTotal}</p></td>
        </tr>
        <tr>
          <td><p class="lbl">Payment Method</p><p class="val">${paymentMethod}</p></td>
          <td><p class="lbl">Courier</p><p class="val">${courier}</p></td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:10px;">
            <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;padding:10px 12px;">
              <p class="lbl" style="margin-bottom:4px;">Tracking ID</p>
              <p class="val" style="font-family:monospace;font-size:13px;color:#1e40af;">${trackingId}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:8px;">
            <p class="lbl">Shipping To</p>
            <p class="val">${shippingAddress?.name || name || ''}${shippingAddress?.city ? `, ${shippingAddress.city}` : ''}${shippingAddress?.state ? `, ${shippingAddress.state}` : ''}${shippingAddress?.zip ? ` – ${shippingAddress.zip}` : ''}</p>
          </td>
        </tr>
      </table>
      <center>
        <a class="track-btn" href="${STORE_BASE_URL}/track-order">🔍 Track My Order</a>
      </center>
    </div>
    <div class="card">
      <p class="card-title">🏪 Seller Details</p>
      <table class="grid" role="presentation">
        <tr>
          <td><p class="lbl">Seller</p><p class="val">${sellerName}</p></td>
          <td><p class="lbl">Support Email</p><p class="val"><a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;font-weight:700;">${SUPPORT_EMAIL}</a></p></td>
        </tr>
        <tr>
          <td colspan="2"><p class="lbl">Address</p><p class="val" style="font-size:12px;">${sellerAddress}</p></td>
        </tr>
        <tr>
          <td colspan="2"><p class="lbl">Return Address</p><p class="val" style="font-size:12px;">${returnAddress}</p></td>
        </tr>
      </table>
    </div>
    <div class="card">
      <p class="card-title">🔥 Fast-Selling Products</p>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Customers are loving these picks right now!</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${productRows.join('')}
      </table>
    </div>
  </div>
  <div class="footer">
    <p style="margin:0 0 4px;">Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a></p>
    <p style="margin:0;color:#94a3b8;">© ${new Date().getFullYear()} QuickFynd. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

// Send order status update email (generic dispatcher)
export async function sendOrderStatusEmail(order, status) {
  const { guestEmail, guestName, userId, shippingAddress, trackingId, trackingUrl, courier } = order;
  let email = guestEmail;
  let name = guestName;
  if (!email && order.email) email = order.email;
  if (!name && order.name) name = order.name;
  if (!email && shippingAddress?.email) email = shippingAddress.email;
  if (!name && shippingAddress?.name) name = shippingAddress.name;
  if (!email && order.userId && order.userId.email) email = order.userId.email;
  if (!name && order.userId && order.userId.name) name = order.userId.name;
  if (!name && order.guestName) name = order.guestName;
  if (!email) return;
  switch (status) {
    case 'ORDER_PLACED':
      return sendOrderConfirmationEmail({
        email,
        name,
        orderId: order._id,
        shortOrderNumber: order.shortOrderNumber,
        total: order.total,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod
      });
    case 'CONFIRMED':
      return sendOrderConfirmedEmail({ email, name, order });
    case 'PROCESSING':
      return sendOrderProcessingEmail({ email, name, order });
    case 'PICKUP_REQUESTED':
      return sendOrderPickupRequestedEmail({ email, name, order });
    case 'WAITING_FOR_PICKUP':
      return sendOrderWaitingForPickupEmail({ email, name, order });
    case 'PICKED_UP':
      return sendOrderPickedUpEmail({ email, name, order });
    case 'WAREHOUSE_RECEIVED':
      return sendOrderWarehouseReceivedEmail({ email, name, order });
    case 'SHIPPED':
      return sendOrderShippedEmail({
        email,
        name,
        orderId: order._id,
        shortOrderNumber: order.shortOrderNumber,
        trackingId,
        trackingUrl,
        courier
      });
    case 'OUT_FOR_DELIVERY':
      return sendOrderOutForDeliveryEmail({ email, name, order });
    case 'DELIVERED':
      return sendOrderDeliveredEmail({ email, name, order });
    case 'RETURN_REQUESTED':
      return sendOrderReturnRequestedEmail({ email, name, order });
    case 'RETURNED':
      return sendOrderReturnedEmail({ email, name, order });
    case 'CANCELLED':
      return sendOrderCancelledEmail({ email, name, order });
    default:
      return sendOrderCustomStatusEmail({ email, name, order, status });
  }

// --- Custom templates for new statuses (moved to bottom for hoisting) ---

async function sendOrderWaitingForPickupEmail({ email, name, order }) {
  const subject = `Waiting for Pickup – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '⏳ Waiting for Pickup',
    heroSubtitle: 'Your order is ready and waiting for pickup by our delivery partner.',
    heroGradient: 'linear-gradient(145deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)',
    statusLabel: 'Waiting for Pickup',
  });
  return sendMail({ to: email, subject, html });
}

async function sendOrderOutForDeliveryEmail({ email, name, order }) {
  const subject = `Out for Delivery – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '🚚 Out for Delivery',
    heroSubtitle: 'Your order is out for delivery and will reach you soon.',
    heroGradient: 'linear-gradient(145deg, #0d9488 0%, #14b8a6 60%, #2dd4bf 100%)',
    statusLabel: 'Out for Delivery',
  });
  return sendMail({ to: email, subject, html });
}

async function sendOrderReturnRequestedEmail({ email, name, order }) {
  const subject = `Return Requested – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '↩️ Return Requested',
    heroSubtitle: 'Your return request has been received. We will process it soon.',
    heroGradient: 'linear-gradient(145deg, #be185d 0%, #ec4899 60%, #f472b6 100%)',
    statusLabel: 'Return Requested',
  });
  return sendMail({ to: email, subject, html });
}
}

// Custom template: Confirmed
export async function sendOrderConfirmedEmail({ email, name, order }) {
  const subject = `Order Confirmed – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '✅ Order Confirmed',
    heroSubtitle: 'Your order is confirmed and will be processed soon.',
    heroGradient: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
    statusLabel: 'Confirmed',
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Pickup Requested
export async function sendOrderPickupRequestedEmail({ email, name, order }) {
  const subject = `Pickup Requested – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '🚚 Pickup Requested',
    heroSubtitle: 'Your order is ready — our delivery partner will pick it up shortly.',
    heroGradient: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
    statusLabel: 'Pickup Requested',
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Picked Up
export async function sendOrderPickedUpEmail({ email, name, order }) {
  const subject = `Order Picked Up – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '📦 Order Picked Up',
    heroSubtitle: 'Your order has been picked up and is on its way to the shipping hub.',
    heroGradient: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 50%, #6d28d9 100%)',
    statusLabel: 'Picked Up',
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Warehouse Received
export async function sendOrderWarehouseReceivedEmail({ email, name, order }) {
  const subject = `Order Received at Warehouse – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '🏢 Order at Warehouse',
    heroSubtitle: 'Your order has arrived at our warehouse and will be shipped soon.',
    heroGradient: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)',
    statusLabel: 'Warehouse Received',
  });
  return sendMail({ to: email, subject, html });
}

// Fallback for unknown/custom statuses
export async function sendOrderCustomStatusEmail({ email, name, order, status }) {
  const normalizedStatus = String(status || '').toUpperCase();
  const prettyStatus = normalizedStatus
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

  const subject = `Order Update: ${prettyStatus} – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: `Order Update`,
    heroSubtitle: `Your order status has moved to ${prettyStatus}.`,
    heroGradient: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 45%, #7c3aed 100%)',
    statusLabel: prettyStatus,
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Processing
export async function sendOrderProcessingEmail({ email, name, order }) {
  const subject = `Order Processing – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '🛠️ Order Processing',
    heroSubtitle: 'Your order is being prepared for shipment.',
    heroGradient: 'linear-gradient(145deg, #0369a1 0%, #0284c7 55%, #38bdf8 100%)',
    statusLabel: 'Processing',
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Delivered
export async function sendOrderDeliveredEmail({ email, name, order }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://quickfynd.com';
  const orderId = order?._id?.toString?.() || '';
  const reviewLink = `${appUrl}/dashboard/orders?reviewOrder=${encodeURIComponent(orderId)}`;
  const subject = `Order Delivered – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '🎉 Order Delivered!',
    heroSubtitle: 'Your order has been delivered. We hope you enjoy your purchase!',
    heroGradient: 'linear-gradient(145deg, #065f46 0%, #059669 55%, #34d399 100%)',
    statusLabel: 'Delivered',
    extraHtml: `<div style="background:#fff;border:1px solid #dbe7ff;border-radius:12px;padding:16px;margin-bottom:14px;text-align:center;">
      <p style="margin:0 0 10px;font-size:14px;color:#334155;">Loved your purchase? Leave us a quick review!</p>
      <a href="${reviewLink}" style="display:inline-block;padding:11px 22px;border-radius:10px;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;font-size:13px;">⭐ Rate Your Delivery</a>
    </div>`,
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Cancelled
export async function sendOrderCancelledEmail({ email, name, order }) {
  const subject = `Order Cancelled – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '❌ Order Cancelled',
    heroSubtitle: 'Your order has been cancelled. If you have questions, please contact support.',
    heroGradient: 'linear-gradient(145deg, #991b1b 0%, #dc2626 55%, #f87171 100%)',
    statusLabel: 'Cancelled',
  });
  return sendMail({ to: email, subject, html });
}

// Custom template: Returned
export async function sendOrderReturnedEmail({ email, name, order }) {
  const subject = `Order Returned – ${getDisplayOrderNumber(order)}`;
  const html = await buildOrderStatusHtml({
    name, order,
    heroTitle: '↩️ Order Returned',
    heroSubtitle: 'Your return has been processed. Refunds (if any) will be issued soon.',
    heroGradient: 'linear-gradient(145deg, #7c3aed 0%, #8b5cf6 55%, #a78bfa 100%)',
    statusLabel: 'Returned',
  });
  return sendMail({ to: email, subject, html });
}
// lib/email.js

import { Resend } from 'resend';
import mailjet from 'node-mailjet';
import nodemailer from 'nodemailer';
import { getDisplayOrderNumber, getDisplayOrderNumberFromParts } from '@/lib/orderNumber';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const mailjetClient = (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY)
  ? mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY)
  : null;

const smtpTransporter = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/**
 * Send email using either Resend or Mailjet, depending on available credentials.
 * @param {Object} param0
 * @param {string} param0.to
 * @param {string} param0.subject
 * @param {string} param0.html
 * @param {Array} param0.tags - Optional tags for email categorization
 * @param {Object} param0.headers - Optional custom headers
 */
export async function sendMail({ to, subject, html, tags, headers, fromType = 'transactional' }) {
  const resolvedFrom = (() => {
    if (fromType === 'marketing') {
      return process.env.EMAIL_FROM_MARKETING || process.env.EMAIL_FROM || process.env.SMTP_USER || 'onboarding@resend.dev';
    }
    return process.env.EMAIL_FROM_TRANSACTIONAL || process.env.EMAIL_FROM || process.env.SMTP_USER || 'onboarding@resend.dev';
  })();

  const errors = [];

  // Try Resend first
  if (resend) {
    try {
      const emailPayload = {
        from: resolvedFrom,
        to: [to],
        subject,
        html,
      };

      if (tags && tags.length > 0) {
        emailPayload.tags = tags;
      }
      if (headers && Object.keys(headers).length > 0) {
        emailPayload.headers = headers;
      }

      const { data, error } = await resend.emails.send(emailPayload);
      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Failed to send email (Resend):', error);
      errors.push(`Resend: ${error?.message || String(error)}`);
    }
  }

  // Fallback to Mailjet
  if (mailjetClient) {
    try {
      const fromEmail = resolvedFrom;
      const fromName = process.env.EMAIL_FROM_NAME || 'QuickFynd';
      const result = await mailjetClient
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: fromEmail,
                Name: fromName,
              },
              To: [
                {
                  Email: to,
                },
              ],
              Subject: subject,
              HTMLPart: html,
            },
          ],
        });
      return result.body;
    } catch (error) {
      console.error('Failed to send email (Mailjet):', error);
      errors.push(`Mailjet: ${error?.message || String(error)}`);
    }
  }

  // Fallback to SMTP
  if (smtpTransporter) {
    try {
      const fromEmail = resolvedFrom || process.env.SMTP_USER;
      const info = await smtpTransporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });
      return info;
    } catch (error) {
      console.error('Failed to send email (SMTP):', error);
      errors.push(`SMTP: ${error?.message || String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`All email providers failed. ${errors.join(' | ')}`);
  }

  throw new Error('No email provider configured. Please set RESEND_API_KEY, MAILJET_API_KEY/MAILJET_SECRET_KEY, or SMTP credentials.');
}

// Send welcome email when customer creates account
export async function sendWelcomeEmail(email, name) {
  const subject = 'Welcome to QuickFynd! 🎉';
  const shopUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://quickfynd.com';
  const fastSellingProducts = [
    { name: 'Kitchen Essentials Combo', price: 'From ₹299', link: `${STORE_BASE_URL}/collections/best-sellers` },
    { name: 'Home Utility Must-Haves', price: 'From ₹199', link: `${STORE_BASE_URL}/collections/all` },
    { name: 'Travel & Tiffin Picks', price: 'From ₹249', link: `${STORE_BASE_URL}/collections/best-sellers` },
    { name: 'Daily Use Smart Finds', price: 'From ₹149', link: `${STORE_BASE_URL}/collections/all` }
  ];
  const productRows = [];
  for (let i = 0; i < fastSellingProducts.length; i += 2) {
    const l = fastSellingProducts[i]; const r = fastSellingProducts[i + 1];
    productRows.push(`<tr>
      <td style="width:50%;padding:8px;vertical-align:top;"><a href="${l.link}" style="text-decoration:none;color:#0f172a;display:block;border:1px solid #d9e4ff;border-radius:12px;background:#fff;padding:12px;"><p style="margin:0 0 6px;font-size:14px;font-weight:700;">${l.name}</p><p style="margin:0 0 6px;font-size:12px;color:#334155;">${l.price}</p><p style="margin:0;font-size:12px;color:#2563eb;font-weight:700;">Shop Now →</p></a></td>
      <td style="width:50%;padding:8px;vertical-align:top;">${r ? `<a href="${r.link}" style="text-decoration:none;color:#0f172a;display:block;border:1px solid #d9e4ff;border-radius:12px;background:#fff;padding:12px;"><p style="margin:0 0 6px;font-size:14px;font-weight:700;">${r.name}</p><p style="margin:0 0 6px;font-size:12px;color:#334155;">${r.price}</p><p style="margin:0;font-size:12px;color:#2563eb;font-weight:700;">Shop Now →</p></a>` : ''}</td>
    </tr>`);
  }

  const benefits = [
    'Fast & secure checkout',
    'Real-time order tracking',
    'Exclusive deals & offers',
    'Easy 7-day returns',
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{margin:0;padding:0;background:#eef3ff;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;}
  .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,.14);}
  .hero{background:linear-gradient(145deg,#1d4ed8 0%,#2563eb 50%,#7c3aed 100%);color:#fff;text-align:center;padding:32px 24px;}
  .hero h1{margin:12px 0 6px;font-size:30px;font-weight:800;}
  .hero p{margin:0;opacity:.96;font-size:15px;}
  .body{background:#f8fbff;padding:24px 18px;}
  .card{background:#fff;border:1px solid #dbe7ff;border-radius:12px;padding:16px;margin-bottom:14px;}
  .card-title{margin:0 0 12px;font-size:15px;color:#1e40af;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
  .benefit-row{display:flex;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:14px;}
  .benefit-row:last-child{border-bottom:none;}
  .check{display:inline-block;width:22px;height:22px;background:#10b981;border-radius:50%;text-align:center;line-height:22px;font-weight:700;font-size:12px;color:#fff;margin-right:10px;flex-shrink:0;}
  .footer{text-align:center;font-size:13px;color:#64748b;padding:20px;border-top:1px solid #e2e8f0;background:#fff;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <img src="${EMAIL_LOGO_URL}" alt="QuickFynd" style="max-width:160px;height:38px;object-fit:contain;" />
    <h1>Welcome to QuickFynd! 🎉</h1>
    <p>Your journey to amazing products starts here.</p>
  </div>
  <div class="body">
    <div class="card">
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;">Hi ${name || 'there'}! 👋</p>
      <p style="margin:0;font-size:14px;color:#334155;">Thank you for joining QuickFynd. We're thrilled to have you as part of our community!</p>
    </div>
    <div class="card">
      <p class="card-title">Here's what you can enjoy</p>
      ${benefits.map(b => `<div class="benefit-row"><span class="check">✓</span><span>${b}</span></div>`).join('')}
      <div style="text-align:center;margin-top:16px;">
        <a href="${shopUrl}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Start Shopping →</a>
      </div>
    </div>
    <div class="card">
      <p class="card-title">Fast-Selling Products</p>
      <p style="margin:0 0 10px;font-size:13px;color:#475569;">Customers are loving these picks right now.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${productRows.join('')}</table>
    </div>
  </div>
  <div class="footer">
    <p style="margin:0 0 4px;">Need help? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
    <p style="margin:0;">© ${new Date().getFullYear()} QuickFynd. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
  return sendMail({ to: email, subject, html });
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(orderData) {
  const { email, name, orderId, shortOrderNumber, total, orderItems, shippingAddress, createdAt, paymentMethod } = orderData;

  const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];

  const itemsHtml = safeOrderItems.map(item => {
    const product = item.productId || item.product || {};
    const productName = product.name || item.name || 'Product';
    const productImage = product.images?.[0] || item.image || '';
    return `
      <tr>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e6ecff; vertical-align: middle;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${productImage ? `<img src="${productImage}" alt="${productName}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">` : ''}
            <div>
              <strong>${productName}</strong><br>
              <span style="color: #64748b; font-size: 13px;">Qty: ${item.quantity}</span>
            </div>
          </div>
        </td>
        <td style="padding: 14px 12px; text-align: right; border-bottom: 1px solid #e6ecff; vertical-align: middle; white-space: nowrap;">
          <strong>₹${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</strong>
        </td>
      </tr>
    `;
  }).join('');

  const recommendationSeed = safeOrderItems
    .map((item) => {
      const product = item.productId || item.product || {};
      return {
        name: product.name || item.name || 'Trending Product',
        image: product.images?.[0] || item.image || '/placeholder.png',
        link: `${STORE_BASE_URL}/collections/all`
      };
    })
    .slice(0, 4);

  const recommendedProducts = recommendationSeed.length > 0
    ? recommendationSeed
    : [
        { name: 'Top Rated Picks', image: '/placeholder.png', link: `${STORE_BASE_URL}/collections/all` },
        { name: 'New Arrivals', image: '/placeholder.png', link: `${STORE_BASE_URL}/collections/all` },
        { name: 'Best Value Deals', image: '/placeholder.png', link: `${STORE_BASE_URL}/collections/all` },
        { name: 'Everyday Essentials', image: '/placeholder.png', link: `${STORE_BASE_URL}/collections/all` }
      ];

  const recommendationRows = [];
  for (let i = 0; i < recommendedProducts.length; i += 2) {
    const left = recommendedProducts[i];
    const right = recommendedProducts[i + 1];
    recommendationRows.push(`
      <tr>
        <td style="width:50%; padding:8px; vertical-align:top;">
          <a href="${left.link}" style="text-decoration:none; color:#0f172a;">
            <div style="border:1px solid #dbe7ff; border-radius:12px; overflow:hidden; background:#ffffff;">
              <img src="${left.image}" alt="${left.name}" style="display:block; width:100%; height:140px; object-fit:cover; background:#f8fafc;">
              <div style="padding:10px 10px 12px 10px;">
                <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; line-height:1.4; min-height:36px;">${left.name}</p>
                <span style="display:inline-block; font-size:12px; color:#2563eb; font-weight:700;">View Product</span>
              </div>
            </div>
          </a>
        </td>
        <td style="width:50%; padding:8px; vertical-align:top;">
          ${right ? `
          <a href="${right.link}" style="text-decoration:none; color:#0f172a;">
            <div style="border:1px solid #dbe7ff; border-radius:12px; overflow:hidden; background:#ffffff;">
              <img src="${right.image}" alt="${right.name}" style="display:block; width:100%; height:140px; object-fit:cover; background:#f8fafc;">
              <div style="padding:10px 10px 12px 10px;">
                <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; line-height:1.4; min-height:36px;">${right.name}</p>
                <span style="display:inline-block; font-size:12px; color:#2563eb; font-weight:700;">View Product</span>
              </div>
            </div>
          </a>
          ` : ''}
        </td>
      </tr>
    `);
  }

  // Use same order number everywhere (dashboard, success page, emails)
  const displayOrderNumber = getDisplayOrderNumberFromParts(shortOrderNumber, orderId);

  const subject = `Order Confirmation - ${displayOrderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #eef3ff; margin: 0; padding: 0; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(37,99,235,0.12); }
        .header {
          background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 55%, #3b82f6 100%);
          color: white;
          padding: 30px 24px 22px 24px;
          text-align: center;
        }
        .header-logo {
          max-width: 170px;
          height: 40px;
          object-fit: contain;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0 0 6px 0;
          font-size: 32px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.95;
        }
        .content { background: #f8fbff; padding: 26px 20px; }
        .card { background: #ffffff; border: 1px solid #dbe7ff; border-radius: 12px; padding: 16px; }
        .meta-card { margin: 14px 0 18px 0; text-align: center; }
        .items-table { width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; margin: 12px 0 16px 0; border: 1px solid #dbe7ff; }
        .section-title { margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #1e3a8a; }
        .total-box { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 16px; border-radius: 12px; margin: 14px 0; text-align: right; font-size: 22px; font-weight: 700; }
        .payment-box { margin-top: 12px; text-align: center; font-size: 18px; font-weight: 700; }
        .button { display: inline-block; background: #1d4ed8; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 10px; margin: 12px 0 6px 0; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
        .footer { text-align: center; padding: 22px; color: #64748b; font-size: 13px; background: #ffffff; border-top: 1px solid #e2e8f0; }
        @media (max-width: 600px) {
          .container { border-radius: 0; }
          .header h1 { font-size: 26px; }
          .content { padding: 18px 12px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${EMAIL_LOGO_URL}" alt="QuickFynd Logo" class="header-logo" />
          <h1>✅ Order Confirmed!</h1>
          <p>Thank you for shopping with QuickFynd</p>
        </div>
        <div class="content">
          <h2 style="margin:0 0 6px 0; font-size: 24px;">Hi ${name || 'there'}!</h2>
          <p style="margin:0 0 14px 0; color:#475569;">Your order has been successfully placed and is now being prepared.</p>

          <div class="card meta-card">
            <strong style="font-size: 22px;">Order No: ${displayOrderNumber}</strong><br>
            <span style="color: #64748b; font-size: 13px;">Placed on ${new Date(createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
          </div>

          <h3 class="section-title">Order Items</h3>
          <table class="items-table" cellpadding="0" cellspacing="0">
            ${itemsHtml}
          </table>

          <div class="total-box">
            Total Amount: ₹${(total || 0).toFixed(2)}
          </div>

          <div class="card payment-box">
            <strong>Payment Method:</strong> ${paymentMethod ? paymentMethod : 'N/A'}
          </div>

          ${shippingAddress ? `
          <div class="card" style="margin-top: 12px;">
            <h3 class="section-title" style="margin-top:0;">Shipping Address</h3>
            <p style="margin:0;">
              <strong>${shippingAddress.name || name}</strong><br>
              ${shippingAddress.street || ''}<br>
              ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.zip || ''}<br>
              ${shippingAddress.country || ''}<br>
              ${shippingAddress.phone ? `Phone: ${(shippingAddress.phoneCode || '+91')} ${shippingAddress.phone}` : ''}
              ${shippingAddress.alternatePhone ? `<br>Alternate: ${(shippingAddress.alternatePhoneCode || shippingAddress.phoneCode || '+91')} ${shippingAddress.alternatePhone}` : ''}
            </p>
          </div>
          ` : ''}

          <center>
            <a href="${STORE_BASE_URL}/track-order" class="button">Track Order</a>
          </center>

          <div class="card" style="margin-top: 12px;">
            <h3 class="section-title" style="margin-bottom: 6px;">You May Also Like</h3>
            <p style="margin:0 0 8px 0; font-size:13px; color:#64748b;">Hand-picked picks from QuickFynd just for you.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${recommendationRows.join('')}
            </table>
          </div>

          <p style="margin: 14px 0 0 0; color:#475569; font-size:14px;">We'll send another update when your order ships. For any help, email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} QuickFynd. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendMail({ to: email, subject, html });
}

// Send order shipped email
export async function sendOrderShippedEmail(orderData) {
  const { email, name, orderId, shortOrderNumber, trackingId, trackingUrl, courier } = orderData;
  const displayOrderNumber = getDisplayOrderNumberFromParts(shortOrderNumber, orderId);
  const subject = `Order Shipped – ${displayOrderNumber}`;

  // Build a synthetic order object so buildOrderStatusHtml can use it
  const syntheticOrder = { _id: orderId, shortOrderNumber, trackingId, courier };

  const trackingExtra = (trackingUrl)
    ? `<div style="background:#fff;border:1px solid #dbe7ff;border-radius:12px;padding:16px;margin-bottom:14px;text-align:center;">
        <p style="margin:0 0 10px;font-size:14px;color:#334155;">Your parcel is on its way — click below to track in real time.</p>
        <a href="${trackingUrl}" style="display:inline-block;padding:11px 22px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">Track Shipment</a>
       </div>`
    : '';

  const html = await buildOrderStatusHtml({
    name, order: syntheticOrder,
    heroTitle: '🚚 Your Order is On the Way!',
    heroSubtitle: 'Great news — your order has been shipped!',
    heroGradient: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
    statusLabel: 'Shipped',
    extraHtml: trackingExtra,
  });
  return sendMail({ to: email, subject, html });
}

// Sends a guest account creation invitation email
export async function sendGuestAccountCreationEmail(guestData) {
  const { email, name, orderId, shortOrderNumber } = guestData;
  const displayOrderNumber = getDisplayOrderNumberFromParts(shortOrderNumber, orderId);
  const subject = `Complete Your Account – Order ${displayOrderNumber}`;
  const signInUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://quickfynd.com'}/sign-in`;

  const benefits = [
    '<strong>Track your order</strong> in real-time',
    '<strong>View all your orders</strong> in one place',
    '<strong>Save addresses</strong> for faster checkout',
    '<strong>Get exclusive offers</strong> and rewards',
    '<strong>Earn reward points</strong> on every purchase',
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{margin:0;padding:0;background:#eef3ff;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;}
  .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,.14);}
  .hero{background:linear-gradient(145deg,#d97706 0%,#f59e0b 55%,#fbbf24 100%);color:#fff;text-align:center;padding:30px 24px;}
  .hero h1{margin:12px 0 6px;font-size:28px;font-weight:800;}
  .hero p{margin:0;opacity:.96;font-size:15px;}
  .body{background:#f8fbff;padding:24px 18px;}
  .card{background:#fff;border:1px solid #dbe7ff;border-radius:12px;padding:16px;margin-bottom:14px;}
  .card-title{margin:0 0 12px;font-size:15px;color:#1e40af;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
  .benefit-row{display:flex;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:14px;}
  .benefit-row:last-child{border-bottom:none;}
  .check{display:inline-block;width:22px;height:22px;background:#f59e0b;border-radius:50%;text-align:center;line-height:22px;font-weight:700;font-size:12px;color:#fff;margin-right:10px;flex-shrink:0;}
  .footer{text-align:center;font-size:13px;color:#64748b;padding:20px;border-top:1px solid #e2e8f0;background:#fff;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <img src="${EMAIL_LOGO_URL}" alt="QuickFynd" style="max-width:160px;height:38px;object-fit:contain;" />
    <h1>🎉 Order Confirmed!</h1>
    <p>Order #${displayOrderNumber} — now unlock your full account</p>
  </div>
  <div class="body">
    <div class="card">
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;">Hi ${name || 'Guest'}!</p>
      <p style="margin:0;font-size:14px;color:#334155;">Your order was placed as a guest. Create your free account to unlock the full QuickFynd experience.</p>
    </div>
    <div class="card">
      <p class="card-title">Why create an account?</p>
      ${benefits.map(b => `<div class="benefit-row"><span class="check">✓</span><span>${b}</span></div>`).join('')}
      <div style="text-align:center;margin-top:16px;">
        <a href="${signInUrl}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;font-size:14px;">Create Account or Sign In →</a>
      </div>
    </div>
    <div class="card" style="background:#fffbeb;border-color:#fde68a;">
      <p style="margin:0;font-size:14px;color:#78350f;"><strong>Already have an account?</strong><br>Sign in with <strong>${email}</strong> and this order will appear in your dashboard automatically.</p>
    </div>
  </div>
  <div class="footer">
    <p style="margin:0 0 4px;">Need help? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
    <p style="margin:0;">© ${new Date().getFullYear()} QuickFynd. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
  return sendMail({ to: email, subject, html });
}

// Sends a password setup email to the user (basic implementation)
export async function sendPasswordSetupEmail(email, name) {
  const subject = 'Set up your password';
  const html = `<p>Hi ${name || ''},</p><p>Please click the link below to set your password for your new account.</p>`;
  return sendMail({ to: email, subject, html });
}

