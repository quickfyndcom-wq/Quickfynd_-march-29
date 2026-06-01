import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["EARN", "REDEEM", "ADMIN_CREDIT", "ADMIN_DEDUCT", "BONUS"], required: true },
  coins: { type: Number, required: true },
  rupees: { type: Number, required: true },
  orderId: { type: String },
  description: { type: String },
  addedBy: { type: String }, // Store admin ID if manually added/deducted
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const WalletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  transactions: { type: [WalletTransactionSchema], default: [] },
  welcomeBonusClaimed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
