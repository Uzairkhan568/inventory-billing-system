const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Item = require('../models/Item');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const invoiceNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${date}-${suffix}`;
};

router.post('/', protect, async (req, res) => {
  const { customerName, customerPhone, items, discount = 0, paymentMode = 'Cash', notes = '' } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (!['Cash', 'UPI', 'Card', 'Credit'].includes(paymentMode)) return res.status(400).json({ message: 'Invalid payment mode' });

  try {
    const ids = items.map(line => line.itemId);
    if (ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'Cart contains an invalid item' });

    const uniqueIds = [...new Set(ids.map(String))];
    const dbItems = await Item.find({ _id: { $in: uniqueIds }, active: true }).lean();
    if (dbItems.length !== uniqueIds.length) return res.status(400).json({ message: 'One or more items no longer exist' });

    const byId = new Map(dbItems.map(item => [String(item._id), item]));
    const requested = new Map();
    for (const line of items) {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ message: 'Item quantities must be greater than zero' });
      requested.set(String(line.itemId), (requested.get(String(line.itemId)) || 0) + quantity);
    }

    for (const [id, quantity] of requested) {
      const product = byId.get(id);
      if (!product || product.stockQuantity < quantity) {
        return res.status(409).json({ message: `Insufficient stock for ${product?.name || 'an item'} (available: ${product?.stockQuantity ?? 0})` });
      }
    }

    let subtotal = 0;
    let taxAmount = 0;
    const normalizedItems = [];
    for (const [id, quantity] of requested) {
      const product = byId.get(id);
      const lineSubtotal = round(product.price * quantity);
      const lineTax = round(lineSubtotal * (Number(product.taxPercent || 0) / 100));
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      normalizedItems.push({
        itemId: product._id,
        name: product.name,
        unit: product.unit,
        quantity,
        price: product.price,
        taxPercent: Number(product.taxPercent || 0),
        subtotal: lineSubtotal,
        taxAmount: lineTax
      });
    }

    subtotal = round(subtotal);
    taxAmount = round(taxAmount);
    const safeDiscount = round(Math.max(0, Number(discount) || 0));
    const totalAmount = round(subtotal + taxAmount);
    const netAmount = round(Math.max(0, totalAmount - safeDiscount));

    // Atomic per-item stock deductions. This prevents an individual product from going below zero.
    const updated = [];
    try {
      for (const [id, quantity] of requested) {
        const product = byId.get(id);
        const result = await Item.findOneAndUpdate(
          { _id: product._id, active: true, stockQuantity: { $gte: quantity } },
          { $inc: { stockQuantity: -quantity } },
          { new: true }
        );
        if (!result) throw Object.assign(new Error(`Stock changed while billing ${product.name}. Please retry.`), { statusCode: 409 });
        updated.push({ id: product._id, quantity });
      }

      const sale = await Sale.create({
        invoiceNumber: invoiceNumber(),
        customerName: String(customerName || '').trim() || 'Walk-in Customer',
        customerPhone: String(customerPhone || '').trim(),
        items: normalizedItems,
        subtotal,
        discount: safeDiscount,
        taxAmount,
        totalAmount,
        netAmount,
        paymentMode,
        notes: String(notes || '').trim(),
        createdBy: req.user.id
      });

      return res.status(201).json(sale);
    } catch (saleError) {
      for (const change of updated.reverse()) {
        await Item.findByIdAndUpdate(change.id, { $inc: { stockQuantity: change.quantity } });
      }
      throw saleError;
    }
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { search = '', paymentMode = '', from = '', to = '' } = req.query;
    const filter = {};
    const searchValue = String(search).trim();
    if (searchValue) {
      filter.$or = [
        { invoiceNumber: { $regex: searchValue, $options: 'i' } },
        { customerName: { $regex: searchValue, $options: 'i' } },
        { customerPhone: { $regex: searchValue, $options: 'i' } }
      ];
    }
    if (['Cash', 'UPI', 'Card', 'Credit'].includes(paymentMode)) filter.paymentMode = paymentMode;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00`);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999`);
    }

    const sales = await Sale.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 }).lean();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/dashboard-stats', protect, async (_req, res) => {
  try {
    const [sales, items] = await Promise.all([
      Sale.find({ status: 'Completed' }).lean(),
      Item.find({ active: true }).lean()
    ]);

    const totalRevenue = round(sales.reduce((sum, sale) => sum + Number(sale.netAmount || 0), 0));
    const totalOrders = sales.length;
    const totalUnits = items.reduce((sum, item) => sum + Number(item.stockQuantity || 0), 0);
    const lowStockItems = items.filter(item => item.stockQuantity <= item.minStockAlert);
    const inventoryValue = round(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.stockQuantity || 0), 0));

    const paymentMap = { Cash: 0, UPI: 0, Card: 0, Credit: 0 };
    for (const sale of sales) paymentMap[sale.paymentMode] = round((paymentMap[sale.paymentMode] || 0) + Number(sale.netAmount || 0));

    const recentSales = sales.slice(0, 8).map(sale => ({
      _id: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      netAmount: sale.netAmount,
      paymentMode: sale.paymentMode,
      createdAt: sale.createdAt
    }));

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts: items.length,
      totalUnits,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 8).map(item => ({ _id: item._id, name: item.name, stockQuantity: item.stockQuantity, minStockAlert: item.minStockAlert, unit: item.unit })),
      inventoryValue,
      chartData: Object.entries(paymentMap).map(([name, value]) => ({ name, value })),
      recentSales
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid sale id' });
    const sale = await Sale.findById(req.params.id).populate('createdBy', 'name').lean();
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid sale id' });
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.status === 'Cancelled') return res.status(400).json({ message: 'Sale is already cancelled' });

    for (const line of sale.items) {
      await Item.findByIdAndUpdate(line.itemId, { $inc: { stockQuantity: line.quantity } });
    }
    sale.status = 'Cancelled';
    await sale.save();
    res.json({ message: 'Sale cancelled and stock restored', sale });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
