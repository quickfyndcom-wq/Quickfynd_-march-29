import mongoose from 'mongoose';

const HomeCategorySettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true
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
          required: true
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

export default mongoose.models.HomeCategorySettings ||
  mongoose.model('HomeCategorySettings', HomeCategorySettingsSchema);
