'use client'
import { addToCart, removeFromCart, deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, maxQty, bulkVariants = [], baseUnitPrice }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    const entry = cartItems[productId];
    const quantity = typeof entry === 'number' ? entry : entry?.quantity || 0;
    const price = typeof entry === 'number' ? undefined : entry?.price;
    const variantOptions = typeof entry === 'number' ? {} : entry?.variantOptions || {};
    const offerToken = typeof entry === 'number' ? undefined : entry?.offerToken;
    const discountPercent = typeof entry === 'number' ? undefined : entry?.discountPercent;
    const normalizedMaxQty = typeof maxQty === 'number' ? Math.max(0, maxQty) : null;
    const canIncrement = normalizedMaxQty === null ? true : quantity < normalizedMaxQty;
    const isOutOfStock = normalizedMaxQty !== null && normalizedMaxQty <= 0;
    const sortedBulkVariants = Array.isArray(bulkVariants)
        ? bulkVariants
            .filter((variant) => Number(variant?.options?.bundleQty) > 0)
            .slice()
            .sort((a, b) => Number(a?.options?.bundleQty) - Number(b?.options?.bundleQty))
        : [];
    const currentBundleQty = Number(variantOptions?.bundleQty) || 0;
    const isBundleMode = currentBundleQty > 1;

    const switchToBundle = (targetBundle) => {
        const targetBundleQty = Number(targetBundle?.options?.bundleQty) || 0;
        if (targetBundleQty <= 0) return;
        if (typeof targetBundle?.stock === 'number' && targetBundle.stock <= 0) return;
        if (normalizedMaxQty !== null && targetBundleQty > normalizedMaxQty) return;

        dispatch(deleteItemFromCart({ productId }));
        for (let i = 0; i < targetBundleQty; i++) {
            dispatch(addToCart({
                productId,
                price: Number(targetBundle?.price) || 0,
                maxQty: normalizedMaxQty,
                variantOptions: {
                    ...variantOptions,
                    bundleQty: targetBundleQty,
                },
                ...(offerToken !== undefined ? { offerToken } : {}),
                ...(discountPercent !== undefined ? { discountPercent } : {}),
            }));
        }
    };

    const switchToNonBundle = (newQty) => {
        const normalizedQty = Math.max(0, Number(newQty) || 0);
        if (normalizedQty <= 0) {
            dispatch(deleteItemFromCart({ productId }));
            return;
        }
        if (normalizedMaxQty !== null && normalizedQty > normalizedMaxQty) return;

        const perUnitPrice = Number(baseUnitPrice);
        const fallbackPrice = Number(price) || 0;
        const nextPrice = Number.isFinite(perUnitPrice) && perUnitPrice > 0 ? perUnitPrice : fallbackPrice;

        dispatch(deleteItemFromCart({ productId }));
        for (let i = 0; i < normalizedQty; i++) {
            dispatch(addToCart({
                productId,
                price: nextPrice,
                maxQty: normalizedMaxQty,
                variantOptions: {
                    ...variantOptions,
                    bundleQty: null,
                },
                ...(offerToken !== undefined ? { offerToken } : {}),
                ...(discountPercent !== undefined ? { discountPercent } : {}),
            }));
        }
    };

    const addToCartHandler = () => {
        if (isOutOfStock) return;
        if (!isBundleMode && !canIncrement) return;

        if (isBundleMode && sortedBulkVariants.length > 0) {
            const nextBundle = sortedBulkVariants.find(
                (variant) => Number(variant?.options?.bundleQty) > currentBundleQty
            );

            if (nextBundle) {
                switchToBundle(nextBundle);
                return;
            }

            switchToNonBundle(quantity + 1);
            return;
        }

        dispatch(addToCart({
            productId,
            price,
            maxQty: normalizedMaxQty,
            variantOptions: {
                ...variantOptions,
                bundleQty: null,
            },
            ...(offerToken !== undefined ? { offerToken } : {}),
            ...(discountPercent !== undefined ? { discountPercent } : {}),
        }))
    }

    const removeFromCartHandler = () => {
        if (isBundleMode && sortedBulkVariants.length > 0) {
            const currentIndex = sortedBulkVariants.findIndex(
                (variant) => Number(variant?.options?.bundleQty) === currentBundleQty
            );

            if (currentIndex <= 0) {
                dispatch(deleteItemFromCart({ productId }));
                return;
            }

            const previousBundle = sortedBulkVariants[currentIndex - 1];
            switchToBundle(previousBundle);
            return;
        }

        const nextQty = quantity - 1;
        if (nextQty <= 0) {
            dispatch(deleteItemFromCart({ productId }));
            return;
        }

        const targetBundle = sortedBulkVariants.find(
            (variant) => Number(variant?.options?.bundleQty) === nextQty
        );
        if (targetBundle) {
            switchToBundle(targetBundle);
            return;
        }

        dispatch(removeFromCart({ productId }))
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{quantity}</p>
            <button
                onClick={addToCartHandler}
                disabled={isOutOfStock || (!isBundleMode && !canIncrement)}
                className={`p-1 select-none ${isOutOfStock || (!isBundleMode && !canIncrement) ? 'opacity-40 cursor-not-allowed' : ''}`}
            >+
            </button>
        </div>
    )
}

export default Counter