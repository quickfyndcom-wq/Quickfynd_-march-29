import mongoose from 'mongoose';

const CategorySliderSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    productIds: {
      type: [String],
      required: true,
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create compound index for efficient querying
CategorySliderSchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.models.CategorySlider ||
  mongoose.model('CategorySlider', CategorySliderSchema);
