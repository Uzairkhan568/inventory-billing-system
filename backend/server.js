require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

app.use(cors({ origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ name: 'Inventory & Billing API', status: 'ok', version: '2.0.0' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'configured' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 5000);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`🌐 Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

start();
