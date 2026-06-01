import mongoose from 'mongoose';

const ReferralProgramSettingsSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    inviterRewardCoins: { type: Number, default: 25, min: 0, max: 100000 },
  },
  { timestamps: true }
);

export default mongoose.models.ReferralProgramSettings ||
  mongoose.model('ReferralProgramSettings', ReferralProgramSettingsSchema);
