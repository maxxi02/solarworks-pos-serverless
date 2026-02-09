// models/Inventory.ts
import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Inventory item name is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['beans', 'syrups', 'dairy', 'fruits', 'other'],
    required: true,
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: 0,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);