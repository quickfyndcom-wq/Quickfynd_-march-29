import mongoose from "mongoose";

const GuestUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true, index: true },
  phone: String,
  convertToken: String,
  tokenExpiry: Date,
  accountCreated: { type: Boolean, default: false },
  convertedUserId: String,
  convertedAt: Date,
  // Add more fields as needed
}, { timestamps: true });

export default mongoose.models.GuestUser || mongoose.model("GuestUser", GuestUserSchema);
