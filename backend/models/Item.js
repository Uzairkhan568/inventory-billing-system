const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, trim: true, uppercase: true, default: '' },
    barcode: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    unit: {
      type: String,
      required: true,
      enum: ['kilogram', 'gram', 'litre', 'ml', 'packet', 'piece', 'dozen', 'box']
    },
    costPrice: { type: Number, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0 },
    minStockAlert: { type: Number, default: 5, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

itemSchema.index({ name: 'text', category: 'text', sku: 'text', barcode: 'text' });
itemSchema.index({ category: 1, active: 1 });

module.exports = mongoose.model('Item', itemSchema);
