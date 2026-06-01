import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import OtpChallenge from '@/models/OtpChallenge';
import {
  createChallengeId,
  generateOtpCode,
  getClientIp,
  getOtpConfig,
  getRetryAfterSec,
  hashOtpCode,
  maskPhone,
  normalizePhoneE164,
  sendOtpWithProvider,
} from '@/lib/otp';

function errorResponse(code, message, status, extra = {}) {
  return NextResponse.json({ success: false, code, message, ...extra }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const channel = String(body?.channel || 'sms').trim().toLowerCase();
    if (channel !== 'sms') {
      return errorResponse('INVALID_CHANNEL', 'Only SMS OTP is supported.', 400);
    }

    let phoneE164;
    try {
      phoneE164 = normalizePhoneE164(body?.phone);
    } catch {
      return errorResponse('INVALID_PHONE', 'Invalid phone number.', 400);
    }

    const deviceId = String(body?.deviceId || '').trim();
    const appVersion = String(body?.appVersion || '').trim();
    const countryCode = String(body?.countryCode || '').trim().toUpperCase();
    const ip = getClientIp(request);
    const config = getOtpConfig();

    if (!config.hmacSecret) {
      return errorResponse('SERVICE_UNAVAILABLE', 'OTP service is not configured.', 503);
    }

    await dbConnect();

    const now = new Date();
    const phoneDailyWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const burstWindow = new Date(now.getTime() - 60 * 60 * 1000);

    const [latestPhoneChallenge, phoneDailyCount, ipHourlyCount, deviceHourlyCount, phoneIpHourlyCount] = await Promise.all([
      OtpChallenge.findOne({ phoneE164 }).sort({ createdAt: -1 }).lean(),
      OtpChallenge.countDocuments({ phoneE164, createdAt: { $gte: phoneDailyWindow } }),
      OtpChallenge.countDocuments({ ip, createdAt: { $gte: burstWindow } }),
      deviceId ? OtpChallenge.countDocuments({ deviceId, createdAt: { $gte: burstWindow } }) : Promise.resolve(0),
      ip !== 'unknown'
        ? OtpChallenge.countDocuments({ phoneE164, ip, createdAt: { $gte: burstWindow } })
        : Promise.resolve(0),
    ]);

    if (latestPhoneChallenge?.resendAvailableAt && new Date(latestPhoneChallenge.resendAvailableAt) > now) {
      return errorResponse('RATE_LIMITED', 'Too many attempts. Try again later.', 429, {
        retryAfterSec: getRetryAfterSec(latestPhoneChallenge.resendAvailableAt),
      });
    }

    if (phoneDailyCount >= config.dailyLimitPerPhone || ipHourlyCount >= config.hourlyLimitPerIp || deviceHourlyCount >= config.hourlyLimitPerDevice || phoneIpHourlyCount >= config.hourlyLimitPerPhoneIp) {
      return errorResponse('RATE_LIMITED', 'Too many attempts. Try again later.', 429, {
        retryAfterSec: config.resendCooldownSec,
      });
    }

    const challengeId = createChallengeId();
    const otp = generateOtpCode();
    const createdAt = now;
    const expiresAt = new Date(now.getTime() + config.ttlSec * 1000);
    const resendAvailableAt = new Date(now.getTime() + config.resendCooldownSec * 1000);
    const deleteAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await OtpChallenge.create({
      _id: challengeId,
      phoneE164,
      otpHash: hashOtpCode(challengeId, otp),
      createdAt,
      expiresAt,
      resendAvailableAt,
      deleteAt,
      attemptCount: 0,
      maxAttempts: config.maxAttempts,
      status: 'pending',
      ip,
      deviceId,
      appVersion,
      countryCode,
      channel,
      provider: config.provider,
    });

    try {
      const providerResult = await sendOtpWithProvider(phoneE164, otp);
      await OtpChallenge.findByIdAndUpdate(challengeId, {
        $set: {
          provider: providerResult.provider,
          providerMessageId: providerResult.providerMessageId,
        },
      });
    } catch (providerError) {
      await OtpChallenge.findByIdAndUpdate(challengeId, {
        $set: {
          status: 'failed',
          lastErrorCode: providerError?.code || 'OTP_SEND_FAILED',
        },
      });

      return errorResponse(
        providerError?.code === 'SERVICE_UNAVAILABLE' ? 'SERVICE_UNAVAILABLE' : 'OTP_SEND_FAILED',
        providerError?.code === 'SERVICE_UNAVAILABLE' ? 'OTP service is unavailable.' : 'Failed to send OTP.',
        providerError?.code === 'SERVICE_UNAVAILABLE' ? 503 : 502
      );
    }

    return NextResponse.json({
      success: true,
      challengeId,
      expiresInSec: config.ttlSec,
      resendAfterSec: config.resendCooldownSec,
      maskedDestination: maskPhone(phoneE164),
    });
  } catch (error) {
    console.error('[OTP send] error:', error?.message || error);
    return errorResponse('SERVICE_UNAVAILABLE', 'OTP service is unavailable.', 503);
  }
}
