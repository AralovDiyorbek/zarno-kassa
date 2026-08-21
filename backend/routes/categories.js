const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET - Barcha kategoriyalar
router.get('/', async (req, res) => {
  try {
    let categories = await Category.find().sort({ createdAt: 1 });
    if (categories.length === 0) {
      // Default accessories categories
      const defaults = [
        { name: 'Chexollar', icon: 'shield-outline', color: '#f59e0b' },
        { name: 'Himoya oynalari (Shisha)', icon: 'phone-portrait-outline', color: '#3b82f6' },
        { name: 'Zaryadnik va Kabellar', icon: 'flash-outline', color: '#10b981' },
        { name: 'Quloqchinlar (AirPods)', icon: 'headset-outline', color: '#8b5cf6' },
        { name: 'Powerbanklar', icon: 'battery-charging-outline', color: '#ec4899' },
        { name: 'Boshqa aksessuarlar', icon: 'cube-outline', color: '#6b7280' },
      ];
      categories = await Category.insertMany(defaults);
    }
    
    // Sort so "Boshqa aksessuarlar" / "Boshqa..." is always at the end
    categories.sort((a, b) => {
      const isB = (name) => (name || '').toLowerCase().includes('boshqa');
      if (isB(a.name) && !isB(b.name)) return 1;
      if (!isB(a.name) && isB(b.name)) return -1;
      return 0;
    });

    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Yangi kategoriya
router.post('/', async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kategoriya nomi kiritilmadi' });
    }

    const trimmedName = name.trim();
    // Check if category already exists (case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });
    if (existing) {
      return res.json(existing);
    }

    const category = new Category({ name: trimmedName, icon: icon || '📦', color: color || '#f59e0b' });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Kategoriyani yangilash
router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Kategoriya topilmadi' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Kategoriyani o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Kategoriya topilmadi' });
    res.json({ message: 'Kategoriya o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
