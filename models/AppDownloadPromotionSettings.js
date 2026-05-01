import mongoose from 'mongoose';

const AppDownloadPromotionSettingsSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.AppDownloadPromotionSettings ||
  mongoose.model('AppDownloadPromotionSettings', AppDownloadPromotionSettingsSchema);