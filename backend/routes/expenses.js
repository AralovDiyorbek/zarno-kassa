const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// GET - Barcha xarajatlar
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
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

    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Yangi xarajat
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, note } = req.body;
    const expense = new Expense({ title, amount, category: category || 'Boshqa', note: note || '' });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Xarajatni yangilash
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Xarajat topilmadi' });
    res.json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Xarajatni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Xarajat topilmadi' });
    res.json({ message: 'Xarajat o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
