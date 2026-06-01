import mongoose from "mongoose";

const StoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  email: String,
  contact: String,
  address: String,
  returnAddress: String, // Return/warehouse address for AWB
  gst: String, // GST number
  customerId: String, // Customer/Contract ID
  logo: String,
  banner: String,
  website: String,
  facebook: String,
  instagram: String,
  twitter: String,
  businessHours: String,
  returnPolicy: String,
  shippingPolicy: String,
  // Optional seller contract IDs (e.g., courier/account contracts).
  // Stored as array of objects: { key: 'contract_a', label: 'Contract A', id: '...'}
  contractIds: { type: [{ key: String, label: String, id: String }], default: [] },
  identityDocuments: {
    type: [{
      url: String,
      fileName: String,
      mimeType: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  isActive: { type: Boolean, default: false },
  isPrimary: { type: Boolean, default: false },
  status: { type: String, default: "pending", enum: ["pending", "approved", "rejected"] },
  featuredProductIds: { type: [String], default: [] }, // Array of featured product IDs
  carouselProductIds: { type: [String], default: [] }, // Array of product IDs for carousel slider
  homeMenuCategories: {
    count: { type: Number, default: 6 },
    items: [
      {
        name: String,
        image: String,
        url: String,
        categoryId: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  integrations: {
    seventeentrack: {
      // Hidden by default from regular store fetches.
      baseUrl: { type: String, default: '', select: false },
      apiKey: { type: String, default: '', select: false },
      publicKey: { type: String, default: '', select: false },
      secretKey: { type: String, default: '', select: false },
    },
  },
}, { timestamps: true });

// username already has unique index via schema field definition
StoreSchema.index({ userId: 1 });
StoreSchema.index({ isPrimary: 1 });

const StoreModel = mongoose.models.Store || mongoose.model("Store", StoreSchema);

// Hot-reload safe: ensure new fields exist on cached schema in dev.
if (!StoreModel.schema.path("isPrimary")) {
  StoreModel.schema.add({ isPrimary: { type: Boolean, default: false } });
}
if (!StoreModel.schema.path("identityDocuments")) {
  StoreModel.schema.add({
    identityDocuments: {
      type: [{
        url: String,
        fileName: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      default: []
    }
  });
}

export default StoreModel;
