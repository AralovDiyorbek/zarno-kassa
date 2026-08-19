const express = require('express');
const router = express.Router();
const StockEntry = require('../models/StockEntry');
const Product = require('../models/Product');

// GET — Barcha kirimlar (sana filtr bilan)
router.get('/', async (req, res) => {
  try {
    const { from, to, productId } = req.query;
    let query = {};

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }
    if (productId) query.productId = productId;

    const entries = await StockEntry.find(query).sort({ createdAt: -1 });
    const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
    const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);
    res.json({ entries, totalQty, totalCost });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — Yangi kirim (ombor avtomatik yangilanadi)
router.post('/', async (req, res) => {
  try {
    const { productId, quantity, costPrice, supplierName, note } = req.body;
    if (!productId || !quantity || !costPrice) {
      return res.status(400).json({ message: 'productId, quantity va costPrice majburiy' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Mahsulot topilmadi' });

    const entry = new StockEntry({
      productId: product._id,
      productName: product.name,
      quantity: Number(quantity),
      costPrice: Number(costPrice),
      totalCost: Number(quantity) * Number(costPrice),
      supplierName: supplierName || '',
      note: note || '',
    });

    await entry.save();

    // Ombor qoldig'ini va tannarxni yangilash
    await Product.findByIdAndUpdate(productId, {
      $inc: { stockQty: Number(quantity) },
      costPrice: Number(costPrice), // so'nggi kirim narxi
    });

    const updated = await Product.findById(productId);
    res.status(201).json({ entry, product: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET — Kunlik kirim statistikasi (oxirgi 30 kun)
router.get('/daily', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const daily = await StockEntry.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalQty: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(daily);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE — Kirimni bekor qilish (ombor kamayadi)
router.delete('/:id', async (req, res) => {
  try {
    const entry = await StockEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Kirim topilmadi' });

    await Product.findByIdAndUpdate(entry.productId, {
      $inc: { stockQty: -entry.quantity }
    });
    await StockEntry.findByIdAndDelete(req.params.id);
    res.json({ message: "Kirim bekor qilindi, ombor tiklandi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
