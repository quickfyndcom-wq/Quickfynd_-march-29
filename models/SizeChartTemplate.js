import mongoose from 'mongoose';

const SizeChartTemplateSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['upload', 'table'], default: 'upload' },
    sizeChartEnabled: { type: Boolean, default: true },
    sizeChartUrl: { type: String, default: '' },
    sizeChartTable: { type: Object, default: null },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

SizeChartTemplateSchema.index({ storeId: 1, nameKey: 1 }, { unique: true });

export default mongoose.models.SizeChartTemplate || mongoose.model('SizeChartTemplate', SizeChartTemplateSchema);
