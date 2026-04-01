const VISITOR_KEY = "qf_visitor_id";
const SESSION_KEY = "qf_session_id";
const FIRST_TOUCH_KEY = "qf_first_touch_attribution";
const LAST_TOUCH_KEY = "qf_last_touch_attribution";
const LAST_STORE_KEY = "qf_last_store_id";
const LAST_CUSTOMER_IDENTITY_KEY = "qf_last_customer_identity";

function safeStorageGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures
  }
}

function createId(prefix = "id") {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

function normalizeAttribution(input) {
  return {
    source: String(input?.source || "direct").toLowerCase(),
    medium: String(input?.medium || "direct").toLowerCase(),
    campaign: String(input?.campaign || "none"),
    referrer: String(input?.referrer || "direct"),
  };
}

function getQueryAttribution() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search || "");
  const utmSource = params.get("utm_source") || params.get("source") || params.get("src");
  const utmMedium = params.get("utm_medium") || "";
  const utmCampaign = params.get("utm_campaign") || "";

  const hasClickId = {
    fbclid: params.has("fbclid"),
    gclid: params.has("gclid"),
    ttclid: params.has("ttclid"),
    msclkid: params.has("msclkid"),
    twclid: params.has("twclid"),
    li_fat_id: params.has("li_fat_id"),
  };

  let source = String(utmSource || "").toLowerCase();
  let medium = String(utmMedium || "").toLowerCase();

  if (!source && hasClickId.fbclid) source = "facebook";
  if (!source && hasClickId.gclid) source = "google";
  if (!source && hasClickId.ttclid) source = "tiktok";
  if (!source && hasClickId.msclkid) source = "bing";
  if (!source && hasClickId.twclid) source = "twitter";
  if (!source && hasClickId.li_fat_id) source = "linkedin";

  if (!medium && (hasClickId.fbclid || hasClickId.gclid || hasClickId.ttclid || hasClickId.msclkid || hasClickId.twclid || hasClickId.li_fat_id)) {
    medium = "paid";
  }

  if (!source) return null;

  return {
    source,
    medium: medium || "referral",
    campaign: utmCampaign || "none",
  };
}

