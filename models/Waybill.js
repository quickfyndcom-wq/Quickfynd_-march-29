import mongoose from 'mongoose';

const WaybillSchema = new mongoose.Schema({
  waybill: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Waybill || mongoose.model('Waybill', WaybillSchema);
