const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '📦' },
  color: { type: String, default: '#f59e0b' },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
