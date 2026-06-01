import mongoose from 'mongoose';

// Recursive schema for nested categories
const CategorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  children: [
    new mongoose.Schema({
      id: String,
      name: String,
      image: String,
      url: String,
      children: [new mongoose.Schema({
        id: String,
        name: String,
        image: String,
        url: String,
        children: []
      }, { _id: false })]
    }, { _id: false })
  ]
}, { _id: false });

const StoreMenuSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: true,
    unique: true
  },
  categories: [CategorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.StoreMenu || mongoose.model('StoreMenu', StoreMenuSchema);
