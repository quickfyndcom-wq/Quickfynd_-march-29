import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import User from '@/models/User';

const DEFAULTS = {
  codeLength: 6,
  ttlSec: 300,
  resendCooldownSec: 60,
  maxAttempts: 5,
  dailyLimitPerPhone: 10,
  hourlyLimitPerIp: 30,
  hourlyLimitPerDevice: 20,
  hourlyLimitPerPhoneIp: 10,
};

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOtpConfig() {
  return {
    provider: (process.env.OTP_PROVIDER || (process.env.NODE_ENV === 'production' ? 'twilio' : 'mock')).trim().toLowerCase(),
    codeLength: parsePositiveInt(process.env.OTP_CODE_LENGTH, DEFAULTS.codeLength),
    ttlSec: parsePositiveInt(process.env.OTP_TTL_SEC, DEFAULTS.ttlSec),
    resendCooldownSec: parsePositiveInt(process.env.OTP_RESEND_COOLDOWN_SEC, DEFAULTS.resendCooldownSec),
    maxAttempts: parsePositiveInt(process.env.OTP_MAX_ATTEMPTS, DEFAULTS.maxAttempts),
    dailyLimitPerPhone: parsePositiveInt(process.env.OTP_DAILY_LIMIT_PER_PHONE, DEFAULTS.dailyLimitPerPhone),
    hourlyLimitPerIp: parsePositiveInt(process.env.OTP_HOURLY_LIMIT_PER_IP, DEFAULTS.hourlyLimitPerIp),
    hourlyLimitPerDevice: parsePositiveInt(process.env.OTP_HOURLY_LIMIT_PER_DEVICE, DEFAULTS.hourlyLimitPerDevice),
    hourlyLimitPerPhoneIp: parsePositiveInt(process.env.OTP_HOURLY_LIMIT_PER_PHONE_IP, DEFAULTS.hourlyLimitPerPhoneIp),
    hmacSecret: String(process.env.OTP_HMAC_SECRET || '').trim(),
    testCode: String(process.env.OTP_TEST_CODE || '').trim(),
  };
}

export function normalizePhoneE164(phone) {
  const raw = String(phone || '').trim();
  if (!raw) {
    throw new Error('Phone number is required');
  }

  const compact = raw.replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Invalid phone number. Use E.164 format.');
  }

  return normalized;
}

export function maskPhone(phoneE164) {
  const visibleDigits = phoneE164.replace(/\D/g, '');
  const last4 = visibleDigits.slice(-4);
  const prefix = phoneE164.startsWith('+') ? `+${visibleDigits.slice(0, Math.max(visibleDigits.length - 10, 2))}` : '';
  return `${prefix}${prefix ? '' : '+'}${'*'.repeat(Math.max(0, visibleDigits.length - last4.length - (prefix ? prefix.replace(/\D/g, '').length : 0)))}${last4}`;
}

export function buildPhoneUid(phoneE164) {
  return `phone:${phoneE164}`;
}

export function buildDefaultUserName(phoneE164) {
  return `User ${phoneE164.replace(/\D/g, '').slice(-4)}`;
}

export function createChallengeId() {
  return `otp_ch_${randomUUID().replace(/-/g, '')}`;
}

export function generateOtpCode() {
  const { codeLength, testCode, provider } = getOtpConfig();
  if (provider === 'mock' && testCode) {
    return testCode.padStart(codeLength, '0').slice(-codeLength);
  }

  const min = 10 ** (codeLength - 1);
  const max = 10 ** codeLength;
  return String(randomInt(min, max));
}

export function hashOtpCode(challengeId, otp) {
  const { hmacSecret } = getOtpConfig();
  if (!hmacSecret) {
    throw new Error('OTP_HMAC_SECRET is not configured');
  }

  return createHmac('sha256', hmacSecret).update(`${challengeId}:${otp}`).digest('hex');
}

