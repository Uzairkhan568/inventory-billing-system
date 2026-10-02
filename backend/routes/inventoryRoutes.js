const express = require('express');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
const units = ['kilogram', 'gram', 'litre', 'ml', 'packet', 'piece', 'dozen', 'box'];

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get('/', protect, async (req, res) => {
  try {
    const { search = '', category = '', lowStock = '' } = req.query;
    const filter = { active: true };
    const searchValue = String(search).trim();
    if (searchValue) {
      filter.$or = [
        { name: { $regex: searchValue, $options: 'i' } },
        { category: { $regex: searchValue, $options: 'i' } },
        { sku: { $regex: searchValue, $options: 'i' } },
        { barcode: { $regex: searchValue, $options: 'i' } }
      ];
    }
    if (String(category).trim()) filter.category = String(category).trim();

    let items = await Item.find(filter).sort({ createdAt: -1 }).lean();
    if (String(lowStock).toLowerCase() === 'true') {
      items = items.filter(item => item.stockQuantity <= item.minStockAlert);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/categories', protect, async (_req, res) => {
  try {
    const categories = await Item.distinct('category', { active: true });
    res.json(categories.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, unit, sku = '', barcode = '', costPrice = 0, price, stockQuantity, minStockAlert = 5, taxPercent = 0 } = req.body;
    if (!name?.trim() || !category?.trim() || !units.includes(unit)) {
      return res.status(400).json({ message: 'Name, category and a valid unit are required' });
    }

    const payload = {
      name: name.trim(),
      category: category.trim(),
      unit,
      sku: String(sku).trim().toUpperCase(),
      barcode: String(barcode).trim(),
      costPrice: parseNumber(costPrice),
      price: parseNumber(price),
      stockQuantity: parseNumber(stockQuantity),
      minStockAlert: parseNumber(minStockAlert, 5),
      taxPercent: parseNumber(taxPercent)
    };
    if (payload.price < 0 || payload.stockQuantity < 0 || payload.costPrice < 0 || payload.minStockAlert < 0) {
      return res.status(400).json({ message: 'Numeric values cannot be negative' });
    }

    const duplicate = payload.sku ? await Item.findOne({ sku: payload.sku, active: true }) : null;
    if (duplicate) return res.status(409).json({ message: 'SKU already exists' });

    const item = await Item.create(payload);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid item id' });
    const allowed = ['name', 'category', 'unit', 'sku', 'barcode', 'costPrice', 'price', 'stockQuantity', 'minStockAlert', 'taxPercent', 'active'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = ['costPrice', 'price', 'stockQuantity', 'minStockAlert', 'taxPercent'].includes(key) ? parseNumber(req.body[key]) : req.body[key];
    }
    if (update.sku) update.sku = String(update.sku).trim().toUpperCase();
    if (update.name) update.name = String(update.name).trim();
    if (update.category) update.category = String(update.category).trim();
    if (update.sku) {
      const duplicate = await Item.findOne({ sku: update.sku, _id: { $ne: req.params.id }, active: true });
      if (duplicate) return res.status(409).json({ message: 'SKU already exists' });
    }
    const updatedItem = await Item.findOneAndUpdate({ _id: req.params.id, active: true }, update, { new: true, runValidators: true });
    if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/stock', protect, adminOnly, async (req, res) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ message: 'Stock change must be a non-zero number' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid item id' });

    const current = await Item.findById(req.params.id);
    if (!current || !current.active) return res.status(404).json({ message: 'Item not found' });
    const newQuantity = current.stockQuantity + delta;
    if (newQuantity < 0) return res.status(400).json({ message: `Insufficient stock. Current stock: ${current.stockQuantity}` });
    current.stockQuantity = newQuantity;
    await current.save();
    res.json(current);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid item id' });
    const item = await Item.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item archived successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
