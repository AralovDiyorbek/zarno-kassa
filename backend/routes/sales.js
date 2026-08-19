const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// GET - Barcha savdolar (filtrlash bilan)
router.get('/', async (req, res) => {
  try {
    const { from, to, payment } = req.query;
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
    if (payment) query.paymentType = payment;

    const sales = await Sale.find(query).sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Bitta sotuv
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sotuv topilmadi' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Nasiyalar (qarzlar ro'yxati)
router.get('/debts', async (req, res) => {
  try {
    const debts = await Sale.find({ paymentType: 'nasiya', isPaid: false }).sort({ createdAt: -1 });
    const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
    res.json({ debts, totalDebt, count: debts.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - Nasiyani to'langan deb belgilash
router.put('/:id/pay-debt', async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { isPaid: true, paidAt: new Date() },
      { new: true }
    );
    if (!sale) return res.status(404).json({ message: 'Sotuv topilmadi' });
    res.json({ message: 'Qarz to\'landi deb belgilandi', sale });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Yangi sotuv (checkout)
router.post('/', async (req, res) => {
  try {
    const { items, paymentType, discount, customerName, customerPhone, receivedAmount, changeAmount, note } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Savatda mahsulot yo\'q' });
    }

    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Mahsulot topilmadi: ${item.productId}` });
      }
      if (product.stockQty < item.quantity) {
        return res.status(400).json({ message: `${product.name} omborda yetarli emas (mavjud: ${product.stockQty})` });
      }

      const subtotal = product.sellPrice * item.quantity;
      const cost = product.costPrice * item.quantity;
      const profit = subtotal - cost;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        subtotal,
        profit,
      });

      totalAmount += subtotal;
      totalCost += cost;
      totalProfit += profit;

      // Ombor qoldig'ini kamaytirish
      await Product.findByIdAndUpdate(product._id, { $inc: { stockQty: -item.quantity } });
    }

    const finalAmount = Math.max(0, totalAmount - (Number(discount) || 0));
    const isNasiya = paymentType === 'nasiya';

    const sale = new Sale({
      items: saleItems,
      totalAmount: finalAmount,
      totalCost,
      totalProfit,
      discount: Number(discount) || 0,
      paymentType: paymentType || 'naqd',
      customerName: customerName ? String(customerName).trim() : '',
      customerPhone: customerPhone ? String(customerPhone).trim() : '',
      isPaid: !isNasiya,
      paidAt: !isNasiya ? new Date() : null,
      receivedAmount: Number(receivedAmount) || finalAmount,
      changeAmount: Number(changeAmount) || 0,
      note: note || '',
    });

    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Sotuvni bekor qilish (ombor tiklanadi)
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sotuv topilmadi' });

    // Ombor qoldig'ini tiklash
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stockQty: item.quantity } });
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sotuv bekor qilindi, ombor tiklandi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
