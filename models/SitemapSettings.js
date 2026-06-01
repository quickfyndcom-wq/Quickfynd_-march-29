import mongoose from 'mongoose';

const SitemapSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: false
    },
    categories: [
      {
        name: {
          type: String,
          required: true
        },
        text: {
          type: String,
          required: true
        },
        url: {
          type: String,
          required: true
        },
        image: {
          type: String,
          required: false
        },
        isExisting: {
          type: Boolean,
          default: false
        },
        categoryId: {
          type: String,
          required: false
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.SitemapSettings ||
  mongoose.model('SitemapSettings', SitemapSettingsSchema);
