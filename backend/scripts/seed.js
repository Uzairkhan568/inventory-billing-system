require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');

const run = async () => {
  await connectDB();
  const password = 'Admin@123';
  const existing = await User.findOne({ identifier: 'admin@shop.local' });
  if (!existing) {
    await User.create({
      name: 'Shop Admin',
      identifier: 'admin@shop.local',
      password: await bcrypt.hash(password, 12),
      role: 'admin'
    });
  }

  const itemCount = await Item.countDocuments({ active: true });
  if (itemCount === 0) {
    await Item.insertMany([
      { name: 'Basmati Rice', sku: 'RICE-001', category: 'Grocery', unit: 'kilogram', price: 120, costPrice: 95, stockQuantity: 40, minStockAlert: 10 },
      { name: 'Cooking Oil', sku: 'OIL-001', category: 'Grocery', unit: 'litre', price: 160, costPrice: 135, stockQuantity: 25, minStockAlert: 6 },
      { name: 'Milk Packet', sku: 'MILK-001', category: 'Dairy', unit: 'packet', price: 30, costPrice: 25, stockQuantity: 60, minStockAlert: 15 },
      { name: 'Bath Soap', sku: 'SOAP-001', category: 'Personal Care', unit: 'piece', price: 45, costPrice: 32, stockQuantity: 35, minStockAlert: 8 }
    ]);
  }

  console.log('✅ Seed complete');
  console.log(`Login: admin@shop.local / ${password}`);
  process.exit(0);
};

run().catch(error => { console.error(error); process.exit(1); });
