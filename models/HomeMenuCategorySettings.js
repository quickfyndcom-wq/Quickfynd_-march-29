import mongoose from 'mongoose';

const HomeMenuCategorySettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 6,
    },
    items: [
      {
        name: { type: String, required: true },
        image: { type: String, required: true },
        url: { type: String, default: null },
        categoryId: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.HomeMenuCategorySettings ||
  mongoose.model('HomeMenuCategorySettings', HomeMenuCategorySettingsSchema);
