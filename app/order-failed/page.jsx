'use client'
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OrderFailedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason') || 'Unknown error';

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center py-8'>
      <div className='max-w-xl mx-auto p-8 bg-white rounded-lg shadow-lg text-center'>
        <div className='flex flex-col items-center gap-4 mb-6'>
          <span className='text-red-600 text-5xl'>✕</span>
          <h2 className='text-2xl font-bold text-red-600'>Order Failed</h2>
          <p className='text-gray-700'>Sorry, your order could not be placed.</p>
        </div>
        
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left'>
          <p className='text-sm text-red-800'>
            <span className='font-semibold'>Reason:</span> {decodeURIComponent(reason)}
          </p>
        </div>

        <p className='text-gray-600 mb-6'>Please try again or contact our support team for assistance.</p>
        
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <button 
            className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition-colors'
            onClick={() => router.push('/checkout')}
          >
            Retry Checkout
          </button>
          <button 
            className='bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-3 rounded-lg font-bold transition-colors'
            onClick={() => router.push('/')}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderFailed() {
  return (
    <Suspense fallback={<div className='text-center py-20'>Loading...</div>}>
      <OrderFailedContent />
    </Suspense>
  );
}
