# ZARNO - Loyihani Ishga Tushirish

## Talab qilinadigan dasturlar:
- Node.js (v18+) - https://nodejs.org
- MongoDB Community Server - https://www.mongodb.com/try/download/community

---

## Ishga tushirish tartibi:

### 1. MongoDB ni ishga tushiring
MongoDB o'rnatilgandan keyin u avtomatik ishga tushishi kerak.
Yoki `Windows Services` dan `MongoDB` ni yoqing.

### 2. Backend (Terminal 1):
```bash
cd C:\Users\ANUBIS\OneDrive\Desktop\zarno-kassa\backend
npm install
npm run seed    # Demo ma'lumotlar kiritish (birinchi marta)
npm run dev     # Server http://localhost:5000 da ishga tushadi
```

### 3. Frontend (Terminal 2):
```bash
cd C:\Users\ANUBIS\OneDrive\Desktop\zarno-kassa\frontend
npm install
npm run dev     # UI http://localhost:3000 da ishga tushadi
```

### 4. Brauzerda oching:
http://localhost:3000

---

## API Endpoints:
- GET    /api/products         - Tovarlar ro'yxati
- POST   /api/products         - Yangi tovar qo'shish
- PUT    /api/products/:id     - Tovarni tahrirlash
- DELETE /api/products/:id     - Tovarni o'chirish
- GET    /api/products/stats/summary - Ombor statistikasi
- GET    /api/categories       - Kategoriyalar
- POST   /api/sales            - Yangi sotuv (checkout)
- GET    /api/sales            - Savdolar tarixi
- GET    /api/expenses         - Xarajatlar
- POST   /api/expenses         - Yangi xarajat
- GET    /api/reports/summary  - Moliyaviy hisobot
- GET    /api/reports/top-products   - Eng ko'p sotilgan
- GET    /api/reports/slow-products  - Sotilmayotgan tovarlar

---

## Loyiha tuzilishi:
```
zarno-kassa/
├── backend/          # Node.js + Express + MongoDB
│   ├── models/       # Mongoose schemalar
│   ├── routes/       # REST API routelar
│   ├── server.js     # Asosiy server
│   ├── seed.js       # Demo ma'lumotlar
│   └── .env          # Muhit o'zgaruvchilari
└── frontend/         # React + Vite
    └── src/
        ├── pages/    # 4 ta asosiy sahifa
        ├── components/ # Qayta ishlatiladigan komponentlar
        └── context/  # Global holat (Cart, Toast)
```
