import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import AbandonedCart from '@/models/AbandonedCart';
import PersonalizedOffer from '@/models/PersonalizedOffer';
import User from '@/models/User';
import EmailHistory from '@/models/EmailHistory';
import { sendMail } from '@/lib/email';
import { buildAbandonedCheckoutRecoveryEmail } from '@/lib/promotionalEmailTemplates';
import mongoose from 'mongoose';
import crypto from 'crypto';

const RECOVERY_DISCOUNT_PERCENT = 5;
const RECOVERY_EXPIRY_HOURS = 20;
const RECOVERY_EMAIL_COOLDOWN_MS = RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000;

function generateOfferToken() {
  return crypto.randomBytes(16).toString('hex');
}

function resolveImageUrl(image) {
  if (typeof image === 'string' && image.trim()) return image;
  if (image && typeof image === 'object') {
    const resolved = image.url || image.src;
    if (typeof resolved === 'string' && resolved.trim()) return resolved;
  }
  return 'https://ik.imagekit.io/jrstupuke/placeholder.png';
}

async function sendRecoveryEmail({ storeId, cartDoc, storeItems, productMap, now }) {
  if (!cartDoc?.email) return { emailed: false, reason: 'missing-email' };

  const lastSentAt = cartDoc.recoveryEmailSentAt ? new Date(cartDoc.recoveryEmailSentAt) : null;
  if (lastSentAt && (now.getTime() - lastSentAt.getTime()) < RECOVERY_EMAIL_COOLDOWN_MS) {
    return { emailed: false, reason: 'cooldown-active' };
  }

  const user = await User.findOne({ email: cartDoc.email }).select('emailPreferences').lean();
  if (user?.emailPreferences?.promotional === false) {
    return { emailed: false, reason: 'unsubscribed' };
  }

  const primaryItem = storeItems.find((item) => productMap.has(String(item.productId)));
  if (!primaryItem) return { emailed: false, reason: 'missing-product' };

  const product = productMap.get(String(primaryItem.productId));
  const expiryDate = new Date(now.getTime() + (RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000));

  let offer = await PersonalizedOffer.findOne({
    storeId,
    customerEmail: cartDoc.email,
    productId: String(product._id),
    isActive: true,
    isUsed: false,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (!offer) {
    offer = await PersonalizedOffer.create({
      offerToken: generateOfferToken(),
      storeId,
      customerEmail: cartDoc.email,
      customerPhone: cartDoc.phone || null,
      customerName: cartDoc.name || null,
      productId: String(product._id),
      discountPercent: RECOVERY_DISCOUNT_PERCENT,
      expiresAt: expiryDate,
      notes: 'Auto-generated abandoned checkout recovery offer',
      isActive: true,
    });
  } else {
    offer.discountPercent = RECOVERY_DISCOUNT_PERCENT;
    offer.expiresAt = expiryDate;
    offer.customerPhone = cartDoc.phone || offer.customerPhone || null;
    offer.customerName = cartDoc.name || offer.customerName || null;
    offer.notes = 'Auto-generated abandoned checkout recovery offer';
    await offer.save();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://quickfynd.com';
  const offerPath = encodeURIComponent(product.slug || offer.offerToken);
  const offerUrl = product.slug
    ? `${baseUrl}/offer/${offerPath}?token=${encodeURIComponent(offer.offerToken)}`
    : `${baseUrl}/offer/${encodeURIComponent(offer.offerToken)}`;
  const subjectName = cartDoc.name?.trim()?.split(' ')[0] || 'there';
  const subject = `${subjectName}, your checkout is waiting — save ${RECOVERY_DISCOUNT_PERCENT}% before it expires`;
  const html = buildAbandonedCheckoutRecoveryEmail({
    recipientEmail: cartDoc.email,
    customerName: cartDoc.name,
    product: {
      name: product.name,
      price: Number(product.price || 0),
      image: resolveImageUrl(product.images?.[0]),
    },
    offerUrl,
    discountPercent: RECOVERY_DISCOUNT_PERCENT,
    expiresAt: expiryDate,
    cartTotal: cartDoc.cartTotal,
    currency: cartDoc.currency || '₹',
  });

  await sendMail({
    to: cartDoc.email,
    subject,
    html,
    fromType: 'marketing',
    tags: [{ name: 'category', value: 'abandoned-checkout-recovery' }],
    headers: {
      'List-Unsubscribe': `<${baseUrl}/settings?unsubscribe=promotional&email=${encodeURIComponent(cartDoc.email)}>`,
      'X-Campaign': 'abandoned-checkout-recovery'
    }
  });

  if (mongoose.Types.ObjectId.isValid(storeId)) {
    await EmailHistory.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      type: 'promotional',
      recipientEmail: cartDoc.email,
      recipientName: cartDoc.name || 'Customer',
      subject,
      status: 'sent',
      productId: mongoose.Types.ObjectId.isValid(String(product._id)) ? new mongoose.Types.ObjectId(String(product._id)) : undefined,
      productName: product.name,
      customMessage: `auto-abandoned-checkout-recovery:${offer.offerToken}`,
      sentAt: now,
    });
  }

  await AbandonedCart.updateOne(
    { _id: cartDoc._id },
    {
      $set: {
        recoveryOfferToken: offer.offerToken,
        recoveryOfferExpiresAt: expiryDate,
        recoveryEmailSentAt: now,
        recoveryProductId: String(product._id),
      },
    }
  );

  return { emailed: true, offerToken: offer.offerToken };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, customer, userId, cartTotal, currency, triggerRecoveryEmail = false } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    await dbConnect();

    const productIds = items.map(it => it.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id storeId name price slug images mrp')
      .lean();

    const productMap = new Map(products.map(p => [String(p._id), p]));

    // Group items by storeId
    const grouped = new Map();
    for (const it of items) {
      const prod = productMap.get(String(it.productId));
      if (!prod?.storeId) continue;
      const storeId = String(prod.storeId);
      if (!grouped.has(storeId)) grouped.set(storeId, []);
      grouped.get(storeId).push({
        productId: it.productId,
        name: it.name || prod.name,
        quantity: it.quantity || 1,
        price: it.price || prod.price || 0,
        variantOptions: it.variantOptions || null,
      });
    }

    const now = new Date();
    const identifier = userId || customer?.email || customer?.phone || null;

    for (const [storeId, storeItems] of grouped.entries()) {
      const filter = { storeId };
      if (identifier) {
        filter.$or = [
          ...(userId ? [{ userId }] : []),
          ...(customer?.email ? [{ email: customer.email.toLowerCase() }] : []),
          ...(customer?.phone ? [{ phone: customer.phone }] : []),
        ];
      }

      // Validate that at least email or phone is provided for tracking
      const email = customer?.email?.toLowerCase() || null;
      const phone = customer?.phone || null;
      
      if (!email && !phone && !userId) {
        console.warn('[abandoned-checkout] Skipping cart without email, phone, or userId');
        continue;
      }

      const cartDoc = await AbandonedCart.findOneAndUpdate(
        filter,
        {
          $set: {
            storeId,
            userId: userId || null,
            name: customer?.name?.trim() || null,
            email,
            phone,
            address: customer?.address || null,
            items: storeItems,
            cartTotal: typeof cartTotal === 'number' ? cartTotal : null,
            currency: currency || null,
            lastSeenAt: now,
            source: 'checkout',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (triggerRecoveryEmail && email) {
        try {
          await sendRecoveryEmail({
            storeId,
            cartDoc,
            storeItems,
            productMap,
            now,
          });
        } catch (recoveryError) {
          console.error('[abandoned-checkout] recovery email error:', recoveryError);

          if (mongoose.Types.ObjectId.isValid(storeId)) {
            await EmailHistory.create({
              storeId: new mongoose.Types.ObjectId(storeId),
              type: 'promotional',
              recipientEmail: email,
              recipientName: customer?.name?.trim() || 'Customer',
              subject: `Complete your checkout now and get ${RECOVERY_DISCOUNT_PERCENT}% off`,
              status: 'failed',
              errorMessage: recoveryError.message || 'Failed to send abandoned checkout recovery email',
              customMessage: 'auto-abandoned-checkout-recovery',
              sentAt: now,
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, recoveryTriggered: Boolean(triggerRecoveryEmail) });
  } catch (error) {
    console.error('[abandoned-checkout] error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}