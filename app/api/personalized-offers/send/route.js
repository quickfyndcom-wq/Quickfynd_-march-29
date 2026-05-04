import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PersonalizedOffer from '@/models/PersonalizedOffer';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { sendMail } from '@/lib/email';

function resolveImageUrl(image) {
  if (typeof image === 'string' && image.trim()) return image;
  if (image && typeof image === 'object') {
    const resolved = image.url || image.src;
    if (typeof resolved === 'string' && resolved.trim()) return resolved;
  }
  return 'https://ik.imagekit.io/jrstupuke/placeholder.png';
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Forbidden - No store access' }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const offerId = String(body?.offerId || '').trim();
    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
    }

    const offer = await PersonalizedOffer.findOne({ _id: offerId, storeId: String(storeId) }).lean();
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (!offer.customerEmail) {
      return NextResponse.json({ error: 'Customer email is missing for this offer' }, { status: 400 });
    }

    const product = await Product.findById(offer.productId)
      .select('name slug price mrp images')
      .lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found for this offer' }, { status: 404 });
    }

    const price = Number(product.price || 0);
    const discountPercent = Number(offer.discountPercent || 0);
    const discountAmount = Number(((price * discountPercent) / 100).toFixed(2));
    const discountedPrice = Number((price - discountAmount).toFixed(2));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://quickfynd.com';
    const offerPath = product.slug ? encodeURIComponent(product.slug) : offer.offerToken;
    const offerUrl = `${baseUrl}/offer/${offerPath}`;

    const customerName = offer.customerName || 'Customer';
    const expiresText = offer.expiresAt
      ? new Date(offer.expiresAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Limited time';

    const subject = `${discountPercent}% OFF just for you on ${product.name}`;
    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;background:#f5f7ff;padding:20px;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;padding:24px;">
            <h2 style="margin:0 0 6px;font-size:24px;">Special Offer for You</h2>
            <p style="margin:0;font-size:14px;opacity:0.95;">Hi ${customerName}, unlock your exclusive discount now.</p>
          </div>
          <div style="padding:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:120px;vertical-align:top;">
                  <img src="${resolveImageUrl(product.images?.[0])}" alt="${product.name}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;" />
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#111827;">${product.name}</p>
                  <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Original Price: ₹${price.toFixed(2)}</p>
                  <p style="margin:0 0 4px;font-size:14px;color:#dc2626;font-weight:700;">Discount: ${discountPercent}% (₹${discountAmount.toFixed(2)})</p>
                  <p style="margin:0;font-size:16px;color:#059669;font-weight:800;">Offer Price: ₹${discountedPrice.toFixed(2)}</p>
                </td>
              </tr>
            </table>
            <div style="margin-top:16px;padding:12px;border:1px dashed #93c5fd;border-radius:10px;background:#eff6ff;">
              <p style="margin:0;font-size:13px;color:#1e3a8a;">Valid till: <strong>${expiresText}</strong></p>
            </div>
            <div style="margin-top:20px;text-align:center;">
              <a href="${offerUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">View Your Offer</a>
            </div>
          </div>
        </div>
      </div>
    `;

    await sendMail({
      to: offer.customerEmail,
      subject,
      html,
      fromType: 'marketing',
      tags: [{ name: 'category', value: 'personalized_offer' }],
      headers: {
        'X-Campaign': 'personalized-offer',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Offer email sent successfully',
      recipient: offer.customerEmail,
      offerUrl,
    });
  } catch (error) {
    console.error('Error sending personalized offer email:', error);
    return NextResponse.json(
      { error: 'Failed to send offer email', details: error.message },
      { status: 500 }
    );
  }
}
