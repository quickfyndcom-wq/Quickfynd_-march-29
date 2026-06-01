import { NextResponse } from 'next/server';

// This API route proxies Delhivery pincode serviceability check
// Usage: /api/delhivery/pincode-serviceability?pincode=123456&product_type=Heavy

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get('pincode');
  const productType = searchParams.get('product_type'); // optional, for heavy

  if (!pincode) {
    return NextResponse.json({ error: 'Missing pincode' }, { status: 400 });
  }

  // Choose endpoint based on product type
  let url;
  if (productType === 'Heavy') {
    url = `https://track.delhivery.com/api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode=${pincode}`;
  } else {
    url = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`;
  }

  // Use your Delhivery API token here
  const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || process.env.DELHIVERY_TOKEN || 'YOUR_DELHIVERY_TOKEN';

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${DELHIVERY_TOKEN}`,
        'Accept': 'application/json',
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
