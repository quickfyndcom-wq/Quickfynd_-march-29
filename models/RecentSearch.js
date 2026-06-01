import mongoose from 'mongoose';

const RecentSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    searches: {
      type: [String],
      default: [],
      validate: {
        validator: function(arr) {
          return arr.length <= 20; // Max 20 recent searches
        },
        message: 'Cannot store more than 20 recent searches'
      }
    },
  },
  { timestamps: true }
);

export default mongoose.models.RecentSearch ||
  mongoose.model('RecentSearch', RecentSearchSchema);
