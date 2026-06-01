"use client";
import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/metaPixelClient";

export default function FbqInitiateCheckout({ value = 0, currency = 'INR', contentIds = [], numItems = 0 }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ids = Array.isArray(contentIds) ? contentIds.filter(Boolean).map(String) : [];
    if (ids.length === 0) return;

    // Fire once per checkout page session; do not retrigger on quantity changes.
    const eventKey = 'meta_initiate_checkout_sent';
    if (sessionStorage.getItem(eventKey)) return;

    trackMetaEvent('InitiateCheckout', {
      value: Number(value || 0),
      currency,
      content_type: 'product',
      content_ids: ids,
      num_items: Number(numItems || 0),
    }, {
      dedupeKey: 'meta_initiate_checkout_once',
    });

    sessionStorage.setItem(eventKey, '1');
  }, [value, currency, numItems, contentIds]);

  return null;
}
