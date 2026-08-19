const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');

// GET - Barcha tovarlar
router.get('/', async (req, res) => {
  try {
    const { search, category, low_stock, out_of_stock } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.categoryId = category;
    if (low_stock === 'true') {
      query.$expr = { $and: [
        { $gt: ['$stockQty', 0] },
        { $lte: ['$stockQty', '$minAlertQty'] }
      ]};
    }
    if (out_of_stock === 'true') query.stockQty = 0;

    const products = await Product.find(query).populate('categoryId', 'name icon color').sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Bitta tovar
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId');
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const mongoose = require('mongoose');

// POST - Yangi tovar qo'shish
router.post('/', async (req, res) => {
  try {
    const { name, categoryId, costPrice, sellPrice, stockQty, barcode, minAlertQty, unit, description } = req.body;

    if (!name || costPrice === undefined || sellPrice === undefined) {
      return res.status(400).json({ message: 'Nomi, kirim narxi va sotish narxi majburiy' });
    }

    const cleanCategoryId = (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) ? categoryId : null;
    let categoryName = 'Umumiy';
    if (cleanCategoryId) {
      const cat = await Category.findById(cleanCategoryId);
      if (cat) categoryName = cat.name;
    }

    const product = new Product({
      name: name.trim(),
      categoryId: cleanCategoryId,
      categoryName,
      costPrice: Number(costPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      stockQty: Number(stockQty) || 0,
      barcode: barcode ? String(barcode).trim() : '',
      minAlertQty: Number(minAlertQty) || 2,
      unit: unit || 'dona',
      description: description ? String(description).trim() : ''
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Tovarni yangilash
router.put('/:id', async (req, res) => {
  try {
    const { name, categoryId, costPrice, sellPrice, stockQty, barcode, minAlertQty, unit, description } = req.body;

    const cleanCategoryId = (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) ? categoryId : null;
    let categoryName = 'Umumiy';
    if (cleanCategoryId) {
      const cat = await Category.findById(cleanCategoryId);
      if (cat) categoryName = cat.name;
    }

    const updateData = {
      categoryName,
      categoryId: cleanCategoryId,
    };
    if (name !== undefined) updateData.name = name.trim();
    if (costPrice !== undefined) updateData.costPrice = Number(costPrice) || 0;
    if (sellPrice !== undefined) updateData.sellPrice = Number(sellPrice) || 0;
    if (stockQty !== undefined) updateData.stockQty = Number(stockQty) || 0;
    if (barcode !== undefined) updateData.barcode = String(barcode).trim();
    if (minAlertQty !== undefined) updateData.minAlertQty = Number(minAlertQty) || 2;
    if (unit !== undefined) updateData.unit = unit;
    if (description !== undefined) updateData.description = String(description).trim();

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Tovarni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json({ message: 'Tovar o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Ombor statistikasi
router.get('/stats/summary', async (req, res) => {
  try {
    const products = await Product.find();
    const totalCostValue = products.reduce((sum, p) => sum + (p.costPrice * p.stockQty), 0);
    const totalSellValue = products.reduce((sum, p) => sum + (p.sellPrice * p.stockQty), 0);
    const lowStock = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minAlertQty).length;
    const outOfStock = products.filter(p => p.stockQty === 0).length;
    const inStock = products.filter(p => p.stockQty > p.minAlertQty).length;

    res.json({ totalCostValue, totalSellValue, lowStock, outOfStock, inStock, total: products.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
