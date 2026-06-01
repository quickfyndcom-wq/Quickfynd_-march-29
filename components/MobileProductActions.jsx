'use client'

import { Plus, ShoppingCart } from 'lucide-react'

export default function MobileProductActions({ 
  onOrderNow, 
  onAddToCart,
  effPrice,
  currency,
  cartCount,
  isOutOfStock = false,
  isOrdering = false
}) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-50 safe-area-bottom">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Order Now Button */}
        <button
          onClick={onOrderNow}
          disabled={isOutOfStock || isOrdering}
          className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white transition-all shadow-md border ${
            (isOutOfStock || isOrdering)
              ? 'bg-gray-400 border-gray-400 cursor-not-allowed opacity-70' 
              : 'bg-gradient-to-r from-rose-500 to-red-500 border-red-500 active:from-rose-600 active:to-red-600'
          }`}
        >
          {isOutOfStock ? (
            <span className="text-base tracking-wide">Out of Stock</span>
          ) : isOrdering ? (
            <span className="relative w-full h-full flex items-center justify-center py-0.5">
              <span className="relative flex items-center gap-2 text-white">
                <ShoppingCart size={18} strokeWidth={2.5} className="animate-pulse" />
                <span className="text-sm font-semibold tracking-wide">Placing</span>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
              </span>
            </span>
          ) : (
            <>
              <span className="text-base tracking-wide">Order Now</span>
              <Plus size={20} strokeWidth={3} />
            </>
          )}
        </button>

        {/* Add to Cart Button - Hidden when out of stock */}
        {!isOutOfStock && (
          <button
            onClick={onAddToCart}
            className="relative flex items-center justify-center w-16 h-12 rounded-lg transition-all shadow-md"
            style={{ backgroundColor: cartCount > 0 ? '#262626' : '#DC013C' }}
          >
            <ShoppingCart size={24} className="text-white" strokeWidth={2.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" style={{ backgroundColor: '#DC013C' }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
