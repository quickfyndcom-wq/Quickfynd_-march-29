/**
 * WhatsApp Webhook Integration via WhatsPortal
 * Sends order notifications to customers via WhatsApp
 */

const WEBHOOK_URL = process.env.WHATSPORTAL_WEBHOOK_URL || 'https://www.whatsportal.io/api/webhooks/incoming/DnOZFUvcJCBYpupXqJEt';
const WEBHOOK_TOKEN = process.env.WHATSPORTAL_WEBHOOK_TOKEN || '63f8ce8a717ba23a2a1ceb63584fa2bffa811cc3669f8e58a0bd386d54c36e0a';

/**
 * Format phone number to include country code
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone with country code
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    
    // If doesn't start with country code, assume India (+91)
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    
    if (!cleaned.startsWith('91') && cleaned.length > 10) {
        // Already has country code or too long, use as-is
    } else if (cleaned.length === 12) {
        // Good
    }
    
    return '+' + cleaned;
}

/**
 * Send WhatsApp message via WhatsPortal webhook
 * @param {string} phoneNumber - Customer phone number (with country code, e.g., +919876543210)
 * @param {string} message - Message text to send
 * @param {object} metadata - Optional metadata (orderId, etc.)
 */
export async function sendWhatsAppMessage(phoneNumber, message, metadata = {}) {
    if (!phoneNumber || !message) {
        console.warn('[WhatsApp] Missing phone or message');
        return { success: false, error: 'Missing phone or message' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
        console.warn('[WhatsApp] Invalid phone number:', phoneNumber);
        return { success: false, error: 'Invalid phone number' };
    }

    try {
        const payload = {
            phoneNumber: formattedPhone,
            message,
            metadata,
            timestamp: new Date().toISOString(),
        };

        console.log('[WhatsApp] Sending message to:', formattedPhone, 'Message length:', message.length);

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
    if (!phone) return;

    const message = `Hi ${order.customerName || 'there'}! 🎉\n\nYour order #${order.orderNumber} has been confirmed.\n\nTotal: ₹${order.total}\n\nTrack your order: [link]\n\nThank you for shopping with Quickfynd!`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'ORDER_CONFIRMATION' });
}

/**
 * Send order shipped notification
 */
export async function sendOrderShipped(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    if (!phone) return;

    const trackingId = order.trackingId || order.awb || order.airwayBillNo || 'N/A';
    const message = `📦 Your order #${order.orderNumber} is on the way!\n\nTracking: ${trackingId}\nCourier: ${order.courier || 'Standard'}\n\nView tracking: [link]\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'ORDER_SHIPPED', trackingId });
}

/**
 * Send delivery notification
 */
export async function sendOrderDelivered(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    if (!phone) return;

    const message = `✅ Your order #${order.orderNumber} has been delivered!\n\nRate your delivery experience: [link]\n\nThank you for shopping with Quickfynd! 🛍️`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'ORDER_DELIVERED' });
}

/**
 * Send payment notification
 */
export async function sendPaymentNotification(order) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    if (!phone) return;

    const message = `💳 Payment Received!\n\nOrder #${order.orderNumber}\nAmount: ₹${order.total}\n\nYour order will be processed shortly.\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'PAYMENT_RECEIVED' });
}

/**
 * Send return/refund notification
 */
export async function sendReturnNotification(order, reason) {
    const phone = order.phoneNumber || order.shippingAddress?.phoneNumber;
    if (!phone) return;

    const message = `🔄 Return Initiated\n\nOrder #${order.orderNumber}\nReason: ${reason}\n\nWe'll pick up the item soon. Track status: [link]\n\nThank you!`;

    return sendWhatsAppMessage(phone, message, { orderId: order._id, type: 'RETURN_INITIATED', reason });
}