function getReferrerAttribution(rawReferrer) {
  const ref = String(rawReferrer || "").toLowerCase();
  const referrer = rawReferrer || "direct";

  if (!ref) {
    return {
      source: "direct",
      medium: "direct",
      campaign: "none",
      referrer,
    };
  }

  if (ref.includes("facebook.com") || ref.includes("fb.com") || ref.includes("m.facebook.com")) {
    return { source: "facebook", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("instagram.com")) {
    return { source: "instagram", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("google.")) {
    return { source: "google", medium: "organic", campaign: "none", referrer };
  }
  if (ref.includes("youtube.com") || ref.includes("youtu.be")) {
    return { source: "youtube", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("whatsapp.com") || ref.includes("wa.me")) {
    return { source: "whatsapp", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("telegram") || ref.includes("t.me")) {
    return { source: "telegram", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("linkedin.com")) {
    return { source: "linkedin", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("twitter.com") || ref.includes("x.com") || ref.includes("t.co")) {
    return { source: "twitter", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("pinterest.com")) {
    return { source: "pinterest", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("reddit.com")) {
    return { source: "reddit", medium: "referral", campaign: "none", referrer };
  }
  if (ref.includes("chatgpt.com") || ref.includes("openai.com")) {
    return { source: "chatgpt", medium: "referral", campaign: "none", referrer };
  }

  try {
    const host = new URL(rawReferrer).hostname.replace(/^www\./i, "");
    return {
      source: host || "referral",
      medium: "referral",
      campaign: "none",
      referrer,
    };
  } catch {
    return {
      source: "referral",
      medium: "referral",
      campaign: "none",
      referrer,
    };
  }
}

function persistAttribution(current) {
  if (typeof window === "undefined") return;

  const normalized = normalizeAttribution(current);
  const existingFirstTouch = safeJsonParse(safeStorageGet(window.localStorage, FIRST_TOUCH_KEY));

  if (!existingFirstTouch || !existingFirstTouch.source) {
    safeStorageSet(window.localStorage, FIRST_TOUCH_KEY, JSON.stringify(normalized));
  }

  safeStorageSet(window.localStorage, LAST_TOUCH_KEY, JSON.stringify(normalized));
}

export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  let visitorId = safeStorageGet(window.localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = createId("visitor");
    safeStorageSet(window.localStorage, VISITOR_KEY, visitorId);
  }
  return visitorId;
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  let sessionId = safeStorageGet(window.sessionStorage, SESSION_KEY);
  if (!sessionId) {
    sessionId = createId("session");
    safeStorageSet(window.sessionStorage, SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function detectTrafficSource() {
  if (typeof window === "undefined") {
    return {
      source: "direct",
      medium: "direct",
      campaign: "none",
      referrer: "direct",
    };
  }

  const utmData = safeJsonParse(safeStorageGet(window.localStorage, "utm_data"));
  const firstTouch = safeJsonParse(safeStorageGet(window.localStorage, FIRST_TOUCH_KEY));

  const rawReferrer = document.referrer || "";

  const queryAttribution = getQueryAttribution();
  const fromUtmStorage = utmData?.source || utmData?.medium
    ? {
        source: String(utmData.source || "direct").toLowerCase(),
        medium: String(utmData.medium || "direct").toLowerCase(),
        campaign: String(utmData.campaign || "none"),
        referrer: rawReferrer || "direct",
      }
    : null;

  const detectedCurrent = normalizeAttribution(
    queryAttribution
      ? { ...queryAttribution, referrer: rawReferrer || "direct" }
      : (fromUtmStorage || getReferrerAttribution(rawReferrer))
  );

  persistAttribution(detectedCurrent);

  const finalAttribution = firstTouch?.source
    ? normalizeAttribution(firstTouch)
    : detectedCurrent;

  return finalAttribution;
}

export function setTrackedStoreId(storeId) {
  if (typeof window === "undefined") return;
  const normalized = String(storeId || "").trim();
  if (!normalized) return;
  safeStorageSet(window.localStorage, LAST_STORE_KEY, normalized);
}

export function getTrackedStoreId() {
  if (typeof window === "undefined") return "";
  return String(safeStorageGet(window.localStorage, LAST_STORE_KEY) || "").trim();
}

export function setTrackedCustomerIdentity(identity) {
  if (typeof window === "undefined") return;

  const normalized = {
    customerName: String(identity?.customerName || "").trim(),
    customerEmail: String(identity?.customerEmail || "").trim().toLowerCase(),
    customerPhone: String(identity?.customerPhone || "").trim(),
    customerAddress: String(identity?.customerAddress || "").trim(),
  };

  if (!normalized.customerName && !normalized.customerEmail && !normalized.customerPhone && !normalized.customerAddress) {
    return;
  }

  safeStorageSet(window.localStorage, LAST_CUSTOMER_IDENTITY_KEY, JSON.stringify(normalized));
}

export function getTrackedCustomerIdentity() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(safeStorageGet(window.localStorage, LAST_CUSTOMER_IDENTITY_KEY));
}

export async function trackCustomerBehaviorEvent(payload) {
  if (!payload?.storeId || typeof window === "undefined") return;

  setTrackedStoreId(payload.storeId);

  const storedIdentity = getTrackedCustomerIdentity() || {};
  const mergedPayload = {
    ...payload,
    customerName: String(payload?.customerName || storedIdentity?.customerName || "").trim(),
    customerEmail: String(payload?.customerEmail || storedIdentity?.customerEmail || "").trim().toLowerCase(),
    customerPhone: String(payload?.customerPhone || storedIdentity?.customerPhone || "").trim(),
    customerAddress: String(payload?.customerAddress || storedIdentity?.customerAddress || "").trim(),
  };

  setTrackedCustomerIdentity(mergedPayload);

  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const attribution = detectTrafficSource();

  const body = {
    visitorId,
    sessionId,
    ...attribution,
    pagePath: window.location.pathname,
    eventAt: new Date().toISOString(),
    ...mergedPayload,
  };

  const endpoint = "/api/analytics/customer-behavior";

  try {
    if (navigator.sendBeacon && mergedPayload.useBeacon) {
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body),
    });
  } catch {
    // Ignore tracking failures to avoid impacting UX
  }
}
