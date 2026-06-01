import mongoose from 'mongoose'

const StoreNotificationSettingSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
  enableNewProductNotifications: { type: Boolean, default: true },
  notifyOnProductAdded: { type: Boolean, default: true },
  notificationTemplate: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default mongoose.models.StoreNotificationSetting || mongoose.model('StoreNotificationSetting', StoreNotificationSettingSchema)
