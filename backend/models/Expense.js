const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'Boshqa' },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
