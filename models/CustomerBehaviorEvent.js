import mongoose from "mongoose";

const CustomerBehaviorEventSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    customerType: { type: String, default: "guest", index: true },
    customerKey: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    eventType: {
      type: String,
      enum: [
        "product_view",
        "product_exit",
        "add_to_cart",
        "go_to_checkout",
        "order_placed",
        "page_view",
        "checkout_visit",
      ],
      required: true,
      index: true,
    },
    source: { type: String, default: "direct", index: true },
    medium: { type: String, default: "direct", index: true },
    campaign: { type: String, default: "none" },
    referrer: { type: String, default: "direct" },
    pagePath: { type: String, default: "" },
    productId: { type: String, default: null, index: true },
    productSlug: { type: String, default: null },
    productName: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
    scrollDepthPercent: { type: Number, default: 0 },
    nextAction: { type: String, default: "unknown" },
    orderId: { type: String, default: null },
    orderValue: { type: Number, default: 0 },
    metadata: { type: Object, default: {} },
    eventAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

CustomerBehaviorEventSchema.index({ storeId: 1, eventAt: -1 });
CustomerBehaviorEventSchema.index({ storeId: 1, eventType: 1, eventAt: -1 });
CustomerBehaviorEventSchema.index({ storeId: 1, source: 1, eventAt: -1 });
CustomerBehaviorEventSchema.index({ storeId: 1, customerKey: 1, eventAt: -1 });

export default mongoose.models.CustomerBehaviorEvent ||
  mongoose.model("CustomerBehaviorEvent", CustomerBehaviorEventSchema);
