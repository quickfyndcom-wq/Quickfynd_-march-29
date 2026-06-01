"use client";
import { useEffect } from "react";

export default function FbqViewContent() {
  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'ViewContent');
    }
  }, []);
  return null;
}
