"use client";
import { useEffect } from "react";

export default function FbqAddToCart() {
  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'AddToCart');
    }
  }, []);
  return null;
}
