import axios from 'axios';

const DEFAULT_INDIAPOST_BASE_URL = 'https://test.cept.gov.in/beextcustomer';
const DEFAULT_MASTERDATA_BASE_URL = 'https://test.cept.gov.in/bemasterdata';

let tokenCache = {
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: 0,
};

function getApiBaseUrl() {
  return (process.env.INDIAPOST_API_BASE_URL || DEFAULT_INDIAPOST_BASE_URL).replace(/\/$/, '');
}

function getMasterdataBaseUrl() {
  return (process.env.INDIAPOST_MASTERDATA_BASE_URL || DEFAULT_MASTERDATA_BASE_URL).replace(/\/$/, '');
}

function getCredentials() {
  const username = String(process.env.INDIAPOST_USERNAME || '').trim();
  const password = String(process.env.INDIAPOST_PASSWORD || '').trim();
  if (!username || !password) {
    throw new Error('India Post credentials are not configured. Set INDIAPOST_USERNAME and INDIAPOST_PASSWORD.');
  }
  return { username, password };
}

function normalizeTokenResponse(data) {
  const tokenData = data?.data || data || {};
  return {
    accessToken: tokenData.access_token || tokenData.accessToken || null,
    refreshToken: tokenData.refresh_token || tokenData.refreshToken || null,
    expiresIn: Number(tokenData.expires_in || tokenData.expiresIn || 0),
    refreshExpiresIn: Number(tokenData.refresh_expires_in || tokenData.refreshExpiresIn || 0),
  };
}

export async function loginIndiaPost() {
  const { username, password } = getCredentials();
  const url = `${getApiBaseUrl()}/v1/access/login`;
  const { data } = await axios.post(url, { username, password }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  const tokenPayload = normalizeTokenResponse(data);
  if (!tokenPayload.accessToken) {
    throw new Error('India Post login did not return an access token');
  }

  tokenCache = {
    accessToken: tokenPayload.accessToken,
    refreshToken: tokenPayload.refreshToken,
    accessTokenExpiresAt: Date.now() + Math.max(60, tokenPayload.expiresIn || 300) * 1000 - 15000,
  };

  return tokenPayload;
}

async function refreshIndiaPostAccessToken() {
  if (!tokenCache.refreshToken) {
    return loginIndiaPost();
  }

  const url = `${getApiBaseUrl()}/v1/access/TokenWithRtoken`;
  const form = new URLSearchParams();
  form.set('refreshToken', tokenCache.refreshToken);

  const { data } = await axios.post(url, form.toString(), {
    headers: {
      Authorization: `Bearer ${tokenCache.refreshToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 15000,
  });

  const refreshedAccessToken = data?.access_token || data?.data?.access_token;
  const expiresIn = Number(data?.expires_in || data?.data?.expires_in || 3600);

  if (!refreshedAccessToken) {
    return loginIndiaPost();
  }

  tokenCache.accessToken = refreshedAccessToken;
  tokenCache.accessTokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000 - 15000;

  return {
    accessToken: tokenCache.accessToken,
    refreshToken: tokenCache.refreshToken,
    expiresIn,
    refreshExpiresIn: 0,
  };
}

export async function getIndiaPostAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.accessTokenExpiresAt) {
    return tokenCache.accessToken;
  }

  try {
    if (tokenCache.refreshToken) {
      await refreshIndiaPostAccessToken();
    } else {
      await loginIndiaPost();
    }
    return tokenCache.accessToken;
  } catch {
    const tokens = await loginIndiaPost();
    return tokens.accessToken;
  }
}

export async function indiaPostRequest({ method = 'GET', path, params, data, headers = {}, responseType = 'json', base = 'api' }) {
  const token = await getIndiaPostAccessToken();
  const baseUrl = base === 'masterdata' ? getMasterdataBaseUrl() : getApiBaseUrl();
  const cleanPath = String(path || '').startsWith('/') ? path : `/${String(path || '')}`;
  const url = `${baseUrl}${cleanPath}`;

  const response = await axios({
    method,
    url,
    params,
    data,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: responseType === 'json' ? 'application/json' : '*/*',
      ...headers,
    },
    timeout: 30000,
    responseType,
  });

  return response.data;
}

export async function getIndiaPostSpeedPostTariff(query) {
  return indiaPostRequest({ method: 'GET', path: '/v1/speed-post/tariffs', params: query });
}

export async function getIndiaPostBusinessParcelTariff(query) {
  return indiaPostRequest({ method: 'GET', path: '/v1/business-parcel-tariff/calculate', params: query });
}

export async function searchIndiaPostOffices({ pincode, limit = 50, officeType = '' }) {
  const params = {
    pincode,
    limit,
  };

  // When officeType is omitted, fetch all office types for broader pincode coverage.
  if (String(officeType || '').trim()) {
    params['office-type'] = String(officeType).trim();
  }

  return indiaPostRequest({
    method: 'GET',
    path: '/v1/offices/limited-details',
    params,
    base: 'masterdata',
  });
}

export async function processIndiaPostArticles(customId, payload) {
  return indiaPostRequest({ method: 'POST', path: `/process-articles/${encodeURIComponent(customId)}`, data: payload });
}

export async function processIndiaPostArticlesFile(customId, fileBlob, fileName = 'articles.json') {
  const token = await getIndiaPostAccessToken();
  const formData = new FormData();
  formData.append('file', fileBlob, fileName);

  const response = await fetch(`${getApiBaseUrl()}/process-articles-file/${encodeURIComponent(customId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  const parsed = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  })();

  if (!response.ok) {
    throw new Error(parsed?.message || `India Post booking-file failed with status ${response.status}`);
  }

  return parsed;
}

export async function downloadIndiaPostEvents(payload) {
  return indiaPostRequest({
    method: 'POST',
    path: '/v1/event/download',
    data: payload,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'text',
  });
}

export async function trackIndiaPostBulk(articleNumbers) {
  return indiaPostRequest({
    method: 'POST',
    path: '/v1/tracking/bulk',
    data: { bulk: articleNumbers },
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function generateIndiaPostDomesticLabel(payload) {
  return indiaPostRequest({
    method: 'POST',
    path: '/v1/label/create/domestic',
    data: payload,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'arraybuffer',
  });
}

export function normalizeIndiaPostTracking(payload, articleNumber) {
  const list = Array.isArray(payload?.data) ? payload.data : [];
  const item = list.find((entry) => entry?.booking_details?.article_number === articleNumber) || list[0];
  if (!item) return null;

  const trackingEvents = Array.isArray(item?.tracking_details) ? item.tracking_details : [];
  const latestEvent = trackingEvents[trackingEvents.length - 1] || null;

  return {
    courier: 'India Post',
    trackingId: item?.booking_details?.article_number || articleNumber,
    trackingUrl: '',
    indiapost: {
      booking_details: item?.booking_details || {},
      tracking_details: trackingEvents,
      del_status: item?.del_status || {},
      current_status: latestEvent?.event || item?.del_status?.del_status || '',
      current_status_time: latestEvent ? `${latestEvent.date || ''} ${latestEvent.time || ''}`.trim() : '',
      current_status_location: latestEvent?.office || '',
    },
  };
}

export async function fetchNormalizedIndiaPostTracking(articleNumber) {
  const payload = await trackIndiaPostBulk([articleNumber]);
  return normalizeIndiaPostTracking(payload, articleNumber);
}
