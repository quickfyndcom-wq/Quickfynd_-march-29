import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

// GET /api/products/[id]/fbt - Fetch frequently bought together products
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    // Handle async params in Next.js 15
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await Product.findById(id).select('enableFBT fbtProductIds fbtBundlePrice fbtBundleDiscount');
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // If FBT is not enabled or no products selected, return empty
    if (!product.enableFBT || !product.fbtProductIds || product.fbtProductIds.length === 0) {
      return NextResponse.json({ 
        enableFBT: false, 
        products: [], 
        bundlePrice: 0,
        bundleDiscount: 0 
      });
    }

    // Fetch the FBT products
    const fbtProducts = await Product.find({
      _id: { $in: product.fbtProductIds }
    }).select('name price images slug hasVariants variants');

    return NextResponse.json({
      enableFBT: product.enableFBT,
      products: fbtProducts,
      bundlePrice: product.fbtBundlePrice,
      bundleDiscount: product.fbtBundleDiscount || 0
    });
  } catch (error) {
    console.error('Error fetching FBT products:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Failed to fetch FBT products',
      details: error.message 
    }, { status: 500 });
  }
}

// PATCH /api/products/[id]/fbt - Update FBT configuration
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    // Handle async params in Next.js 15
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const body = await request.json();

    const { enableFBT, fbtProductIds, fbtBundlePrice, fbtBundleDiscount } = body;

    // Validate input
    if (enableFBT && (!fbtProductIds || fbtProductIds.length === 0)) {
      return NextResponse.json({ 
        error: 'At least one product must be selected when enabling FBT' 
      }, { status: 400 });
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        enableFBT: enableFBT || false,
        fbtProductIds: fbtProductIds || [],
        fbtBundlePrice: fbtBundlePrice || null,
        fbtBundleDiscount: fbtBundleDiscount || null
      },
      { new: true }
    ).select('enableFBT fbtProductIds fbtBundlePrice fbtBundleDiscount');

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct 
    });
  } catch (error) {
    console.error('Error updating FBT configuration:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Failed to update FBT configuration',
      details: error.message 
    }, { status: 500 });
  }
}
