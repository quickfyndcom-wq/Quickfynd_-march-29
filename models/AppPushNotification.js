import mongoose from 'mongoose';

const AppPushNotificationSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
    targetUrl: { type: String, default: '' },
    topic: { type: String, default: 'quickfynd_app_customers' },
    audience: { type: String, default: 'all_app_customers' },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
      index: true,
    },
    providerMessageId: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    sentBy: { type: String, default: '' },
  },
  { timestamps: true }
);

AppPushNotificationSchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.models.AppPushNotification || mongoose.model('AppPushNotification', AppPushNotificationSchema);
