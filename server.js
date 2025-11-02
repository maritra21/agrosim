const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const aiPricingRoutes = require('./routes/aiPricing');
const supplyChainRoutes = require('./routes/supplyChain');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai-pricing', aiPricingRoutes);
app.use('/api/supply-chain', supplyChainRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/farmer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'farmer-dashboard.html'));
});

app.get('/buyer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'buyer-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AgroConnect Server is running!`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`\n🌾 Connecting farmers and buyers in Chattogram\n`);
});

module.exports = app;
