'use client'


import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
// TODO: Import your Firebase sign-up logic/component here

export default function SignUpClient() {
  const params = useSearchParams();
  const [redirect, setRedirect] = useState('/');

  useEffect(() => {
    // Only run on client to avoid hydration mismatch
    const redirectUrl = params.get('redirect_to') || '/';
    setRedirect(redirectUrl);
  }, [params]);

  // TODO: Replace this with your Firebase sign-up component or logic
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign up</h1>
        <p className="text-gray-600 mb-4">Create your account to continue shopping.</p>
        {/* Insert your Firebase sign-up form/component here */}
        <a href="/sign-in" className="inline-block px-5 py-2 bg-orange-500 text-white rounded-lg mt-4">Already have an account? Sign in</a>
      </div>
    </div>
  );
}
