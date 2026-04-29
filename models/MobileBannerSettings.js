import mongoose from 'mongoose';

const MobileBannerSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    link: { type: String, default: '/offers', trim: true },
    title: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const MobileBannerSettingsSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    slides: { type: [MobileBannerSlideSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.MobileBannerSettings ||
  mongoose.model('MobileBannerSettings', MobileBannerSettingsSchema);
