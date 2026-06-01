import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import { getExpectedTAT, checkPincodeServiceability, fetchNormalizedDelhiveryTracking } from "@/lib/delhivery";

// Validate API key exists
if (!process.env.GEMINI_API_KEY) {
    console.error('[Chatbot] GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
    try {
        // Check if API key is set
        if (!process.env.GEMINI_API_KEY) {
            console.error('[Chatbot] Missing GEMINI_API_KEY - cannot initialize AI');
            return NextResponse.json({ 
                error: "AI service is not configured. Please contact support." 
            }, { status: 503 });
        }

        const { message, conversationHistory, language = 'english' } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Language-specific instructions
        const languageInstructions = {
            english: "Respond in English naturally.",
            hindi: "पूरी तरह से हिंदी में जवाब दें। अंग्रेजी शब्दों का इस्तेमाल बिल्कुल न करें। सभी technical terms को भी हिंदी में लिखें (जैसे: shipping = डिलीवरी, order = ऑर्डर, product = उत्पाद, payment = भुगतान, etc.)",
            malayalam: "പൂർണ്ണമായും മലയാളത്തിൽ മറുപടി നൽകുക. ഇംഗ്ലീഷ് വാക്കുകൾ ഉപയോഗിക്കരുത്. എല്ലാ technical terms ഉം മലയാളത്തിൽ എഴുതുക (ഉദാഹരണം: shipping = ഡെലിവറി, order = ഓർഡർ, product = സാധനം, payment = പണമടയ്ക്കൽ, etc.)"
        };

        const languageInstruction = languageInstructions[language] || languageInstructions.english;

        let productsCache = [];
        let couponsCache = [];
        let liveOrderLookup = null;

        const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const toShortText = (value = '', max = 160) => {
            const text = String(value || '').replace(/\s+/g, ' ').trim();
            if (!text) return 'Description not available.';
            return text.length > max ? `${text.slice(0, max - 1)}…` : text;
        };

        const normalizeText = (input = '') => String(input || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const tokenize = (input = '') => normalizeText(input).split(' ').filter(Boolean);

        const levenshteinDistance = (a = '', b = '') => {
            const s = String(a);
            const t = String(b);
            if (s === t) return 0;
            if (!s.length) return t.length;
            if (!t.length) return s.length;

            const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
            for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
            for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;

            for (let i = 1; i <= s.length; i += 1) {
                for (let j = 1; j <= t.length; j += 1) {
                    const cost = s[i - 1] === t[j - 1] ? 0 : 1;
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + cost
                    );
                }
            }
            return dp[s.length][t.length];
        };

        const similarityRatio = (a = '', b = '') => {
            const s = normalizeText(a);
            const t = normalizeText(b);
            if (!s || !t) return 0;
            const maxLen = Math.max(s.length, t.length);
            if (maxLen === 0) return 1;
            return 1 - (levenshteinDistance(s, t) / maxLen);
        };

        const hasFuzzyKeyword = (input = '', keywords = []) => {
            const tokens = tokenize(input);
            if (tokens.length === 0) return false;

            return keywords.some((kw) => {
                const key = normalizeText(kw);
                if (!key) return false;
                if (normalizeText(input).includes(key)) return true;
                return tokens.some((token) => {
                    if (Math.abs(token.length - key.length) > 2) return false;
                    return levenshteinDistance(token, key) <= 1;
                });
            });
        };

        const scoreIntent = (input = '', keywords = [], fuzzyKeywords = []) => {
            const text = normalizeText(input);
            if (!text) return 0;

            let score = 0;
            for (const kw of keywords) {
                if (text.includes(normalizeText(kw))) score += 2;
            }
            if (hasFuzzyKeyword(input, fuzzyKeywords)) score += 1;
            return score;
        };

        const productIntentRegex = /(product|item|details|detail|spec|specs|feature|features|price|cost|mrp|buy|suggest|recommend|show|tell me about|about|compare|which one|best|phone|mobile|laptop|headphone|watch|shoe|shoes|dress|shirt|kitchen|beauty|skincare|gadget)/i;
        const orderIntentRegex = /(order|track|tracking|awb|shipment|shipped|delivery status|where is my order|order status|courier|consignment)/i;

        const productIntentScore = scoreIntent(message,
            ['product', 'details', 'price', 'spec', 'feature', 'buy', 'recommend', 'compare', 'mobile', 'laptop', 'shoe', 'beauty'],
            ['prodct', 'detials', 'prce', 'recomend', 'moblie', 'leptop']
        );

        const orderIntentScore = scoreIntent(message,
            ['order', 'track', 'tracking', 'status', 'shipment', 'courier', 'awb', 'where is my order'],
            ['tracklign', 'trakcing', 'oder', 'shippment', 'curier']
        );

        const isProductQuery = productIntentRegex.test(String(message || '')) || productIntentScore >= 2;
        const isOrderQuery = orderIntentRegex.test(String(message || '')) || orderIntentScore >= 2;

        const extractOrderIdentifier = (input = '') => {
            const text = String(input || '').trim();
            const objectIdMatch = text.match(/\b[a-fA-F0-9]{24}\b/);
            if (objectIdMatch) return objectIdMatch[0];

            const trackingLikeMatch = text.match(/\b[A-Z0-9-]{8,24}\b/i);
            if (trackingLikeMatch) return trackingLikeMatch[0];

            const shortOrderMatch = text.match(/\b\d{4,10}\b/);
            if (shortOrderMatch) return shortOrderMatch[0];

            return '';
        };

        const extractEmail = (input = '') => {
            const text = String(input || '').trim();
            const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
            return emailMatch ? emailMatch[0].toLowerCase() : '';
        };

        const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '');

        const extractPhone = (input = '') => {
            const text = String(input || '').trim();
            const candidates = text.match(/\+?\d[\d\s\-()]{6,}\d/g) || [];
            for (const candidate of candidates) {
                const digits = normalizeDigits(candidate);
                if (digits.length >= 7 && digits.length <= 15) return digits;
            }
            return '';
        };

        const extractOrderContact = (order = {}) => {
            const orderEmail = String(
                order?.guestEmail || order?.shippingAddress?.email || ''
            ).toLowerCase().trim();

            const phoneCandidates = [
                order?.guestPhone,
                order?.alternatePhone,
                order?.shippingAddress?.phone,
                order?.shippingAddress?.alternatePhone,
            ].filter(Boolean).map((p) => normalizeDigits(p));

            const uniquePhones = [...new Set(phoneCandidates.filter((p) => p.length >= 7))];
            return { orderEmail, orderPhones: uniquePhones };
        };

        const verifyOrderContact = (order = {}, email = '', phone = '') => {
            if (!email && !phone) return true;
            const { orderEmail, orderPhones } = extractOrderContact(order);

            if (email) {
                if (!orderEmail || orderEmail !== String(email).toLowerCase().trim()) {
                    return false;
                }
            }

            if (phone) {
                const normPhone = normalizeDigits(phone);
                const last10 = normPhone.slice(-10);
                const phoneMatch = orderPhones.some((p) => p === normPhone || p.endsWith(last10) || normPhone.endsWith(p.slice(-10)));
                if (!phoneMatch) return false;
            }

            return true;
        };

        const formatOrderLookupForContext = (lookup) => {
            if (!lookup?.found) {
                if (lookup?.contactMismatch) {
                    return `Order was found but contact verification failed for the provided email/phone.`;
                }
                if (lookup?.identifier) {
                    return `Order lookup attempted for identifier "${lookup.identifier}", but no order was found.`;
                }
                if (lookup?.email || lookup?.phone) {
                    return `Order lookup attempted using contact details (email/phone), but no order was found.`;
                }
                return 'No order identifier found in the current customer message.';
            }

            const order = lookup.order;
            const itemsCount = Array.isArray(order?.orderItems) ? order.orderItems.length : 0;
            return `Order found.
- Order ID: ${order?._id || 'N/A'}
- Short Order Number: ${order?.shortOrderNumber || 'N/A'}
- Status: ${order?.status || 'N/A'}
- Payment: ${order?.paymentMethod || 'N/A'} | Paid: ${order?.isPaid ? 'Yes' : 'No'}
- Total: ₹${Number(order?.total || 0)}
- Tracking ID: ${order?.trackingId || 'Not assigned yet'}
- Courier: ${order?.courier || 'N/A'}
- Tracking URL: ${order?.trackingUrl || 'N/A'}
- Matched By: ${lookup?.matchedBy || 'N/A'}
- Created At: ${order?.createdAt || 'N/A'}
- Items Count: ${itemsCount}
- Live Tracking Note: ${lookup?.liveTrackingNote || 'No live courier sync in this request.'}`;
        };

        const extractSearchTerms = (input = '') => {
            const stopWords = new Set([
                'the', 'a', 'an', 'for', 'and', 'with', 'from', 'this', 'that', 'these', 'those',
                'please', 'show', 'tell', 'about', 'want', 'need', 'give', 'me', 'you', 'can', 'i',
                'what', 'which', 'is', 'are', 'to', 'of', 'in', 'on', 'at', 'my', 'your', 'details'
            ]);

            return String(input || '')
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, ' ')
                .split(/\s+/)
                .filter(Boolean)
                .filter((word) => word.length >= 3 && !stopWords.has(word))
                .slice(0, 8);
        };

        const scoreProductMatch = (query = '', product = {}, terms = []) => {
            const q = normalizeText(query);
            const name = normalizeText(product?.name || '');
            const desc = normalizeText(product?.description || '');
            const cat = normalizeText(product?.category || '');
            if (!q || !name) return 0;

            let score = 0;

            // Exact/partial string signals
            if (name.includes(q)) score += 5;
            if (q.includes(name)) score += 3;
            if (desc.includes(q)) score += 2;
            if (cat && q.includes(cat)) score += 1.5;

            // Token overlap signals
            for (const term of terms) {
                if (name.includes(term)) score += 1.2;
                if (desc.includes(term)) score += 0.6;
                if (cat.includes(term)) score += 0.8;
            }

            // Typo tolerance signal
            const nameTokens = tokenize(name).slice(0, 8);
            const queryTokens = tokenize(q).slice(0, 8);
            for (const qt of queryTokens) {
                if (qt.length < 3) continue;
                let best = 0;
                for (const nt of nameTokens) {
                    const sim = similarityRatio(qt, nt);
                    if (sim > best) best = sim;
                }
                if (best >= 0.82) score += 0.9;
                else if (best >= 0.7) score += 0.45;
            }

            return score;
        };

        const extractedIdentifier = extractOrderIdentifier(message);
        const extractedEmail = extractEmail(message);
        const extractedPhone = extractPhone(message);
        const hasTrackingInputs = Boolean(extractedIdentifier || extractedEmail || extractedPhone);

        if (isOrderQuery && !hasTrackingInputs) {
            return NextResponse.json({
                message: `Absolutely — I can track it for you 🚚\n\nPlease fill the input with any ONE detail:\n• Order ID\n• Tracking ID / AWB\n• Registered Email\n• Registered Phone Number\n\nExample: Track my order | Email: yourname@gmail.com`,
                timestamp: new Date().toISOString(),
                requiresTrackingInput: true
            });
        }

        try {
            // Fetch products and store info for context
            await dbConnect();

            if (isOrderQuery) {
                const identifier = extractedIdentifier;
                const email = extractedEmail;
                const phone = extractedPhone;
                liveOrderLookup = { identifier, email, phone, found: false, contactMismatch: false, matchedBy: '', order: null, liveTrackingNote: '' };

                if (identifier || email || phone) {
                    let order = null;

                    if (/^[a-fA-F0-9]{24}$/.test(identifier)) {
                        order = await Order.findById(identifier)
                            .select('_id shortOrderNumber status paymentMethod paymentStatus isPaid total trackingId courier trackingUrl createdAt orderItems')
                            .lean();
                        if (order) liveOrderLookup.matchedBy = 'orderId';
                    }

                    if (!order && /^\d{4,10}$/.test(identifier)) {
                        order = await Order.findOne({ shortOrderNumber: Number(identifier) })
                            .select('_id shortOrderNumber status paymentMethod paymentStatus isPaid total trackingId courier trackingUrl createdAt orderItems')
                            .lean();
                        if (order) liveOrderLookup.matchedBy = 'shortOrderNumber';
                    }

                    if (!order && identifier) {
                        order = await Order.findOne({ trackingId: identifier })
                            .select('_id shortOrderNumber status paymentMethod paymentStatus isPaid total trackingId courier trackingUrl createdAt orderItems')
                            .lean();
                        if (order) liveOrderLookup.matchedBy = 'trackingId';
                    }

                    if (!order && (email || phone)) {
                        const contactOr = [];
                        if (email) {
                            contactOr.push({ guestEmail: new RegExp(`^${escapeRegex(email)}$`, 'i') });
                            contactOr.push({ 'shippingAddress.email': new RegExp(`^${escapeRegex(email)}$`, 'i') });
                        }
                        if (phone) {
                            const p = normalizeDigits(phone);
                            const last10 = p.slice(-10);
                            const phoneRegex = new RegExp(`${escapeRegex(last10)}$`);
                            contactOr.push({ guestPhone: phoneRegex });
                            contactOr.push({ alternatePhone: phoneRegex });
                            contactOr.push({ 'shippingAddress.phone': phoneRegex });
                            contactOr.push({ 'shippingAddress.alternatePhone': phoneRegex });
                        }

                        if (contactOr.length > 0) {
                            order = await Order.findOne({ $or: contactOr })
                                .sort({ createdAt: -1 })
                                .select('_id shortOrderNumber status paymentMethod paymentStatus isPaid total trackingId courier trackingUrl createdAt orderItems guestEmail guestPhone alternatePhone shippingAddress')
                                .lean();
                            if (order) liveOrderLookup.matchedBy = email && phone ? 'email+phone' : (email ? 'email' : 'phone');
                        }
                    }

                    if (order) {
                        const contactVerified = verifyOrderContact(order, email, phone);
                        if (!contactVerified) {
                            liveOrderLookup.contactMismatch = true;
                        } else {
                        liveOrderLookup.found = true;
                        liveOrderLookup.order = order;

                        const courier = String(order?.courier || '').toLowerCase();
                        if (order?.trackingId && (courier.includes('delhivery') || !order?.trackingUrl)) {
                            try {
                                const normalized = await fetchNormalizedDelhiveryTracking(String(order.trackingId));
                                if (normalized) {
                                    liveOrderLookup.liveTrackingNote = `Live status: ${normalized.status || 'N/A'}${normalized.expectedDate ? ` | Expected: ${normalized.expectedDate}` : ''}`;
                                }
                            } catch (trackingErr) {
                                liveOrderLookup.liveTrackingNote = 'Live tracking sync failed; showing stored order status.';
                            }
                        }
                        }
                    }
                }
            }

            const products = await Product.find({ inStock: true })
                .select('_id name slug description price mrp category inStock stockQuantity fastDelivery')
                .limit(50)
                .lean();
            productsCache = products;

            // Fetch active coupons
            const coupons = await Coupon.find({
                isActive: true,
                expiresAt: { $gte: new Date() }
            })
                .select('code discountValue discountType description minOrderValue forNewUser forMember')
                .lean();
            couponsCache = coupons;

            let matchedProducts = [];
            if (isProductQuery) {
                const terms = extractSearchTerms(message);
                const nameRegex = new RegExp(escapeRegex(String(message || '').trim()).slice(0, 80), 'i');
                const termRegexes = terms.map((term) => new RegExp(escapeRegex(term), 'i'));

                const orClauses = [
                    { name: nameRegex },
                    { description: nameRegex },
                    ...termRegexes.flatMap((rgx) => ([
                        { name: rgx },
                        { description: rgx },
                        { category: rgx }
                    ]))
                ];

                const regexMatches = await Product.find({
                    inStock: true,
                    $or: orClauses
                })
                    .select('_id name slug description price mrp category inStock stockQuantity fastDelivery')
                    .sort({ fastDelivery: -1, price: 1 })
                    .limit(20)
                    .lean();

                // Hybrid ranking algorithm: DB regex + similarity scoring
                const byId = new Map();
                for (const p of [...regexMatches, ...products]) {
                    if (p?._id) byId.set(String(p._id), p);
                }

                const ranked = [...byId.values()]
                    .map((p) => ({ product: p, score: scoreProductMatch(message, p, terms) + (p.fastDelivery ? 0.15 : 0) }))
                    .filter((x) => x.score > 0.6)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6)
                    .map((x) => x.product);

                matchedProducts = ranked;
            }

            const matchedProductsContext = matchedProducts.length > 0
                ? matchedProducts.map((p, i) => {
                    const price = Number(p.price || 0);
                    const mrp = Number(p.mrp || 0);
                    const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                    const inStockText = p.inStock === false || (typeof p.stockQuantity === 'number' && p.stockQuantity <= 0)
                        ? 'Out of stock'
                        : 'In stock';
                    return `${i + 1}. ${p.name}\n- Price: ₹${price}${mrp > price ? ` (MRP ₹${mrp}, ${discount}% off)` : ''}\n- Category: ${p.category || 'General'}\n- Availability: ${inStockText}\n- Fast Delivery: ${p.fastDelivery ? 'Yes' : 'No'}\n- Slug: ${p.slug || 'N/A'}\n- Description: ${toShortText(p.description)}`;
                }).join('\n\n')
                : 'No direct product match found for current message.';

            const orderLookupContext = formatOrderLookupForContext(liveOrderLookup);

            // Build context for AI
            const systemContext = `You're chatting for Quickfynd store. Act like a real person who works here and genuinely wants to help. Don't sound like an AI assistant - talk like you're texting a friend who asked for shopping advice.

**LANGUAGE: ${languageInstruction}**

**CRITICAL - Sound Human:**
- Talk naturally like a real support person, not like a robotic assistant.
- Be clear, polite, and easy to understand.
- Keep tone friendly but professional.
- Use conversation context and acknowledge what customer already shared.
- Ask follow-up questions only when needed to solve the issue.
- Give direct, actionable answers instead of generic text.

**DOUBT-RESOLUTION RULES (VERY IMPORTANT):**
- First understand the exact customer doubt, then answer that doubt directly.
- If customer asks a specific question, start with the direct answer in first line.
- If information is missing, ask only the minimum required detail.
- Never ignore customer concern; always give a clear next step.
- For product doubts, explain key details simply (price, availability, feature, delivery).
- For order doubts, explain current status and what the customer should do next.

**STYLE - ATTRACTIVE CHATBOT REPLIES:**
- Keep replies visually clean and easy to read.
- Use short sections, smart spacing, and relevant emojis (not overused).
- Give one clear next step at the end when user needs to act.
- Sound modern and premium, like a polished AI shopping assistant.

**PRODUCT RESPONSE RULES (VERY IMPORTANT):**
- If the customer asks about a product (casual or specific), always provide product details.
- Prefer exact matched products from "BEST PRODUCT MATCHES" section.
- For each suggested product, include: name, price, discount/MRP (if any), stock status, fast-delivery availability, and 1-line description.
- If customer message is casual like "show products" or "what do you have", show 3-5 relevant products with details.
- If no exact match exists, say that naturally and suggest closest category options from inventory.
- Keep tone friendly and assistant-like, but informative and actionable.

**ORDER TRACKING RULES (VERY IMPORTANT):**
- If customer asks about order tracking/status, use the "LIVE ORDER LOOKUP" section first.
- If live lookup has an order, provide exact order status, payment status, tracking ID, and next step.
- Accept tracking using any of: Order ID, short order number, tracking ID, registered phone number, or email.
- If user asks tracking but hasn't provided valid details, ask them to fill input with email / phone / order ID / tracking ID.
- If phone/email returns multiple possible matches, prefer the latest order and ask customer to share order ID for exact verification.
- If contact verification fails for provided email/phone, ask customer to re-check contact details.
- If identifier was provided but no order matched, clearly say not found and ask to re-check the ID.

**STORE INFORMATION:**
Store Name: QuickFynd
Description: Your one-stop online shop for everything you need - electronics, fashion, home essentials, beauty products, and more!

**SHIPPING & DELIVERY POLICY:**
- FREE shipping on orders above ₹499
- Standard delivery: 3-7 business days (most areas)
- Metro cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata): 2-4 days
- Kerala, Tamil Nadu, Karnataka, Maharashtra: 3-5 days typically
- Other states: 4-7 days usually
- Remote/rural areas: 7-10 days
- Fast delivery available on select products (⚡ marked): 2-3 days
- We deliver 7 days a week including weekends (might take 1 extra day on weekends)
- Shipping partner: Delhivery (reliable tracking available)
- Delivery address can be changed within 1 hour of placing order
- Multiple shipping addresses can be saved in account
- Real-time tracking available from order dashboard

**RETURN & REFUND POLICY:**
- 7 days return/exchange period from delivery date
- Easy return process: Go to "My Orders" → Select item → Click "Return"
- Free return pickup arranged
- Items must be unopened in original packaging
- Refunds processed within 5-7 business days after inspection
- Refund to original payment method or store wallet
- Some items like perishables, intimate wear, opened electronics may have restrictions
- Damaged/defective items: Full refund + free return shipping
- Wrong item delivered: Immediate replacement + full refund option

**PAYMENT OPTIONS:**
- Credit/Debit Cards (Visa, Mastercard, RuPay, Amex)
- UPI (Google Pay, PhonePe, Paytm, BHIM)
- Net Banking (all major banks)
- Digital Wallets (Paytm, PhonePe, Amazon Pay)
- Cash on Delivery (COD) - available for most orders
- COD limit: Up to ₹50,000 per order
- EMI options available on orders above ₹3,000
- Payment security: SSL encrypted, PCI-DSS compliant
- No extra charges on online payments
- COD: Small handling fee may apply (mentioned at checkout)

**ACCOUNT & ORDERING:**
- Can browse without account
- Account needed for: Checkout, tracking orders, wishlist
- Quick signup with email or Google
- Guest checkout available
- Password reset via email link
- Wishlist: Save unlimited items with heart icon
- Cart items saved for 30 days
- Multiple delivery addresses can be stored
- Order history and invoices available in dashboard
- Track all orders in real-time

**CANCELLATION POLICY:**
- Orders can be cancelled before shipping (usually within 2-4 hours)
- After shipping: Cannot cancel, but can return after delivery
- Cancellation: Go to "My Orders" → "Cancel Order"
- Refund for cancelled orders: 3-5 business days

**PRIVACY & SECURITY:**
- Data protected with industry-standard SSL encryption
- Payment info never stored on our servers
- Personal data not shared with third parties
- Account deletion available in Settings (data deleted in 30 days)
- Email notifications can be managed in preferences

**PRODUCT CATEGORIES:**
Available: Electronics, Fashion (Men/Women/Kids), Home & Kitchen, Beauty & Personal Care, Sports & Fitness, Books & Stationery, Toys & Games, Groceries, Health & Wellness

**CUSTOMER SUPPORT:**
- Chat support (this chatbot - available 24/7)
- Email support: via contact form
- Help Center: /help page with detailed FAQs
- Ticket system: /support page for specific issues
- Response time: Within 24 hours (usually much faster)

**CURRENT INVENTORY (${products.length} products in stock):**
${products.slice(0, 30).map(p => `${p.name} - ₹${p.price}${p.mrp > p.price ? ` (was ₹${p.mrp})` : ''} - ${p.category}${p.fastDelivery ? ' ⚡ Fast Delivery' : ''}`).join('\n')}

**BEST PRODUCT MATCHES FOR CURRENT MESSAGE:**
${matchedProductsContext}

**LIVE ORDER LOOKUP FOR CURRENT MESSAGE:**
${orderLookupContext}

**ACTIVE DISCOUNTS & COUPONS:**
${coupons.length > 0 ? coupons.slice(0, 10).map(c => 
    `${c.code}: ${c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue} off${c.minOrderValue ? ' (min order ₹' + c.minOrderValue + ')' : ''}${c.forNewUser ? ' [New Customers Only]' : ''}${c.forMember ? ' [Members Only]' : ''} - ${c.description || 'Limited time offer'}`
).join('\n') : 'No active discount codes right now, but check back soon! We frequently run sales and promotions.'}

**COMMON CUSTOMER QUESTIONS:**

Q: How do I track my order?
A: Go to "My Orders" in your account dashboard or use the tracking link in your order confirmation email. Real-time updates available.

Q: Can I change my delivery address?
A: Yes, but only within 1 hour of placing the order. After that, contact support and we'll try our best.

Q: What if my item is damaged/defective?
A: Contact us immediately! We'll arrange free return pickup and either send a replacement or process full refund within 24-48 hours.

Q: Do you charge shipping?
A: Free shipping on orders ₹499 and above. Below that, nominal shipping charges apply (shown at checkout).

Q: How do I apply a coupon?
A: During checkout, click "Apply Coupon", enter the code, and discount will be applied automatically if valid.

Q: Can I order without creating an account?
A: Yes! Guest checkout is available. But creating an account helps you track orders and save addresses for future purchases.

Q: Is COD available?
A: Yes, Cash on Delivery is available for most orders (up to ₹50,000). Small handling fee may apply.

Q: What if I want to exchange an item?
A: Initiate a return, and once we receive the item, you can place a new order for the item you want. We're working on direct exchange feature!

Q: How long do refunds take?
A: 5-7 business days after we receive and inspect the returned item. Refund goes to your original payment method.

Q: Can I cancel my order?
A: Yes, if it hasn't shipped yet (usually 2-4 hours window). Go to "My Orders" and click "Cancel".

IMPORTANT: Use ALL this information to answer customer questions accurately. If they ask about policies, delivery, returns, payments, etc. - give them specific, accurate details from above. Be helpful and informative while staying conversational and natural in ${language}.`;

            // Build conversation history for context
            const conversationContext = conversationHistory && conversationHistory.length > 0
                ? conversationHistory.map(msg => `${msg.role === 'user' ? 'Customer' : 'You'}: ${msg.content}`).join('\n')
                : '';

            const fullPrompt = conversationContext 
                ? `${systemContext}\n\n**Current Conversation:**\n${conversationContext}\n\n**Latest Customer Message:** ${message}\n\n[Respond naturally, include product details when product-related, and use live order lookup when order-related]`
                : `${systemContext}\n\nCustomer: ${message}\n\n[Respond naturally, include product details when product-related, and use live order lookup when order-related]`;

            console.log('[Chatbot] Sending request to Gemini AI...');

            // Generate AI response
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const aiMessage = response.text();

            console.log('[Chatbot] Response generated successfully');

            return NextResponse.json({
                message: aiMessage,
                timestamp: new Date().toISOString()
            });

        } catch (apiError) {
            console.error('[Chatbot] Gemini API Error:', apiError.message);
            
            // Check if it's a quota/rate limit error
            if (apiError.message?.includes('429') || apiError.message?.includes('quota') || apiError.status === 429) {
                console.log('[Chatbot] API quota exceeded, using fallback mode');
                
                // Fallback: Return helpful response without AI
                const fallbackResponses = {
                    english: {
                        'product': "absolutely! we've got everything you need! 🛍️ here's what we offer:\n\n📱 Electronics - mobiles, laptops, tablets, smartwatches, headphones, speakers, chargers, accessories\n👕 Fashion - men's, women's & kids clothing, shoes, bags, accessories, watches\n🏠 Home & Kitchen - cookware, appliances, furniture, decor, bedding, storage\n💄 Beauty & Personal Care - makeup, skincare, haircare, fragrances, grooming, wellness\n🎮 Kids & Toys - toys, games, books, educational items, school supplies\n📚 Books & Stationery - fiction, non-fiction, notebooks, pens, art supplies\n⚽ Sports & Fitness - equipment, activewear, yoga, gym accessories\n🍎 Groceries & Health - snacks, beverages, supplements, health products\n\nwhat are you looking for specifically? I can help you find it! 🔍",
                        'kids': "absolutely! we have tons of kids products - toys, games, books, stationery, kids fashion (clothes, shoes), educational items, school supplies, and more! what age group are you shopping for? 🎮📚👕",
                        'electronics': "yes! we've got all kinds of electronics! 📱💻 here's the full range:\n\n📱 Mobiles & Tablets - latest smartphones, tablets, mobile accessories\n💻 Laptops & Computers - laptops, desktops, monitors, keyboards, mouse\n🎧 Audio - headphones, earbuds, speakers, soundbars, home theater\n⌚ Wearables - smartwatches, fitness bands, smart glasses\n📷 Cameras & Photography - DSLR, mirrorless, action cameras, accessories\n🔌 Accessories - chargers, cables, power banks, cases, screen protectors\n🎮 Gaming - consoles, controllers, games, gaming accessories\n💡 Smart Home - smart lights, plugs, security cameras, home automation\n\nlooking for anything specific? what's your budget range?",
                        'fashion': "great choice! we have fashion for everyone! 👕👗👠 here's our complete collection:\n\n👔 Men's Fashion - shirts, t-shirts, jeans, pants, suits, ethnic wear, jackets, sweaters\n👗 Women's Fashion - dresses, tops, sarees, kurtis, jeans, skirts, ethnic wear, western wear\n👶 Kids Fashion - boys & girls clothing, baby wear, school uniforms, party wear\n👟 Footwear - sneakers, formal shoes, sandals, boots, sports shoes, slippers\n👜 Bags & Accessories - handbags, backpacks, wallets, belts, sunglasses\n⌚ Watches & Jewelry - analog, digital, smart watches, fashion jewelry, precious jewelry\n🎽 Activewear - gym wear, yoga clothes, running gear, sports tees\n\nwhat style are you looking for? casual, formal, ethnic, or party wear?",
                        'beauty': "absolutely! our beauty & personal care section has everything! 💄✨ here's the complete range:\n\n💄 Makeup - foundation, lipstick, mascara, eyeshadow, eyeliner, blush, concealer, makeup sets\n🌟 Skincare - cleansers, moisturizers, serums, face wash, toners, sunscreen, anti-aging, face masks\n💇 Haircare - shampoo, conditioner, hair oil, hair masks, styling products, hair colors\n💅 Nail Care - nail polish, nail art, manicure kits, nail treatments\n🌸 Fragrances - perfumes, deodorants, body mists, colognes for men & women\n🪒 Men's Grooming - beard care, shaving, aftershave, hair styling, body wash\n🧴 Bath & Body - body wash, scrubs, lotions, bath salts, body oils\n💆 Wellness - face tools, massage oils, aromatherapy, spa products\n\nwhat are you shopping for? skincare, makeup, or haircare?",
                        'home': "sure thing! we've got everything for your home! 🏠✨ here's our complete collection:\n\n🍳 Kitchen & Dining - cookware, utensils, appliances, dinnerware, cutlery, storage containers\n🛋️ Furniture - sofas, beds, tables, chairs, wardrobes, storage units, office furniture\n🎨 Home Decor - wall art, showpieces, mirrors, clocks, vases, plants, lighting\n🛏️ Bedding & Linen - bed sheets, comforters, pillows, blankets, cushions, curtains\n🧹 Cleaning & Organization - organizers, storage boxes, cleaning tools, laundry accessories\n💡 Lighting - ceiling lights, lamps, LED bulbs, decorative lights, smart lights\n🍽️ Kitchen Appliances - mixer grinders, toasters, microwaves, air fryers, electric kettles\n🌿 Garden & Outdoor - planters, garden tools, outdoor furniture, decor\n\nwhat room or category are you shopping for?",
                        'price': "happy to help with pricing! 💰 our prices are super competitive and we often have deals running!\n\n💸 we offer:\n• Best price guarantee across categories\n• Regular discounts & flash sales\n• Combo offers & bulk deals\n• Coupon codes for extra savings\n• Cashback on prepaid orders\n• EMI options on high-value purchases\n\nwhich specific product are you interested in? I can help you find the best deal! also, check out our 'Offers' section for current discounts! 🎁",
                        'shipping': "we've got you covered with fast & reliable shipping! 🚚📦\n\n✅ Free Shipping on orders above ₹499\n⏱️ Delivery Time:\n  • Metro cities: 2-4 business days\n  • Other cities: 3-7 business days\n  • Remote areas: 5-10 business days\n\n📍 Shipping Features:\n  • Real-time order tracking\n  • SMS & email updates\n  • Doorstep delivery\n  • Contactless delivery available\n  • Safe & secure packaging\n  • Multiple delivery attempts\n\n💰 Shipping Charges: Nominal fee for orders below ₹499 (shown at checkout)\n\nwhere should we deliver your order? enter your pincode at checkout to see exact delivery dates! 🎯",
                        'order': "tracking your order is super easy! 📦🔍 here's everything you need to know:\n\n✅ How to Track:\n1. Go to 'My Orders' in your dashboard\n2. See real-time status updates\n3. Get delivery estimate\n4. View tracking timeline\n5. Contact delivery partner if needed\n\n📍 Order Statuses:\n  • Order Placed - We received your order\n  • Processing - Getting it ready\n  • Shipped - On its way to you!\n  • Out for Delivery - Arriving today\n  • Delivered - Enjoy your purchase! 🎉\n\n💬 Need Help?\n  • Click on order for details\n  • Contact support via chat\n  • Call delivery partner directly\n  • Request callback if needed\n\nwhat's your order number? or do you need help with something specific about your order?",
                        'return': "returns are super easy with us! ↩️ here's the complete process:\n\n✅ Return Policy:\n  • 7 days return/exchange from delivery\n  • Free return pickup from your doorstep\n  • Full refund or exchange\n  • No questions asked policy\n\n📦 How to Return:\n1. Go to 'My Orders' section\n2. Select the item you want to return\n3. Click 'Return' button\n4. Choose reason for return\n5. We'll arrange FREE pickup\n6. Get refund in 5-7 business days\n\n💰 Refund Options:\n  • Original payment method\n  • Store credit (instant)\n  • Bank transfer\n\n🔄 Exchange:\n  • Same product (different size/color)\n  • Different product (same value)\n  • Price difference adjusted\n\n⚠️ Return Conditions:\n  • Product should be unused\n  • Original packaging required\n  • Tags & labels intact\n  • Invoice needed\n\nneed help with a return? what's the order number?",
                        'payment': "we accept all payment methods - super secure & easy! 💳✨\n\n💰 Payment Options:\n  💵 Cash on Delivery (COD) - pay when you receive\n  💳 Credit/Debit Cards - Visa, Mastercard, Amex, Rupay\n  📱 UPI - Google Pay, PhonePe, Paytm, BHIM\n  🏦 Net Banking - all major banks\n  👛 Wallets - Paytm, PhonePe, Amazon Pay, Mobikwik\n  📊 EMI - no cost EMI on orders above ₹3000\n\n🔒 Security:\n  • 256-bit SSL encryption\n  • PCI DSS compliant\n  • No card details stored\n  • OTP verification\n  • Secure payment gateway\n\n🎁 Extra Benefits:\n  • 5% cashback on prepaid orders\n  • Special wallet offers\n  • Bank discounts available\n  • Reward points on purchase\n\nwhich payment method do you prefer? any questions about the payment process?",
                        'coupon': "we love giving discounts! 🎁💰 here's how to save more:\n\n✨ Active Offers:\n  • First order discount\n  • Category-specific coupons\n  • Combo deal discounts\n  • Seasonal sale codes\n  • Bank offer codes\n  • Wallet cashback codes\n\n🎯 How to Use Coupons:\n1. Browse 'Offers' section for active codes\n2. Add items to cart\n3. Go to checkout\n4. Enter coupon code\n5. Click 'Apply'\n6. See instant discount! 💥\n\n💡 Pro Tips:\n  • Stack coupons with sale prices\n  • Check category-specific offers\n  • Subscribe for exclusive codes\n  • Follow us for flash deals\n  • Prepaid orders get extra discounts\n\n🏷️ Current Hot Deals:\n  • Flat discounts on minimum purchase\n  • Buy more, save more offers\n  • Free shipping coupons\n  • Cashback offers\n\nwhat are you planning to buy? I can help you find the best coupon! 🎉",
                        'account': "need help with your account? no worries! 👤✨ here's what you can do:\n\n🔐 Login Issues:\n  • Forgot password? Click 'Forgot Password' to reset\n  • Can't sign in? Try different browser or clear cache\n  • Account locked? Contact support\n  • Email not working? Use phone number to login\n\n⚙️ Account Features:\n  • Save multiple delivery addresses\n  • Track all your orders\n  • View order history\n  • Manage payment methods\n  • Earned reward points\n  • Saved wishlist items\n  • Product reviews & ratings\n\n🎯 Guest Checkout:\n  • Shop without creating account\n  • Quick checkout process\n  • Still get order tracking via email\n  • Can create account later\n\n📝 Account Settings:\n  • Update profile info\n  • Change password\n  • Manage addresses\n  • Email preferences\n  • Privacy settings\n\nwhat specifically do you need help with? login trouble, settings, or something else?",
                        'cancel': "need to cancel? no problem! ❌ here's how:\n\n⏰ Cancellation Window:\n  • Before shipping: Usually 2-4 hours from order\n  • Can't cancel once shipped\n  • Quick refund processing\n\n📱 How to Cancel:\n1. Go to 'My Orders' section\n2. Find your order\n3. Click 'Cancel Order' button\n4. Select cancellation reason\n5. Confirm cancellation\n6. Done! ✅\n\n💰 Refund Process:\n  • Prepaid orders: Refund in 3-5 business days\n  • COD orders: Instant cancellation, no charges\n  • Refund to original payment method\n  • Email confirmation sent\n\n⚠️ Can't Cancel?\nIf shipped, you can:\n  • Refuse delivery at doorstep\n  • Use return option after delivery\n  • Contact support for assistance\n\n💡 Important:\n  • Cancel ASAP for quick refund\n  • Check order status first\n  • Multiple cancellations may flag account\n\nwhich order do you want to cancel? give me the order number and I'll help!",
                        'policy': "we've got clear, customer-friendly policies! 📋✨ here's everything:\n\n↩️ Return Policy:\n  • 7 days return/exchange period\n  • Free pickup from doorstep\n  • Full refund guaranteed\n  • No questions asked\n\n🚚 Shipping Policy:\n  • Free shipping on ₹499+\n  • 2-7 days delivery\n  • Real-time tracking\n  • Secure packaging\n\n💳 Payment & Refund:\n  • All payment methods accepted\n  • Secure transactions (SSL encrypted)\n  • Refunds in 5-7 days\n  • COD available\n\n🔒 Privacy & Security:\n  • Data encryption\n  • No data sharing\n  • Secure checkout\n  • PCI DSS compliant\n\n❌ Cancellation:\n  • Cancel before shipping\n  • Quick refund process\n  • Easy cancellation steps\n\n✅ Quality Guarantee:\n  • Authentic products only\n  • Quality checked\n  • Damaged items replaced\n  • 24/7 customer support\n\n📞 Support:\n  • Live chat support\n  • Email support\n  • Phone support\n  • Ticket system\n\nwhich specific policy do you want to know more about? returns, shipping, payment, or something else?",
                        'greeting': "hey there! 👋😊 great to see you! how can I help you today? looking for something specific or just browsing? I'm here for everything - products, orders, shipping, returns, payments, offers, you name it! what do you need?",
                        'thanks': "you're welcome! 😊 happy to help! anything else you need? I'm here for products, orders, tracking, returns, offers - whatever you need! feel free to ask! 🎯",
                        'default': "hey! I'm here to help with everything! 🎯✨\n\n💬 I can assist with:\n  • Finding products\n  • Checking prices & offers\n  • Order tracking\n  • Returns & refunds\n  • Payment options\n  • Shipping info\n  • Applying coupons\n  • Account help\n  • Policies & more\n\nwhat do you need today? just ask me anything! 😊"
                    },
                    hindi: {
                        'product': "हां जी! हमारे पास इलेक्ट्रॉनिक्स, फैशन, घर का सामान, ब्यूटी प्रोडक्ट्स सब कुछ है। क्या ढूंढ रहे हो?",
                        'kids': "बिल्कुल! बच्चों के लिए ढेर सारे प्रोडक्ट्स हैं - खिलौने, गेम्स, किताबें, स्टेशनरी, बच्चों के कपड़े और जूते, एजुकेशनल आइटम्स, स्कूल सामान, और भी बहुत कुछ! कितने उम्र के बच्चे के लिए?",
                        'electronics': "हां! हमारे पास सब इलेक्ट्रॉनिक्स हैं - मोबाइल, लैपटॉप, टैबलेट, हेडफोन, स्मार्टवॉच, चार्जर, स्पीकर, और एक्सेसरीज। कुछ खास ढूंढ रहे हो?",
                        'fashion': "बढ़िया! हमारे पास सबके लिए फैशन है - मेंस वियर, वूमेंस वियर, किड्स वियर, जूते, बैग, एक्सेसरीज, और भी बहुत कुछ। क्या देखना है?",
                        'beauty': "हां! ब्यूटी एंड पर्सनल केयर सेक्शन में मेकअप, स्किनकेयर, हेयरकेयर, परफ्यूम, ग्रूमिंग प्रोडक्ट्स है। क्या चाहिए?",
                        'home': "ज़रूर! घर के सामान में किचन आइटम्स, होम डेकोर, फर्नीचर, बेडिंग, स्टोरेज, क्लीनिंग सप्लाई है। क्या ढूंढ रहे हो?",
                        'price': "कीमत प्रोडक्ट पर निर्भर करती है। कौन सा प्रोडक्ट देखना है? मैं बता सकता हूं",
                        'shipping': "₹499 से ऊपर के ऑर्डर पर डिलीवरी फ्री है! डिलीवरी में 3-7 दिन लगते हैं, मेट्रो शहरों में 2-4 दिन। कहां डिलीवरी चाहिए?",
                        'order': "अपना ऑर्डर 'माई ऑर्डर्स' में जाकर ट्रैक कर सकते हो। कुछ खास जानना है?",
                        'return': "रिटर्न बहुत आसान है! डिलीवरी के 7 दिन के अंदर वापस या बदल सकते हो। 'माई ऑर्डर्स' में जाओ, आइटम चुनो, 'रिटर्न' पे क्लिक करो, हम फ्री पिकअप करेंगे। पैसे 5-7 दिन में वापस मिलेंगे",
                        'payment': "सब तरह का पेमेंट लेते हैं - कैश ऑन डिलीवरी, कार्ड, यूपीआई, नेट बैंकिंग, वॉलेट। जो आसान लगे! पूरी तरह सुरक्षित है 💳",
                        'coupon': "ऑफर सेक्शन में डिस्काउंट कोड देखो! चेकआउट पर लगाने से तुरंत छूट मिल जाएगी। क्या खरीदने का सोच रहे हो?",
                        'account': "लॉगिन में दिक्कत है? या अकाउंट सेटिंग्स में मदद चाहिए? बिना अकाउंट के भी गेस्ट चेकआउट कर सकते हो। क्या प्रॉब्लम है?",
                        'cancel': "शिपिंग से पहले ऑर्डर कैंसल हो जाएगा (2-4 घंटे का टाइम है)। 'माई ऑर्डर्स' में जाकर 'कैंसल' पे क्लिक करो। पैसे 3-5 दिन में वापस आएंगे",
                        'policy': "हमारी 7 दिन रिटर्न पॉलिसी है, ₹499 के ऊपर फ्री शिपिंग, सुरक्षित पेमेंट, 24/7 सपोर्ट। किस पॉलिसी के बारे में जानना है?",
                        'greeting': "नमस्ते! कैसे हो? 😊",
                        'thanks': "कोई बात नहीं! और कुछ चाहिए?",
                        'default': "हां बोलो! कैसे मदद कर सकता हूं?"
                    },
                    malayalam: {
                        'product': "ഉണ്ട്! ഞങ്ങൾക്ക് ഇലക്ട്രോണിക്സ്, ഫാഷൻ, വീട്ടുപകരണങ്ങൾ, സൗന്ദര്യവർദ്ധക ഉൽപ്പന്നങ്ങൾ എല്ലാം ഉണ്ട്. എന്താണ് തിരയുന്നത്?",
                        'kids': "തീർച്ചയായും! കുട്ടികൾക്ക് ധാരാളം ഉൽപ്പന്നങ്ങൾ ഉണ്ട് - കളിപ്പാട്ടങ്ങൾ, ഗെയിമുകൾ, പുസ്തകങ്ങൾ, സ്റ്റേഷനറി, കുട്ടികളുടെ വസ്ത്രങ്ങളും ഷൂകളും, വിദ്യാഭ്യാസ സാധനങ്ങൾ, സ്കൂൾ സാധനങ്ങൾ, കൂടുതൽ! ഏത് പ്രായത്തിലുള്ള കുട്ടിക്കാണ്?",
                        'electronics': "അതെ! ഞങ്ങൾക്ക് എല്ലാ ഇലക്ട്രോണിക്സും ഉണ്ട് - മൊബൈൽ, ലാപ്ടോപ്പ്, ടാബ്ലെറ്റ്, ഹെഡ്ഫോൺ, സ്മാർട്ട്വാച്ച്, ചാർജറുകൾ, സ്പീക്കറുകൾ, ആക്സസറികൾ. പ്രത്യേകിച്ച് എന്തെങ്കിലും?",
                        'fashion': "നല്ല തിരഞ്ഞെടുപ്പ്! എല്ലാവർക്കും ഫാഷൻ ഉണ്ട് - പുരുഷന്മാരുടെ വസ്ത്രങ്ങൾ, സ്ത്രീകളുടെ വസ്ത്രങ്ങൾ, കുട്ടികളുടെ വസ്ത്രങ്ങൾ, ഷൂസ്, ബാഗുകൾ, ആക്സസറികൾ. എന്താണ് വേണ്ടത്?",
                        'beauty': "ഉണ്ട്! ബ്യൂട്ടി & പേഴ്സണൽ കെയർ വിഭാഗത്തിൽ മേക്കപ്പ്, സ്കിൻകെയർ, ഹെയർകെയർ, സുഗന്ധദ്രവ്യങ്ങൾ, ഗ്രൂമിംഗ് ഉൽപ്പന്നങ്ങൾ ഉണ്ട്. എന്താണ് വേണ്ടത്?",
                        'home': "തീർച്ചയായും! ഗൃഹോപകരണങ്ങളിൽ അടുക്കള സാധനങ്ങൾ, ഹോം ഡെക്കർ, ഫർണിച്ചർ, ബെഡിംഗ്, സ്റ്റോറേജ്, പ്രകൃതീകരണ സാധനങ്ങൾ ഉണ്ട്. എന്താണ് തിരയുന്നത്?",
                        'price': "വില ഉൽപ്പന്നം അനുസരിച്ചിരിക്കും. ഏത് ഉൽപ്പന്നമാണ് നോക്കേണ്ടത്? ഞാൻ സഹായിക്കാം",
                        'shipping': "₹499 മുകളിലുള്ള ഓർഡറുകൾക്ക് സൗജന്യ ഡെലിവറി! സാധാരണ 3-7 ദിവസം എടുക്കും, മെട്രോ നഗരങ്ങളിൽ 2-4 ദിവസം. എവിടെയാണ് ഡെലിവറി വേണ്ടത്?",
                        'order': "'മൈ ഓർഡേഴ്സ്' എന്നതിൽ നിന്ന് നിങ്ങളുടെ ഓർഡർ ട്രാക്ക് ചെയ്യാം. എന്തെങ്കിലും പ്രത്യേകമായി അറിയണോ?",
                        'return': "എളുപ്പത്തിൽ തിരികെ നൽകാം! ഡെലിവറി കഴിഞ്ഞ് 7 ദിവസത്തിനുള്ളിൽ തിരികെ നൽകാനോ മാറ്റാനോ കഴിയും. 'മൈ ഓർഡേഴ്സ്' പോയി ഐറ്റം തിരഞ്ഞെടുക്കുക, 'റിട്ടേൺ' ക്ലിക്ക് ചെയ്യുക, ഞങ്ങൾ സൗജന്യ പിക്കപ്പ് ക്രമീകരിക്കും. തിരികെ കിട്ടാൻ 5-7 ദിവസം എടുക്കും",
                        'payment': "എല്ലാ പേയ്മെന്റ് രീതികളും സ്വീകരിക്കുന്നു - കാഷ് ഓൺ ഡെലിവറി, കാർഡ്, യുപിഐ, നെറ്റ് ബാങ്കിംഗ്, വാലറ്റ്. ഏതും എളുപ്പമുള്ളത്! പൂർണ്ണമായും സുരക്ഷിതമാണ് 💳",
                        'coupon': "ഓഫർ വിഭാഗത്തിൽ ഡിസ്കൗണ്ട് കോഡുകൾ നോക്കൂ! ചെക്ക്ഔട്ടിൽ ഉപയോഗിച്ച് തൽക്ഷണം കിഴിവ് നേടൂ. എന്താണ് വാങ്ങാൻ പ്ലാൻ ചെയ്യുന്നത്?",
                        'account': "ലോഗിൻ ചെയ്യാൻ പ്രശ്നമുണ്ടോ? അല്ലെങ്കിൽ അക്കൗണ്ട് ക്രമീകരണങ്ങളിൽ സഹായം വേണോ? അക്കൗണ്ട് ഇല്ലാതെ ഗസ്റ്റ് ചെക്ക്ഔട്ട് ചെയ്യാനും കഴിയും. എന്താണ് പ്രശ്നം?",
                        'cancel': "ഷിപ്പിംഗിനു മുമ്പ് ഓർഡർ റദ്ദാക്കാം (സാധാരണ 2-4 മണിക്കൂർ സമയം). 'മൈ ഓർഡേഴ്സ്' പോയി 'കാൻസൽ' ക്ലിക്ക് ചെയ്യുക. പണം 3-5 ദിവസത്തിനുള്ളിൽ തിരികെ കിട്ടും",
                        'policy': "7 ദിവസത്തെ റിട്ടേൺ പോളിസി, ₹499 മുകളിൽ സൗജന്യ ഷിപ്പിംഗ്, സുരക്ഷിതമായ പേയ്മെന്റ്, 24/7 പിന്തുണ. ഏത് പോളിസിയെക്കുറിച്ച് അറിയണം?",
                        'greeting': "ഹായ്! എങ്ങനെയുണ്ട്? 😊",
                        'thanks': "സ്വാഗതം! മറ്റെന്തെങ്കിലും വേണോ?",
                        'default': "ഹായ്! ഞാൻ സഹായിക്കാം. എന്താണ് വേണ്ടത്?"
                    }
                };

                const langResponses = fallbackResponses[language] || fallbackResponses.english;

                if (isOrderQuery) {
                    if (liveOrderLookup?.found && liveOrderLookup?.order) {
                        const o = liveOrderLookup.order;
                        const itemsCount = Array.isArray(o.orderItems) ? o.orderItems.length : 0;
                        return NextResponse.json({
                            message: `I found your order.\n\nOrder ID: ${o._id}\nStatus: ${o.status || 'N/A'}\nPayment: ${o.paymentMethod || 'N/A'} (${o.isPaid ? 'Paid' : 'Pending'})\nTracking ID: ${o.trackingId || 'Not assigned yet'}\nCourier: ${o.courier || 'N/A'}\nItems: ${itemsCount}\nTotal: ₹${Number(o.total || 0)}\nMatched by: ${liveOrderLookup.matchedBy || 'N/A'}\n\n${liveOrderLookup.liveTrackingNote || 'I can also help you with return/cancellation for this order.'}`,
                            timestamp: new Date().toISOString(),
                            isFallback: true
                        });
                    }

                    if (liveOrderLookup?.contactMismatch) {
                        return NextResponse.json({
                            message: "I found an order, but the provided email/phone doesn't match that order. Please re-check your contact details or share the exact Order ID.",
                            timestamp: new Date().toISOString(),
                            isFallback: true
                        });
                    }

                    if (!liveOrderLookup?.identifier && !liveOrderLookup?.email && !liveOrderLookup?.phone) {
                        return NextResponse.json({
                            message: "Sure — I can track your order. Please share any one of these: Order ID, short order number, Tracking ID (AWB), registered phone number, or email.",
                            timestamp: new Date().toISOString(),
                            isFallback: true
                        });
                    }

                    return NextResponse.json({
                        message: `I couldn't find an order with the details provided${liveOrderLookup.identifier ? ` (ID: \"${liveOrderLookup.identifier}\")` : ''}. Please re-check Order ID / Tracking ID / phone / email and send again.`,
                        timestamp: new Date().toISOString(),
                        isFallback: true
                    });
                }

                // Match user question to fallback response
                const msgLower = message.toLowerCase();
                let response = langResponses.default;
                
                // Greetings and thanks
                if (msgLower.match(/\b(hi|hello|hey|hii|helo|yo)\b/)) response = langResponses.greeting;
                else if (msgLower.match(/\b(thank|thanks|thx|ty|appreciate)\b/)) response = langResponses.thanks;
                // Specific product categories
                else if (msgLower.match(/\b(kid|kids|child|children|baby|babies|toddler)\b/)) response = langResponses.kids || langResponses.product;
                else if (msgLower.match(/\b(electronic|electronics|mobile|phone|laptop|tablet|gadget|tech)\b/)) response = langResponses.electronics || langResponses.product;
                else if (msgLower.match(/\b(fashion|clothing|clothes|wear|dress|shirt|pant|shoe)\b/)) response = langResponses.fashion || langResponses.product;
                else if (msgLower.match(/\b(beauty|makeup|cosmetic|skincare|haircare|grooming)\b/)) response = langResponses.beauty || langResponses.product;
                else if (msgLower.match(/\b(home|kitchen|furniture|decor|bedding)\b/)) response = langResponses.home || langResponses.product;
               // General queries
                else if (msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('find') || msgLower.includes('buy') || msgLower.includes('search')) response = langResponses.product;
                else if (msgLower.includes('price') || msgLower.includes('cost') || msgLower.includes('cheap') || msgLower.includes('expensive') || msgLower.includes('rupee')) response = langResponses.price;
                else if (msgLower.includes('ship') || msgLower.includes('delivery') || msgLower.includes('deliver') || msgLower.includes('address')) response = langResponses.shipping;
                else if (msgLower.includes('cancel') || msgLower.includes('cancellation')) response = langResponses.cancel;
                else if (msgLower.includes('order') || msgLower.includes('track') || msgLower.includes('status')) response = langResponses.order;
                else if (msgLower.includes('return') || msgLower.includes('replace') || msgLower.includes('refund') || msgLower.includes('exchange')) response = langResponses.return;
                else if (msgLower.includes('payment') || msgLower.includes('pay') || msgLower.includes('card') || msgLower.includes('wallet') || msgLower.includes('cod')) response = langResponses.payment;
                else if (msgLower.includes('coupon') || msgLower.includes('code') || msgLower.includes('discount') || msgLower.includes('offer') || msgLower.includes('deal')) response = langResponses.coupon;
                else if (msgLower.includes('policy') || msgLower.includes('policies') || msgLower.includes('terms') || msgLower.includes('conditions')) response = langResponses.policy;
                else if (msgLower.includes('account') || msgLower.includes('login') || msgLower.includes('profile') || msgLower.includes('password') || msgLower.includes('sign')) response = langResponses.account;

                const fallbackTerms = extractSearchTerms(message);
                const fallbackMatches = productsCache
                    .filter((p) => {
                        const hay = `${p?.name || ''} ${p?.description || ''} ${p?.category || ''}`.toLowerCase();
                        return fallbackTerms.length > 0 && fallbackTerms.some((t) => hay.includes(t));
                    })
                    .slice(0, 4);

                if (isProductQuery && fallbackMatches.length > 0 && language === 'english') {
                    const productLines = fallbackMatches.map((p) => {
                        const price = Number(p.price || 0);
                        const mrp = Number(p.mrp || 0);
                        const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                        return `• ${p.name} — ₹${price}${mrp > price ? ` (MRP ₹${mrp}, ${discount}% off)` : ''} | ${p.fastDelivery ? 'Fast Delivery' : 'Standard Delivery'}\n  ${toShortText(p.description, 120)}`;
                    }).join('\n');

                    response = `Sure — here are some matching products with details:\n\n${productLines}\n\nIf you want, tell me your budget and I’ll suggest the best one.`;
                }

                return NextResponse.json({
                    message: response,
                    timestamp: new Date().toISOString(),
                    isFallback: true
                });
            }

            // Re-throw other errors
            throw apiError;
        }

    } catch (error) {
        console.error('[Chatbot] Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack?.split('\n')[0]
        });

        // Handle specific Gemini errors
        if (error.message?.includes('API key not valid')) {
            return NextResponse.json({ 
                error: "Invalid API key configuration. Please contact support." 
            }, { status: 500 });
        }

        if (error.message?.includes('Invalid request')) {
            return NextResponse.json({ 
                error: "Request format error. Please try again with a simpler message." 
            }, { status: 400 });
        }

        return NextResponse.json({ 
            error: error.message || "Failed to process your message. Please try again." 
        }, { status: 500 });
    }
}
