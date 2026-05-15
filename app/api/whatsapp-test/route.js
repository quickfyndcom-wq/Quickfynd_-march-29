import { NextResponse } from "next/server";
import {
    sendWhatsAppMessage,
    sendOrderShipped,
    sendOrderDelivered,
} from '@/lib/whatsapp-webhook';

/**
 * Test WhatsApp webhook integration
 * POST /api/whatsapp-test
 * Body: { phoneNumber: "9876543210", country: "IN", testType: "simple" }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { phoneNumber, country = 'IN', testType = 'simple' } = body;

        console.log('[WhatsApp Test] Request received:', { phoneNumber, country, testType });
        console.log('[WhatsApp Test] Env vars loaded:', {
            WEBHOOK_URL: process.env.WHATSPORTAL_WEBHOOK_URL ? '✓ Present' : '✗ Missing',
            WEBHOOK_TOKEN: process.env.WHATSPORTAL_WEBHOOK_TOKEN ? '✓ Present' : '✗ Missing',
        });

        if (!phoneNumber) {
            return NextResponse.json({
                success: false,
                error: 'Phone number required',
                envCheck: {
                    WEBHOOK_URL: process.env.WHATSPORTAL_WEBHOOK_URL || 'NOT SET',
                    WEBHOOK_TOKEN: process.env.WHATSPORTAL_WEBHOOK_TOKEN || 'NOT SET',
                }
            }, { status: 400 });
        }

        let result;

        if (testType === 'simple') {
            const message = `🧪 Test message from Quickfynd WhatsApp integration. Time: ${new Date().toISOString()}`;
            result = await sendWhatsAppMessage(phoneNumber, message, country, { test: true });
        } else if (testType === 'order-shipped') {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                orderNumber: '12345',
                total: 5000,
                status: 'SHIPPED',
                trackingId: 'TRACK123456',
                courier: 'Delhivery',
                phoneNumber: phoneNumber,
                country: country,
                customerName: 'Test Customer'
            };
            result = await sendOrderShipped(mockOrder);
        } else if (testType === 'order-delivered') {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                orderNumber: '12345',
                total: 5000,
                status: 'DELIVERED',
                phoneNumber: phoneNumber,
                country: country,
                customerName: 'Test Customer'
            };
            result = await sendOrderDelivered(mockOrder);
        }

        console.log('[WhatsApp Test] Result:', result);

        return NextResponse.json({
            success: result?.success,
            result: result,
            debug: {
                phoneNumber,
                country,
                testType,
                timestamp: new Date().toISOString(),
                envCheck: {
                    WEBHOOK_URL: process.env.WHATSPORTAL_WEBHOOK_URL ? '✓ Loaded' : '✗ Missing',
                    WEBHOOK_TOKEN: process.env.WHATSPORTAL_WEBHOOK_TOKEN ? '✓ Loaded' : '✗ Missing',
                }
            }
        });
    } catch (error) {
        console.error('[WhatsApp Test] Error:', error.message, error.stack);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            envVars: {
                WEBHOOK_URL: process.env.WHATSPORTAL_WEBHOOK_URL || 'NOT SET',
                WEBHOOK_TOKEN: process.env.WHATSPORTAL_WEBHOOK_TOKEN || 'NOT SET',
            }
        }, { status: 500 });
    }
}

/**
 * GET - show test UI
 */
export async function GET() {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Test</title>
            <style>
                body { font-family: Arial; max-width: 600px; margin: 50px auto; }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, select { width: 100%; padding: 8px; box-sizing: border-box; }
                button { background: #25D366; color: white; padding: 10px 20px; border: none; cursor: pointer; font-size: 16px; }
                .result { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; white-space: pre-wrap; }
                .success { background: #d4edda; }
                .error { background: #f8d7da; }
            </style>
        </head>
        <body>
            <h1>WhatsApp Webhook Test</h1>
            <form id="testForm">
                <div class="form-group">
                    <label>Phone Number (10 digits):</label>
                    <input type="text" id="phone" placeholder="9876543210" required>
                </div>
                <div class="form-group">
                    <label>Country Code:</label>
                    <select id="country">
                        <option value="IN">India (IN)</option>
                        <option value="US">USA (US)</option>
                        <option value="GB">UK (GB)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="SG">Singapore (SG)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Test Type:</label>
                    <select id="testType">
                        <option value="simple">Simple Message</option>
                        <option value="order-shipped">Order Shipped</option>
                        <option value="order-delivered">Order Delivered</option>
                    </select>
                </div>
                <button type="submit">Send Test Message</button>
            </form>
            <div id="result"></div>

            <script>
                document.getElementById('testForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const phone = document.getElementById('phone').value;
                    const country = document.getElementById('country').value;
                    const testType = document.getElementById('testType').value;

                    const response = await fetch('/api/whatsapp-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber: phone, country, testType })
                    });

                    const data = await response.json();
                    const resultDiv = document.getElementById('result');
                    resultDiv.className = data.success ? 'result success' : 'result error';
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                });
            </script>
        </body>
        </html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
