// models/Product.ts
import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    enum: ['pcs', 'g', 'kg', 'ml', 'L', 'shot', 'packet', 'tbsp', 'tsp'],
  },
});

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  ingredients: [IngredientSchema],
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);