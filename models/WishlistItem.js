import mongoose from "mongoose";

const WishlistItemSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  // Add more fields as needed
}, { timestamps: true });

export default mongoose.models.WishlistItem || mongoose.model("WishlistItem", WishlistItemSchema);
