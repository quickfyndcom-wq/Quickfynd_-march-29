import mongoose from "mongoose";

const MetaIntegrationSchema = new mongoose.Schema({
  storeId: { type: String, required: true, unique: true },
  adAccountId: { type: String, required: true },
  accessToken: { type: String, required: true }, // Encrypted in production
  isActive: { type: Boolean, default: true },
  lastSyncedAt: Date,
  autoSyncEnabled: { type: Boolean, default: true },
  syncFrequency: { 
    type: String, 
    enum: ['DAILY', 'HOURLY', 'MANUAL'],
    default: 'DAILY'
  }
}, { timestamps: true });

export default mongoose.models.MetaIntegration || mongoose.model("MetaIntegration", MetaIntegrationSchema);
