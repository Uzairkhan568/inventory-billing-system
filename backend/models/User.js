const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    identifier: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'cashier'], default: 'admin' },
    active: { type: Boolean, default: true },
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
