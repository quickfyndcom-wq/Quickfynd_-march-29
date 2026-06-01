import mongoose from "mongoose";

const ReturnRequestSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  type: String, // RETURN or REPLACEMENT
  reason: String,
  description: String,
  images: [String],
  videos: [String],
  fastProcess: { type: Boolean, default: false },
  productRating: Number,
  deliveryRating: Number,
  reviewText: String,
  status: { type: String, default: "PENDING" },
  // Add more fields as needed
}, { timestamps: true });

export default mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", ReturnRequestSchema);
