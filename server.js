const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// Fallback for all other routes (for a SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invest', investmentRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/admin', adminRoutes);

// DB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const jwt = require('jsonwebtoken');

// Middleware to check admin
const adminAuth = async (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
});

// Get all investments
router.get('/investments', adminAuth, async (req, res) => {
  try {
    const investments = await Investment.find().populate('userId', 'name email');
    res.json(investments);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch investments' });
  }
});

// Manual wallet adjustment (e.g. withdrawal approval)
router.post('/wallet-update', adminAuth, async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.wallet += amount;
    await user.save();
    res.json({ msg: 'Wallet updated', wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to update wallet' });
  }
});

module.exports = router;
