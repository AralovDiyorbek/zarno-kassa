const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  categoryName: { type: String, default: 'Umumiy' },
  costPrice: { type: Number, required: true, min: 0 },
  sellPrice: { type: Number, required: true, min: 0 },
  stockQty: { type: Number, default: 0, min: 0 },
  barcode: { type: String, default: '' },
  minAlertQty: { type: Number, default: 2 },
  unit: { type: String, default: 'dona' },
  description: { type: String, default: '' },
}, { timestamps: true });

// Virtual: foyda foizi
productSchema.virtual('profitMargin').get(function () {
  if (this.costPrice === 0) return 0;
  return (((this.sellPrice - this.costPrice) / this.costPrice) * 100).toFixed(1);
});

module.exports = mongoose.model('Product', productSchema);
