import mongoose from 'mongoose';

const SpinSliceSchema = new mongoose.Schema({
  label: { type: String, required: true },       // e.g. "10% Off"
  weight: { type: Number, required: true, min: 0 }, // probability weight (all slices sum interpreted proportionally)
  rewardType: {
    type: String,
    enum: ['coupon_percent', 'coupon_flat', 'free_shipping', 'no_win'],
    default: 'no_win',
  },
  discountValue: { type: Number, default: 0 },   // 10 for 10% or 50 for ₹50
  minOrderValue: { type: Number, default: 0 },   // min order to redeem
  expiryHours: { type: Number, default: 48 },    // hours until coupon expires
  color: { type: String, default: '#6366f1' },   // hex color for wheel slice
}, { _id: false });

const SpinCampaignSchema = new mongoose.Schema({
  storeId: { type: String, required: true, unique: true },
  isEnabled: { type: Boolean, default: false },
  campaignName: { type: String, default: 'Spin & Win' },
  couponPrefix: { type: String, default: 'SPIN', uppercase: true }, // generated codes: SPIN-XXXXX
  dailySpinLimit: { type: Number, default: 1 }, // spins per user per day
  slices: { type: [SpinSliceSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.SpinCampaign || mongoose.model('SpinCampaign', SpinCampaignSchema);
