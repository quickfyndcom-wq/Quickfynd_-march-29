import mongoose from 'mongoose';

const OrderCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.OrderCounter || mongoose.model('OrderCounter', OrderCounterSchema);
