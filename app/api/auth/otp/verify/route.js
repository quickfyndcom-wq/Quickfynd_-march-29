import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import OtpChallenge from '@/models/OtpChallenge';
import {
  findOrCreateOtpUser,
  getOtpConfig,
  getRetryAfterSec,
  isOtpFormatValid,
  verifyOtpCode,
} from '@/lib/otp';

function errorResponse(code, message, status, extra = {}) {
  return NextResponse.json({ success: false, code, message, ...extra }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const challengeId = String(body?.challengeId || '').trim();
    const otp = String(body?.otp || '').trim();
    const deviceId = String(body?.deviceId || '').trim();
    const config = getOtpConfig();

    if (!challengeId) {
      return errorResponse('CHALLENGE_NOT_FOUND', 'Challenge not found.', 404);
    }

    if (!isOtpFormatValid(otp)) {
      return errorResponse('OTP_INVALID', 'Incorrect OTP.', 400);
    }

    if (!config.hmacSecret) {
      return errorResponse('SERVICE_UNAVAILABLE', 'OTP service is not configured.', 503);
    }

    await dbConnect();

    const challenge = await OtpChallenge.findById(challengeId);
    if (!challenge) {
      return errorResponse('CHALLENGE_NOT_FOUND', 'Challenge not found.', 404);
    }

    const now = new Date();

    if (challenge.status === 'verified') {
      return errorResponse('CHALLENGE_ALREADY_USED', 'OTP already used.', 409);
    }

    if (challenge.status === 'blocked') {
      return errorResponse('OTP_MAX_ATTEMPTS', 'Too many wrong attempts. Request a new OTP.', 429, {
        retryAfterSec: getRetryAfterSec(challenge.expiresAt),
      });
    }

    if (challenge.status === 'failed') {
      return errorResponse('SERVICE_UNAVAILABLE', 'OTP service is unavailable.', 503);
    }

    if (challenge.expiresAt <= now || challenge.status === 'expired') {
      if (challenge.status !== 'expired') {
        challenge.status = 'expired';
        await challenge.save();
      }
      return errorResponse('OTP_EXPIRED', 'OTP expired. Please resend.', 410);
    }

    if (challenge.deviceId && deviceId && challenge.deviceId !== deviceId) {
      return errorResponse('OTP_INVALID', 'Incorrect OTP.', 400);
    }

    const isMatch = verifyOtpCode(challenge._id, otp, challenge.otpHash);
    if (!isMatch) {
      challenge.attemptCount += 1;
      if (challenge.attemptCount >= challenge.maxAttempts) {
        challenge.status = 'blocked';
      }
      await challenge.save();

      if (challenge.status === 'blocked') {
        return errorResponse('OTP_MAX_ATTEMPTS', 'Too many wrong attempts. Request a new OTP.', 429, {
          retryAfterSec: config.ttlSec,
        });
      }

      return errorResponse('OTP_INVALID', 'Incorrect OTP.', 400);
    }

    const updateResult = await OtpChallenge.updateOne(
      { _id: challengeId, status: 'pending' },
      {
        $set: {
          status: 'verified',
          verifiedAt: now,
        },
      }
    );

    if (!updateResult.modifiedCount) {
      return errorResponse('CHALLENGE_ALREADY_USED', 'OTP already used.', 409);
    }

    const { user, uid, isNewUser } = await findOrCreateOtpUser(challenge.phoneE164);
    const firebaseCustomToken = await getAuth().createCustomToken(uid, {
      signInProvider: 'custom-otp',
      phoneNumber: challenge.phoneE164,
    });

    return NextResponse.json({
      success: true,
      firebaseCustomToken,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        isNewUser,
      },
    });
  } catch (error) {
    console.error('[OTP verify] error:', error?.message || error);
    return errorResponse('SERVICE_UNAVAILABLE', 'OTP service is unavailable.', 503);
  }
}
