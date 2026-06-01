import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CartSummaryBox({ subtotal, shipping, total, checkoutDisabled = false, checkoutNote = "", showShipping = true }) {
  const router = useRouter();
  const [isNavigatingToCheckout, setIsNavigatingToCheckout] = useState(false);

  const handleCheckout = () => {
    if (checkoutDisabled || isNavigatingToCheckout) return;
    setIsNavigatingToCheckout(true);
    router.push("/checkout");
  };

  const isCheckoutBusy = checkoutDisabled || isNavigatingToCheckout;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Items</span>
          <span>₹ {subtotal.toLocaleString()}</span>
        </div>
        {showShipping && (
          <div className="flex justify-between text-sm mb-2">
            <span className={shipping === 0 ? 'text-green-600' : 'text-gray-400'}>
              Shipping &amp; handling
            </span>
            <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
              {shipping === 0 ? 'FREE' : `₹ ${shipping.toLocaleString()}`}
            </span>
          </div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between font-bold text-base text-gray-800">
          <span>Total</span>
          <span>₹ {total.toLocaleString()}</span>
        </div>
      </div>
      {checkoutNote && (
        <p className="text-xs text-red-600 mb-3">{checkoutNote}</p>
      )}
      <button
        className="w-full border border-gray-300 rounded-md py-2 font-semibold text-gray-800 mb-3 hover:bg-gray-100 transition"
        onClick={() => router.push("/products")}
        disabled={isNavigatingToCheckout}
      >
        Continue Shopping
      </button>
      <button
        type="button"
        className={`relative w-full overflow-hidden rounded-xl py-3 font-bold text-white transition-all duration-300 ${checkoutDisabled ? 'cursor-not-allowed bg-gray-400' : 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 shadow-[0_10px_30px_rgba(239,68,68,0.28)] hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(239,68,68,0.34)]'} ${isNavigatingToCheckout ? 'scale-[0.985]' : ''}`}
        onClick={handleCheckout}
        disabled={isCheckoutBusy}
        aria-busy={isNavigatingToCheckout}
      >
        {!checkoutDisabled && (
          <>
            <span className={`pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_15%,rgba(255,255,255,0.22)_40%,transparent_65%)] ${isNavigatingToCheckout ? 'animate-pulse' : ''}`} />
            <span className={`pointer-events-none absolute inset-y-0 left-[-30%] w-1/2 -skew-x-12 bg-white/20 blur-xl transition-transform duration-700 ${isNavigatingToCheckout ? 'translate-x-[240%]' : 'translate-x-0'}`} />
          </>
        )}

        <span className="relative z-10 flex min-h-[28px] items-center justify-center gap-3">
          {checkoutDisabled ? (
            <span>Checkout Unavailable</span>
          ) : isNavigatingToCheckout ? (
            <>
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute h-7 w-7 rounded-full border border-white/25" />
                <span className="absolute h-7 w-7 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                <span className="absolute h-4 w-4 rounded-full bg-white/18 animate-ping" />
                <span className="relative flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.25s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" />
                </span>
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="text-sm font-extrabold tracking-[0.18em] uppercase">Loading</span>
                <span className="text-[10px] font-medium text-white/80 tracking-[0.24em] uppercase">Preparing Checkout</span>
              </span>
            </>
          ) : (
            <>
              <span className="tracking-wide">Order Now</span>
              <span className="text-2xl leading-none">+</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
