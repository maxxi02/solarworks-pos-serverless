// models/Material.ts
import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['disposables', 'equipment', 'cleaning', 'packaging'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Material || mongoose.model('Material', MaterialSchema);