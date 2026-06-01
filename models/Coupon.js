import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true },
  title: { type: String, required: true }, // e.g., "10% Off", "₹50 Off"
  description: { type: String, required: true }, // e.g., "Get 10% off on orders above ₹500"
  storeId: String,
  discountType: { type: String, enum: ["percentage", "fixed", "free_shipping"], required: true }, // percentage, fixed, or free_shipping
  discountValue: { type: Number, required: true }, // 10 for 10% or 50 for ₹50
  minOrderValue: { type: Number, default: 0 }, // Minimum order value to apply
  maxDiscount: { type: Number }, // Max discount cap for percentage type
  maxUses: { type: Number }, // Total times this coupon can be used
  usedCount: { type: Number, default: 0 },
  maxUsesPerUser: { type: Number, default: 1 }, // Times per user
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  savingsAmount: { type: Number }, // Display savings like "Save ₹ 75.00"
  badgeColor: { type: String, default: "green" }, // green, orange, purple, blue
  
  // Old schema fields for backward compatibility
  discount: { type: Number },
  minPrice: { type: Number },
  minProductCount: { type: Number },
  specificProducts: [{ type: String }], // Array of product IDs
  forNewUser: { type: Boolean, default: false },
  forMember: { type: Boolean, default: false },
  firstOrderOnly: { type: Boolean, default: false },
  oneTimePerUser: { type: Boolean, default: false },
  usageLimit: { type: Number },
  isPublic: { type: Boolean, default: true },
  freeShipping: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
