/**
 * 17track API v2.4 integration.
 * API key: https://api.17track.net
 * Add SEVENTEENTRACK_API_KEY to your .env file.
 */

const SEVENTEEN_TRACK_BASE = 'https://api.17track.net/track/v2.4';

const STATUS_TO_CODE = {
  NotFound: 0,
  InfoReceived: 10,
  InTransit: 10,
  Expired: 20,
  AvailableForPickup: 10,
  OutForDelivery: 10,
  DeliveryFailure: 30,
  Delivered: 40,
  Exception: 70,
};

const STATUS_LABEL_MAP = {
  NotFound: 'Not Found',
  InfoReceived: 'Info Received',
  InTransit: 'In Transit',
  Expired: 'Expired',
  AvailableForPickup: 'Available For Pickup',
  OutForDelivery: 'Out For Delivery',
  DeliveryFailure: 'Delivery Failure',
  Delivered: 'Delivered',
  Exception: 'Exception',
};

const LEGACY_CODE_TO_LABEL = {
  0: 'Not Found',
  10: 'In Transit',
  20: 'Expired',
  30: 'Delivery Exception',
  40: 'Delivered',
  50: 'Undelivered',
  60: 'Pickup Failed',
  70: 'Returned',
  80: 'Return Received',
};

const normalizeBaseUrl = (input) => {
  const fallback = SEVENTEEN_TRACK_BASE;
  const value = String(input || '').trim();
  if (!value) return fallback;
  return value.replace(/\/+$/, '');
};

function toDisplayTime(eventLike = {}) {
  if (eventLike?.time_raw?.date || eventLike?.time_raw?.time) {
    return `${eventLike.time_raw.date || ''} ${eventLike.time_raw.time || ''}`.trim();
  }
  if (eventLike?.time_iso) return String(eventLike.time_iso);
  if (eventLike?.time_utc) return String(eventLike.time_utc);
  return '';
}

