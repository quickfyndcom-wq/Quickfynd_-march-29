"use client";

export const getAttributionData = () => {
  if (typeof window === 'undefined') return {};
  return window.attributionData || {};
};

export const normalizeMetaError = (error) => {
  if (!error) return 'Unknown Meta Pixel error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    return error.message || error.error || error.detail || JSON.stringify(error);
  }
  return String(error);
};

export const trackMetaEvent = (eventName, params = {}, options = {}) => {
  if (typeof window === 'undefined' || !window.fbq || !eventName) return false;

  try {
    const payload = {
      ...params,
      ...getAttributionData(),
    };

    // Prevent accidental duplicate events fired by rapid rerenders/effect re-runs.
    // NOTE: use ?? (nullish coalescing) so that dedupeWindowMs: 0 actually means
    // "disabled" instead of falling through to the 1500ms default.
    const dedupeWindowMs = options?.dedupeWindowMs != null ? Number(options.dedupeWindowMs) : 1500;
    const dedupeKey = options?.dedupeKey || `${eventName}:${JSON.stringify(payload)}`;
    const now = Date.now();
    window.__metaRecentEvents = window.__metaRecentEvents || {};

    const lastSentAt = Number(window.__metaRecentEvents[dedupeKey] || 0);
    if (dedupeWindowMs > 0 && now - lastSentAt < dedupeWindowMs) {
      return false;
    }

    if (options?.eventID) {
      window.fbq('track', eventName, payload, { eventID: options.eventID });
    } else {
      window.fbq('track', eventName, payload);
    }

    window.__metaRecentEvents[dedupeKey] = now;

    return true;
  } catch (error) {
    console.warn('[MetaPixel] track error:', normalizeMetaError(error));
    return false;
  }
};
