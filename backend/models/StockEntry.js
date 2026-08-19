const mongoose = require('mongoose');

const stockEntrySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true },
  supplierName: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StockEntry', stockEntrySchema);