export function verifyOtpCode(challengeId, otp, expectedHash) {
  const actualHash = hashOtpCode(challengeId, otp);
  const actualBuffer = Buffer.from(actualHash, 'hex');
  const expectedBuffer = Buffer.from(String(expectedHash || ''), 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export function getRetryAfterSec(date) {
  const diffMs = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

export function isOtpFormatValid(otp) {
  const { codeLength } = getOtpConfig();
  return new RegExp(`^\\d{${codeLength}}$`).test(String(otp || '').trim());
}

export function getOtpMessage(otp) {
  const { ttlSec } = getOtpConfig();
  const ttlMinutes = Math.max(1, Math.ceil(ttlSec / 60));
  return `Your Quickfynd verification code is ${otp}. It expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}.`;
}

async function sendViaTwilio(phoneE164, otp) {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  const from = String(process.env.TWILIO_PHONE_NUMBER || '').trim();

  if (!accountSid || !authToken || (!messagingServiceSid && !from)) {
    const error = new Error('Twilio OTP provider is not fully configured');
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }

  const body = new URLSearchParams({
    To: phoneE164,
    Body: getOtpMessage(otp),
  });

  if (messagingServiceSid) {
    body.set('MessagingServiceSid', messagingServiceSid);
  } else {
    body.set('From', from);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || 'Twilio OTP send failed');
    error.code = 'OTP_SEND_FAILED';
    throw error;
  }

  return {
    provider: 'twilio',
    providerMessageId: payload.sid || null,
  };
}

async function sendViaWebhook(phoneE164, otp) {
  const webhookUrl = String(process.env.OTP_PROVIDER_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    const error = new Error('OTP_PROVIDER_WEBHOOK_URL is not configured');
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OTP_PROVIDER_WEBHOOK_AUTH_TOKEN
        ? { Authorization: `Bearer ${process.env.OTP_PROVIDER_WEBHOOK_AUTH_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      phone: phoneE164,
      message: getOtpMessage(otp),
      otpLength: getOtpConfig().codeLength,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || 'OTP provider webhook failed');
    error.code = 'OTP_SEND_FAILED';
    throw error;
  }

  return {
    provider: 'webhook',
    providerMessageId: payload?.messageId || payload?.id || null,
  };
}

async function sendViaMock() {
  return {
    provider: 'mock',
    providerMessageId: `mock_${Date.now()}`,
  };
}

export async function sendOtpWithProvider(phoneE164, otp) {
  const { provider } = getOtpConfig();

  switch (provider) {
    case 'twilio':
      return sendViaTwilio(phoneE164, otp);
    case 'webhook':
      return sendViaWebhook(phoneE164, otp);
    case 'mock':
      return sendViaMock();
    default: {
      const error = new Error(`Unsupported OTP provider: ${provider}`);
      error.code = 'SERVICE_UNAVAILABLE';
      throw error;
    }
  }
}

export async function findOrCreateOtpUser(phoneE164) {
  const fallbackUid = buildPhoneUid(phoneE164);
  const existingUser = await User.findOne({
    $or: [
      { _id: fallbackUid },
      { firebaseUid: fallbackUid },
      { phone: phoneE164 },
    ],
  }).lean();

  const uid = existingUser?.firebaseUid || existingUser?._id || fallbackUid;
  const isNewUser = !existingUser;
  const defaultName = buildDefaultUserName(phoneE164);

  const user = await User.findOneAndUpdate(
    { _id: uid },
    {
      $setOnInsert: {
        _id: uid,
        firebaseUid: uid,
        phone: phoneE164,
        name: existingUser?.name || defaultName,
      },
      $set: {
        firebaseUid: uid,
        phone: phoneE164,
        ...(existingUser?.name ? {} : { name: defaultName }),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    user,
    uid,
    isNewUser,
  };
}

export function otpError(code, message, status, extra = {}) {
  return {
    success: false,
    code,
    message,
    status,
    extra,
  };
}
