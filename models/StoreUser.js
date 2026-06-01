import mongoose from "mongoose";

const StoreUserSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  userId: { type: String }, // Null until invite is accepted
  email: { type: String, required: true },
  role: { type: String, default: "member" }, // 'admin' or 'member'
  status: { type: String, default: "invited" }, // 'invited', 'pending', 'approved', 'rejected', 'removed'
  invitedById: { type: String },
  approvedById: { type: String },
  inviteToken: { type: String, unique: true, sparse: true },
  inviteExpiry: { type: Date },
  permissions: {
    overview: { type: Boolean, default: true },
    catalog: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    customers: { type: Boolean, default: true },
    marketing: { type: Boolean, default: true },
    storefront: { type: Boolean, default: true },
  },
  menuPermissions: {
    type: Map,
    of: Boolean,
    default: {},
  },
  allowedPaths: {
    type: [String],
    default: undefined,
  },
  permissionsConfigured: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure unique email per store
StoreUserSchema.index({ storeId: 1, email: 1 }, { unique: true });

// Recompile in dev/hot-reload so new schema fields are honored immediately.
if (mongoose.models.StoreUser) {
  delete mongoose.models.StoreUser;
}

export default mongoose.model("StoreUser", StoreUserSchema);
