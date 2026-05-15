/**
 * WhatsApp Webhook Integration via WhatsPortal
 * Sends order notifications to customers via WhatsApp
 * Supports multiple countries with auto phone formatting
 */

const WEBHOOK_URL = process.env.WHATSPORTAL_WEBHOOK_URL || 'https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt';
const WEBHOOK_TOKEN = process.env.WHATSPORTAL_WEBHOOK_TOKEN || '63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a';

/**
 * Country code mapping for WhatsApp
 */
const COUNTRY_CODES = {
    'IN': '91',     // India
    'US': '1',      // United States
    'GB': '44',     // United Kingdom
    'AU': '61',     // Australia
    'CA': '1',      // Canada
    'SG': '65',     // Singapore
    'MY': '60',     // Malaysia
    'PK': '92',     // Pakistan
    'BD': '880',    // Bangladesh
    'AE': '971',    // UAE
    'SA': '966',    // Saudi Arabia
    'AF': '93',     // Afghanistan
    'NP': '977',    // Nepal
    'LK': '94',     // Sri Lanka
    'TH': '66',     // Thailand
    'VN': '84',     // Vietnam
    'PH': '63',     // Philippines
    'ID': '62',     // Indonesia
    'KH': '855',    // Cambodia
    'MM': '95',     // Myanmar
};

/**
 * Phone length mappings by country (approximate)
 */
const PHONE_LENGTHS = {
    '91': 10,   // India
    '1': 10,    // US/Canada
    '44': 10,   // UK
    '61': 9,    // Australia
    '65': 8,    // Singapore
    '60': 9,    // Malaysia
    '92': 10,   // Pakistan
    '880': 10,  // Bangladesh
    '971': 9,   // UAE
    '966': 9,   // Saudi Arabia
    '93': 9,    // Afghanistan
    '977': 10,  // Nepal
    '94': 9,    // Sri Lanka
    '66': 9,    // Thailand
    '84': 9,    // Vietnam
    '63': 10,   // Philippines
    '62': 10,   // Indonesia
    '855': 8,   // Cambodia
    '95': 9,    // Myanmar
};

/**
 * Format phone number to include country code
 * @param {string} phone - Phone number
 * @param {string} country - Country code (e.g., 'IN', 'US', 'GB') - defaults to 'IN'
 * @returns {string|null} Formatted phone with country code or null if invalid
 */
function formatPhoneNumber(phone, country = 'IN') {
    if (!phone) return null;
    
    const phoneStr = String(phone).trim();
    
    // Already formatted with +, return as-is
    if (phoneStr.startsWith('+')) {
        return phoneStr;
    }
    
    // Remove all non-digits
    let cleaned = phoneStr.replace(/\D/g, '');
    
    // Normalize country code
    const countryUpper = String(country || 'IN').toUpperCase();
    const countryCode = COUNTRY_CODES[countryUpper] || COUNTRY_CODES['IN'];
    
    // If cleaned number already starts with country code, just format it
    if (cleaned.startsWith(countryCode)) {
        return '+' + cleaned;
    }
    
    // Remove any leading zeros or ones before adding country code
    cleaned = cleaned.replace(/^(0+|1+)/, '');
    
    // Add country code
    return '+' + countryCode + cleaned;
}

/**
 * Send WhatsApp message via WhatsPortal webhook
 * @param {string} phoneNumber - Customer phone number
 * @param {string} message - Message text to send
 * @param {string} country - Country code (e.g., 'IN', 'US', 'GB') - defaults to 'IN'
 * @param {object} metadata - Optional metadata (orderId, etc.)
 */
export async function sendWhatsAppMessage(phoneNumber, message, country = 'IN', metadata = {}) {
    if (!phoneNumber || !message) {
        console.warn('[WhatsApp] Missing phone or message');
        return { success: false, error: 'Missing phone or message' };
    }

    // Format phone number with country code
    const formattedPhone = formatPhoneNumber(phoneNumber, country);
    if (!formattedPhone) {
        console.warn('[WhatsApp] Invalid phone number:', phoneNumber, 'Country:', country);
        return { success: false, error: 'Invalid phone number' };
    }

    try {
        const countryUpper = String(country || 'IN').toUpperCase();
        const payload = {
            phoneNumber: formattedPhone,
            message,
            country: countryUpper,
            metadata,
            timestamp: new Date().toISOString(),
        };

        console.log('[WhatsApp] Sending message to:', formattedPhone, 'Country:', country, 'Message length:', message.length);

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': WEBHOOK_TOKEN,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp] Webhook error:', response.status, JSON.stringify(data, null, 2));
            console.error('[WhatsApp] Response headers:', Object.fromEntries(response.headers));
            return { success: false, error: data?.message || `Webhook failed: ${response.status}`, status: response.status, data };
        }

        console.log('[WhatsApp] Message sent successfully:', { phoneNumber: formattedPhone, messageId: data?.messageId });
        return { success: true, messageId: data?.messageId };
    } catch (error) {
        console.error('[WhatsApp] Send error:', error.message, error.stack);
        return { success: false, error: error.message, stack: error.stack };
    }
}

/**
 * Send order confirmation notification
 */
export async function sendOrderConfirmation(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    const country = order.country || order.shippingAddress?.country || 'IN';
    if (!phone) return;

    const message = `Hi ${order.customerName || 'there'}! 🎉\n\nYour order #${order.orderNumber} has been confirmed.\n\nTotal: ₹${order.total}\n\nTrack your order: [link]\n\nThank you for shopping with Quickfynd!`;

    return sendWhatsAppMessage(phone, message, country, { orderId: order._id, type: 'ORDER_CONFIRMATION' });
}

/**
 * Send order shipped notification
 */
export async function sendOrderShipped(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    const country = order.country || order.shippingAddress?.country || 'IN';
    if (!phone) return;

    const trackingId = order.trackingId || order.awb || order.airwayBillNo || 'N/A';
    const message = `📦 Your order #${order.orderNumber} is on the way!\n\nTracking: ${trackingId}\nCourier: ${order.courier || 'Standard'}\n\nView tracking: [link]\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, country, { orderId: order._id, type: 'ORDER_SHIPPED', trackingId });
}

/**
 * Send delivery notification
 */
export async function sendOrderDelivered(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    const country = order.country || order.shippingAddress?.country || 'IN';
    if (!phone) return;

    const message = `✅ Your order #${order.orderNumber} has been delivered!\n\nRate your delivery experience: [link]\n\nThank you for shopping with Quickfynd! 🛍️`;

    return sendWhatsAppMessage(phone, message, country, { orderId: order._id, type: 'ORDER_DELIVERED' });
}

/**
 * Send payment notification
 */
export async function sendPaymentNotification(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    const country = order.country || order.shippingAddress?.country || 'IN';
    if (!phone) return;

    const currencySymbol = order.currencySymbol || '₹';
    const message = `💳 Payment Received!\n\nOrder #${order.orderNumber}\nAmount: ${currencySymbol}${order.total}\n\nYour order will be processed shortly.\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, country, { orderId: order._id, type: 'PAYMENT_RECEIVED' });
}

/**
 * Send return/refund notification
 */
export async function sendReturnNotification(order, reason) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    const country = order.country || order.shippingAddress?.country || 'IN';
    if (!phone) return;

    const message = `🔄 Return Initiated\n\nOrder #${order.orderNumber}\nReason: ${reason}\n\nWe'll pick up the item soon. Track status: [link]\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'RETURN_INITIATED', reason });
}
