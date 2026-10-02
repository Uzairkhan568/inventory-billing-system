const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Item = require('../models/Item');
const Sale = require('../models/Sale');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const cleanIdentifier = value => String(value || '').trim().toLowerCase();
const safeUser = user => ({
  _id: user.id,
  name: user.name,
  identifier: user.identifier,
  role: user.role || 'admin',
  active: user.active
});
const generateToken = id => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});
const authResponse = user => ({ ...safeUser(user), token: generateToken(user.id) });

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const identifier = cleanIdentifier(req.body.identifier);
    const password = String(req.body.password || '');

    if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
    if (!identifier) return res.status(400).json({ message: 'Email or phone number is required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ identifier })) return res.status(409).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, identifier, password: passwordHash, role: 'admin' });
    res.status(201).json(authResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    const identifier = cleanIdentifier(req.body.identifier);
    if (!identifier) return res.status(400).json({ message: 'Email or phone number is required' });

    const user = await User.findOne({ identifier }).select('+otp +otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.active) return res.status(403).json({ message: 'Account is disabled' });

    const generatedOTP = String(Math.floor(100000 + Math.random() * 900000));
    const minutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
    user.otp = generatedOTP;
    user.otpExpires = new Date(Date.now() + minutes * 60 * 1000);
    await user.save();

    console.log(`🔑 OTP for ${identifier}: ${generatedOTP}`);
    const payload = { message: 'OTP generated. In production, send it through your SMS/email provider.' };
    if (String(process.env.DEMO_OTP_ENABLED).toLowerCase() === 'true') payload.demoOtp = generatedOTP;
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = cleanIdentifier(req.body.identifier);
    const password = String(req.body.password || '');
    const otp = String(req.body.otp || '').trim();

    const user = await User.findOne({ identifier }).select('+otp +otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.active) return res.status(403).json({ message: 'Account is disabled' });

    if (otp) {
      if (user.otp !== otp || !user.otpExpires || user.otpExpires.getTime() <= Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.json(authResponse(user));
    }

    if (!password || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json(authResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Account no longer exists or is disabled' });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/update-profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+otp +otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const name = String(req.body.name || '').trim();
    const newPassword = String(req.body.newPassword || '');
    if (!name && !newPassword) return res.status(400).json({ message: 'Provide a name or new password' });
    if (name) {
      if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
      user.name = name;
    }
    if (newPassword) {
      if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', ...safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/users', protect, adminOnly, async (_req, res) => {
  try {
    const users = await User.find().select('name identifier role active createdAt').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users', protect, adminOnly, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const identifier = cleanIdentifier(req.body.identifier);
    const password = String(req.body.password || '');
    if (name.length < 2 || !identifier || password.length < 6) {
      return res.status(400).json({ message: 'Name, identifier and a password of at least 6 characters are required' });
    }
    if (await User.findOne({ identifier })) return res.status(409).json({ message: 'A user with this identifier already exists' });
    const user = await User.create({ name, identifier, password: await bcrypt.hash(password, 12), role: 'cashier' });
    res.status(201).json(safeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/status', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot disable your own account' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = Boolean(req.body.active);
    await user.save();
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/clear-all-data', protect, adminOnly, async (_req, res) => {
  try {
    const [items, sales] = await Promise.all([Item.deleteMany({}), Sale.deleteMany({})]);
    res.json({ message: 'All inventory and sales records cleared', deletedItems: items.deletedCount, deletedSales: sales.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
