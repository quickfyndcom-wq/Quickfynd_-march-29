import mongoose from 'mongoose';

const OtpChallengeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    phoneE164: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    resendAvailableAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    deleteAt: { type: Date, required: true },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'blocked', 'failed'],
      default: 'pending',
      index: true,
    },
    ip: { type: String, default: '' },
    deviceId: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    channel: { type: String, default: 'sms' },
    provider: { type: String, default: '' },
    providerMessageId: { type: String, default: null },
    lastErrorCode: { type: String, default: null },
  },
  {
    versionKey: false,
  }
);

OtpChallengeSchema.index({ phoneE164: 1, createdAt: -1 });
OtpChallengeSchema.index({ status: 1, expiresAt: 1 });
OtpChallengeSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OtpChallenge || mongoose.model('OtpChallenge', OtpChallengeSchema);
