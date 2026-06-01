"use client";
import { useEffect } from "react";

/**
 * Ads Attribution Tracker
 * Captures ad source data and adds it to all pixel events
 * Tracks: ViewContent, AddToCart, InitiateCheckout, Purchase
 */
export default function AdsAttribution() {
  useEffect(() => {
    // Get stored UTM data if available
    const utmData = localStorage.getItem('utm_data');
    const sessionData = utmData ? JSON.parse(utmData) : null;

    if (!sessionData || !window.fbq) return;

    // Store attribution data globally for use in events
    window.attributionData = {
      utm_source: sessionData.source,
      utm_medium: sessionData.medium,
      utm_campaign: sessionData.campaign,
      utm_id: sessionData.id,
      referrer: sessionData.referrer,
      entry_page_url: window.location.href
    };

    // Send initial attribution event for tracking visitors from ads
    window.fbq('track', 'Lead', {
      utm_source: sessionData.source,
      utm_campaign: sessionData.campaign,
      utm_medium: sessionData.medium
    });

    // Log custom event for dashboard analytics
    fetch('/api/analytics/track-attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: sessionData.source,
        medium: sessionData.medium,
        campaign: sessionData.campaign,
        referrer: sessionData.referrer,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Attribution tracking failed:', err));

  }, []);

  return null;
}
