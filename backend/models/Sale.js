const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  profit: { type: Number, required: true },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  receiptNo: { type: String, unique: true },
  items: [saleItemSchema],
  totalAmount: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  paymentType: {
    type: String,
    enum: ['naqd', 'karta', 'nasiya'],
    default: 'naqd'
  },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  isPaid: { type: Boolean, default: true },
  paidAt: { type: Date, default: null },
  receivedAmount: { type: Number, default: 0 },
  changeAmount: { type: Number, default: 0 },
  note: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate receipt number
saleSchema.pre('save', async function (next) {
  if (!this.receiptNo) {
    const count = await mongoose.model('Sale').countDocuments();
    this.receiptNo = `CHK-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
