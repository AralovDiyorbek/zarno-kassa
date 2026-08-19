require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const Expense = require('./models/Expense');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB ulandi');

  // Eski ma'lumotlarni o'chirish
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Sale.deleteMany({});
  await Expense.deleteMany({});
  console.log('🗑️  Eski ma\'lumotlar o\'chirildi');

  // Kategoriyalar
  const cats = await Category.insertMany([
    { name: 'Umumiy', icon: '📦', color: '#f59e0b' },
    { name: 'Oziq-Ovqat', icon: '🍎', color: '#10b981' },
    { name: 'Ichimliklar', icon: '🥤', color: '#3b82f6' },
    { name: 'Maishiy', icon: '🏠', color: '#8b5cf6' },
    { name: 'Kiyim-Kechak', icon: '👕', color: '#ec4899' },
  ]);
  console.log('✅ Kategoriyalar yaratildi');

  // Tovarlar
  const products = await Product.insertMany([
    { name: 'u68', categoryId: cats[0]._id, categoryName: 'Umumiy', costPrice: 5000, sellPrice: 15000, stockQty: 4, minAlertQty: 2 },
    { name: 'ty', categoryId: cats[0]._id, categoryName: 'Umumiy', costPrice: 5000, sellPrice: 10000, stockQty: 10, minAlertQty: 3 },
    { name: 'Non', categoryId: cats[1]._id, categoryName: 'Oziq-Ovqat', costPrice: 2000, sellPrice: 3500, stockQty: 20, minAlertQty: 5 },
    { name: 'Coca Cola 0.5L', categoryId: cats[2]._id, categoryName: 'Ichimliklar', costPrice: 4000, sellPrice: 6000, stockQty: 0, minAlertQty: 5 },
    { name: 'Limon', categoryId: cats[1]._id, categoryName: 'Oziq-Ovqat', costPrice: 1500, sellPrice: 3000, stockQty: 2, minAlertQty: 5 },
  ]);
  console.log('✅ Tovarlar yaratildi');

  // Savdolar
  const sale1 = new Sale({
    items: [
      { productId: products[1]._id, productName: 'ty', quantity: 65, costPrice: 5000, sellPrice: 10000, subtotal: 650000, profit: 325000 },
    ],
    totalAmount: 650000,
    totalCost: 325000,
    totalProfit: 325000,
    paymentType: 'naqd',
  });
  await sale1.save();

  const sale2 = new Sale({
    items: [
      { productId: products[0]._id, productName: 'u68', quantity: 6, costPrice: 5000, sellPrice: 15000, subtotal: 90000, profit: 60000 },
    ],
    totalAmount: 90000,
    totalCost: 30000,
    totalProfit: 60000,
    paymentType: 'karta',
  });
  await sale2.save();

  // Ombor qoldig'ini moslash (65 ta ty sotilgan)
  await Product.findByIdAndUpdate(products[1]._id, { $inc: { stockQty: -65 } });
  // 6 ta u68 sotilgan (lekin seed uchun stockQty 4 qolsin)
  // Realda bu avtomatik bo'ladi, seed uchun qoldirdik

  console.log('✅ Savdolar yaratildi');

  // Xarajatlar
  await Expense.insertMany([
    { title: 'abet', amount: 37, category: 'Boshqa', createdAt: new Date('2026-08-13T17:12:17') },
    { title: 'Ijara', amount: 500000, category: 'Ijara' },
    { title: 'Elektr', amount: 120000, category: 'Kommunal' },
  ]);
  console.log('✅ Xarajatlar yaratildi');

  console.log('\n🎉 Seed muvaffaqiyatli tugadi!');
  mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed xatosi:', err);
  mongoose.disconnect();
  process.exit(1);
});
