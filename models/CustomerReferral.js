import mongoose from 'mongoose';

const CustomerReferralSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true },
    inviterUserId: { type: String, required: true },
    invitedUserId: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    rewardedAt: { type: Date, default: null },
    rewardCoins: { type: Number, default: 0 },
    rewardedOrderId: { type: String, default: null },
  },
  { timestamps: true }
);

// Unique: one referral link per invited customer per store
CustomerReferralSchema.index({ storeId: 1, invitedUserId: 1 }, { unique: true });
// Covering index for DELIVERED order reward query
CustomerReferralSchema.index({ storeId: 1, invitedUserId: 1, rewardedAt: 1 });
// For listing referrals by inviter
CustomerReferralSchema.index({ storeId: 1, inviterUserId: 1 });

export default mongoose.models.CustomerReferral ||
  mongoose.model('CustomerReferral', CustomerReferralSchema);
