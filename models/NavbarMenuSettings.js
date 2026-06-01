import mongoose from 'mongoose';

const NavbarMenuSettingsSchema = new mongoose.Schema(
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
    items: [
      {
        label: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        categoryId: {
          type: String,
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.NavbarMenuSettings ||
  mongoose.model('NavbarMenuSettings', NavbarMenuSettingsSchema);
