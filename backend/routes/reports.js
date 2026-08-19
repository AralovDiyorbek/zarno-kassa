const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const StockEntry = require('../models/StockEntry');

// GET — Bugungi statistika
router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const dateQuery = { createdAt: { $gte: startOfDay, $lt: endOfDay } };

    const salesAgg = await Sale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          totalDiscount: { $sum: '$discount' },
          count: { $sum: 1 },
          items: { $sum: { $size: '$items' } },
        }
      }
    ]);

    const expenseAgg = await Expense.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const stockAgg = await StockEntry.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' }, count: { $sum: 1 } } }
    ]);

    res.json({
      sales: {
        totalAmount: salesAgg[0]?.totalAmount || 0,
        totalCost: salesAgg[0]?.totalCost || 0,
        totalProfit: salesAgg[0]?.totalProfit || 0,
        totalDiscount: salesAgg[0]?.totalDiscount || 0,
        count: salesAgg[0]?.count || 0,
        itemsSold: salesAgg[0]?.items || 0,
      },
      expenses: {
        total: expenseAgg[0]?.total || 0,
        count: expenseAgg[0]?.count || 0,
      },
      stockEntries: {
        totalQty: stockAgg[0]?.totalQty || 0,
        totalCost: stockAgg[0]?.totalCost || 0,
        count: stockAgg[0]?.count || 0,
      },
      netProfit: (salesAgg[0]?.totalProfit || 0) - (expenseAgg[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — Asosiy hisobot (sana oralig'i bilan)
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateQuery = {};

    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = toDate;
      }
    }

    const salesAgg = await Sale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          totalDiscount: { $sum: '$discount' },
          count: { $sum: 1 },
        }
      }
    ]);

    const expenseAgg = await Expense.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalAmount = salesAgg[0]?.totalAmount || 0;
    const totalCost = salesAgg[0]?.totalCost || 0;
    const grossProfit = salesAgg[0]?.totalProfit || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const netProfit = grossProfit - totalExpenses;
    const salesCount = salesAgg[0]?.count || 0;

    res.json({ totalAmount, totalCost, grossProfit, totalExpenses, netProfit, salesCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — Eng ko'p sotilgan tovarlar
router.get('/top-products', async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    let dateQuery = {};

    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = toDate;
      }
    }

    const topProducts = await Sale.aggregate([
      { $match: dateQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalProfit: { $sum: '$items.profit' },
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — Eng kam sotilgan tovarlar
router.get('/slow-products', async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateQuery = {};

    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = toDate;
      }
    }

    const soldProducts = await Sale.aggregate([
      { $match: dateQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        }
      }
    ]);

    const allProducts = await Product.find({}, 'name stockQty');
    const soldMap = {};
    soldProducts.forEach(s => { soldMap[String(s._id)] = s; });

    const slowProducts = allProducts.map(p => ({
      productId: p._id,
      productName: p.name,
      stockQty: p.stockQty,
      totalQty: soldMap[String(p._id)]?.totalQty || 0,
      totalRevenue: soldMap[String(p._id)]?.totalRevenue || 0,
    })).sort((a, b) => a.totalQty - b.totalQty);

    res.json(slowProducts.slice(0, 10));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — Kunlik savdo grafigi (oxirgi 30 kun)
router.get('/daily-chart', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyExpenses = await Expense.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const expenseMap = {};
    dailyExpenses.forEach(e => { expenseMap[e._id] = e.total; });

    const result = dailySales.map(d => ({
      date: d._id,
      totalAmount: d.totalAmount,
      totalProfit: d.totalProfit,
      expenses: expenseMap[d._id] || 0,
      netProfit: d.totalProfit - (expenseMap[d._id] || 0),
      salesCount: d.count,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET — Sotib olish kerak ro'yxati
router.get('/need-to-buy', async (req, res) => {
  try {
    const products = await Product.find({
      $or: [
        { stockQty: 0 },
        { $expr: { $lte: ['$stockQty', '$minAlertQty'] } }
      ]
    }).sort({ stockQty: 1 });

    const result = products.map(p => ({
      _id: p._id,
      name: p.name,
      stockQty: p.stockQty,
      minAlertQty: p.minAlertQty,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      unit: p.unit,
      status: p.stockQty === 0 ? 'tugagan' : 'kam',
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
