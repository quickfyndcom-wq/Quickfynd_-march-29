import mongoose from 'mongoose';

const ReferralCodeSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true },
    userId: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

// Lookup by user (get my code) — also prevents duplicate
ReferralCodeSchema.index({ storeId: 1, userId: 1 }, { unique: true });
// Lookup by code (resolve who invited) — also prevents duplicate
ReferralCodeSchema.index({ storeId: 1, code: 1 }, { unique: true });

export default mongoose.models.ReferralCode ||
  mongoose.model('ReferralCode', ReferralCodeSchema);
