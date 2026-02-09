// models/Category.ts
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  icon: {
    type: String,
    enum: ['coffee', 'utensils', 'cup'],
    default: 'coffee',
  },
  productCount: {
    type: Number,
    default: 0,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);