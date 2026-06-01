import mongoose from 'mongoose';

const HeroSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    link: { type: String, default: '/offers', trim: true },
    bg: { type: String, required: true, trim: true, default: '#7A0A11' },
  },
  { _id: false }
);

const HeroSliderSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    slides: {
      type: [HeroSlideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.HeroSliderSettings ||
  mongoose.model('HeroSliderSettings', HeroSliderSettingsSchema);