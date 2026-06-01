import mongoose from 'mongoose';

const FeaturedSectionSchema = new mongoose.Schema(
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
    productIds: {
      type: [String],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

// Create compound index for efficient querying
FeaturedSectionSchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.models.FeaturedSection ||
  mongoose.model('FeaturedSection', FeaturedSectionSchema);
