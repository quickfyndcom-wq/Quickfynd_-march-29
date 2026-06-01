import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  storeId: {
    type: String,
    required: true,
    ref: 'Store'
  },
  title: {
    type: String,
    required: true
  },
  productIds: {
    type: [String],
    default: [],
    ref: 'Product'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
dealSchema.index({ storeId: 1, isActive: 1, startTime: 1, endTime: 1 });
dealSchema.index({ startTime: 1, endTime: 1 });

const Deal = mongoose.models.Deal || mongoose.model('Deal', dealSchema);

export default Deal;
