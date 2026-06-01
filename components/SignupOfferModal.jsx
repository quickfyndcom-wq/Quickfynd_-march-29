"use client";
import React, { useEffect, useState } from "react";

const SignupOfferModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show modal after short delay, only if not already closed in this session
    if (!sessionStorage.getItem("signupOfferClosed")) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("signupOfferClosed", "1");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center relative animate-fadeIn">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-2 text-green-700">Sign Up & Get 15% Off!</h2>
        <p className="mb-4 text-gray-600">Create your account now and enjoy 15% off your first order. Limited time offer!</p>
        <a
          href="/sign-up"
          className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Sign Up Now
        </a>
      </div>
    </div>
  );
};

export default SignupOfferModal;