function toEventTimestamp(eventLike = {}) {
  const raw = eventLike?.time_utc || eventLike?.time_iso;
  if (raw) {
    const ms = Date.parse(String(raw));
    if (!Number.isNaN(ms)) return ms;
  }
  const display = toDisplayTime(eventLike);
  if (display) {
    const ms = Date.parse(display);
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

function normalizeProviderEvent(evt) {
  if (!evt) return null;
  return {
    time: toDisplayTime(evt),
    description: evt.description || evt.description_translation?.description || '',
    location: evt.location || evt.address?.city || evt.address?.state || evt.address?.country || '',
    country: evt.address?.country || '',
    stage: evt.stage || '',
    subStatus: evt.sub_status || '',
    _ts: toEventTimestamp(evt),
  };
}

function mapStatusToCode(status = '', subStatus = '') {
  if (!status) return 0;
  if (status === 'Exception' && /returned/i.test(String(subStatus))) return 70;
  return STATUS_TO_CODE[status] ?? 10;
}

async function post17Track(path, payload, { baseUrl, token }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      '17token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`17track API error: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(`17track API returned code ${json.code}`);
  }
  return json;
}

async function registerIfNeeded(awbTrim, apiConfig) {
  try {
    await post17Track('/register', [{ number: awbTrim }], apiConfig);
  } catch (err) {
    // -18019901: already registered; safe to continue.
    const message = String(err?.message || '');
    if (!message.includes('-18019901')) {
      // Registration may fail for some carriers/quotas; still try gettrackinfo.
      console.error('17track register warning:', message);
    }
  }
}

/**
 * Fetch live tracking info for a single AWB from 17track.
 * Returns normalized object or null if API key missing / not found.
 */
export async function fetchSeventeenTrackInfo(awb, configOverride = '') {
  const config = typeof configOverride === 'string'
    ? { apiKey: configOverride }
    : (configOverride || {});

  const apiKey = String(config.apiKey || process.env.SEVENTEENTRACK_API_KEY || '').trim();
  const publicKey = String(config.publicKey || '').trim();
  const secretKey = String(config.secretKey || '').trim();
  const token = apiKey || secretKey || publicKey;
  if (!token) return null;

  const baseUrl = normalizeBaseUrl(config.baseUrl || process.env.SEVENTEENTRACK_API_URL);

  const awbTrim = (awb || '').trim();
  if (!awbTrim) return null;

  const apiConfig = { baseUrl, token };

  // V2.4 best practice: register first, then fetch details.
  await registerIfNeeded(awbTrim, apiConfig);

  const json = await post17Track('/gettrackinfo', [{ number: awbTrim }], apiConfig);

  const accepted = json?.data?.accepted;
  if (!Array.isArray(accepted) || accepted.length === 0) return null;

  const item = accepted[0];
  const trackInfo = item?.track_info;

  // Backward compatibility for legacy v2.2 response shape.
  if (!trackInfo && item?.track) {
    const track = item.track;
    const statusCode = track.e ?? 0;
    const latestEvent = {
      time: track?.z0?.a || '',
      description: track?.z0?.z || '',
      location: track?.z0?.c || '',
      country: track?.z0?.d || '',
    };
    const events = Array.isArray(track?.z1)
      ? track.z1.map((evt) => ({
          time: evt?.a || '',
          description: evt?.z || '',
          location: evt?.c || '',
          country: evt?.d || '',
        })).filter(Boolean)
      : (latestEvent.time || latestEvent.description || latestEvent.location ? [latestEvent] : []);

    const isDelivered = statusCode === 40;
    return {
      awb: awbTrim,
      statusCode,
      statusLabel: LEGACY_CODE_TO_LABEL[statusCode] || 'In Transit',
      isDelivered,
      latestEvent,
      events,
      deliveredAt: isDelivered ? latestEvent.time : null,
      currentLocation: latestEvent.location || null,
      providerTips: null,
      source: '17track-v2.2',
    };
  }

  if (!trackInfo) return null;

  const latestStatus = trackInfo?.latest_status || {};
  const mainStatus = String(latestStatus.status || 'NotFound');
  const subStatus = String(latestStatus.sub_status || '');

  const providers = Array.isArray(trackInfo?.tracking?.providers) ? trackInfo.tracking.providers : [];
  const providerWithMostEvents = providers
    .slice()
    .sort((a, b) => (Array.isArray(b?.events) ? b.events.length : 0) - (Array.isArray(a?.events) ? a.events.length : 0))[0] || null;

  const providerEvents = Array.isArray(providerWithMostEvents?.events)
    ? providerWithMostEvents.events
    : [];

  const normalizedEvents = providerEvents
    .map(normalizeProviderEvent)
    .filter((evt) => evt && (evt.time || evt.description || evt.location));

  // Dedupe and keep newest first.
  const deduped = [];
  const seen = new Set();
  for (const evt of normalizedEvents) {
    const key = `${evt.time}|${evt.description}|${evt.location}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(evt);
  }
  deduped.sort((a, b) => (b._ts || 0) - (a._ts || 0));

  const events = deduped.map(({ _ts, ...evt }) => evt);

  const latestEvent = {
    time: toDisplayTime(trackInfo?.latest_event || {}),
    description: trackInfo?.latest_event?.description || trackInfo?.latest_event?.description_translation?.description || '',
    location: trackInfo?.latest_event?.location || trackInfo?.latest_event?.address?.city || '',
    country: trackInfo?.latest_event?.address?.country || '',
  };

  const statusCode = mapStatusToCode(mainStatus, subStatus);
  const statusLabel = STATUS_LABEL_MAP[mainStatus] || 'In Transit';
  const isDelivered = mainStatus === 'Delivered' || subStatus === 'Delivered_Other';

  let deliveredAt = null;
  if (isDelivered) {
    deliveredAt = toDisplayTime(trackInfo?.latest_event || {});
    if (!deliveredAt && Array.isArray(trackInfo?.milestone)) {
      const deliveredMilestone = trackInfo.milestone.find((m) => m?.key_stage === 'Delivered');
      deliveredAt = toDisplayTime(deliveredMilestone || {});
    }
  }

  const currentLocation = latestEvent.location
    || events[0]?.location
    || trackInfo?.shipping_info?.recipient_address?.city
    || null;

  const providerTips = providerWithMostEvents?.provider_tips || null;

  return {
    awb: awbTrim,
    statusCode,
    statusLabel,
    isDelivered,
    latestEvent,
    events,
    deliveredAt,
    currentLocation,
    providerTips,
    source: '17track-v2.4',
  };
}
