import mongoose from 'mongoose';

const SpinLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  storeId: { type: String, required: true },
  spinDate: { type: String, required: true }, // YYYY-MM-DD for daily limit check
  rewardType: { type: String, required: true },
  couponCode: { type: String, default: null },
  sliceLabel: { type: String },
}, { timestamps: true });

SpinLogSchema.index({ userId: 1, storeId: 1, spinDate: 1 });

export default mongoose.models.SpinLog || mongoose.model('SpinLog', SpinLogSchema);
