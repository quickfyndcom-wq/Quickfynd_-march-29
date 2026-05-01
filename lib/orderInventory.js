import Product from '@/models/Product';

export function findMatchingVariantIndex(variants = [], variantOptions = {}) {
  if (!Array.isArray(variants) || variants.length === 0 || !variantOptions) return -1;

  return variants.findIndex((variant) => {
    const options = variant?.options || {};
    const colorMatch = variantOptions?.color ? options?.color === variantOptions.color : true;
    const sizeMatch = variantOptions?.size ? options?.size === variantOptions.size : true;

    if (variantOptions?.bundleQty === null || variantOptions?.bundleQty === undefined) {
      const optionBundleQty = Number(options?.bundleQty);
      const isBundleVariant = Number.isFinite(optionBundleQty) && optionBundleQty > 1;
      return colorMatch && sizeMatch && !isBundleVariant;
    }

    const bundleMatch = Number(options?.bundleQty || 0) === Number(variantOptions?.bundleQty || 0);
    return colorMatch && sizeMatch && bundleMatch;
  });
}

export async function restockOrderItems(orderItems = []) {
  for (const item of orderItems || []) {
    const productId = item?.productId?._id || item?.productId;
    const qty = Number(item?.quantity) || 0;
    if (!productId || qty <= 0) continue;

    try {
      const product = await Product.findById(productId);
      if (!product) continue;

      if (item?.variantOptions && Array.isArray(product.variants) && product.variants.length > 0) {
        const variantIndex = findMatchingVariantIndex(product.variants, item.variantOptions);
        if (variantIndex >= 0) {
          const currentStock = Number(product.variants[variantIndex]?.stock ?? 0);
          product.variants[variantIndex].stock = currentStock + qty;
          product.stockQuantity = product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.stock ?? 0)), 0);
          product.inStock = product.stockQuantity > 0;
          await product.save();
          continue;
        }
      }

      product.stockQuantity = Math.max(0, Number(product.stockQuantity || 0) + qty);
      product.inStock = Number(product.stockQuantity || 0) > 0;
      await product.save();
    } catch (stockErr) {
      console.error('Order restock error:', stockErr);
    }
  }
}
