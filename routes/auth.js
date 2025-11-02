const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/database');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address, village } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (!['farmer', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be farmer or buyer' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, role, address, village, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, role, address, village, 'pending']
    );

    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [result.insertId, 'Welcome to AgroConnect', 'Your account has been created and is pending approval by an administrator.', 'system']
    );

    res.status(201).json({
      message: 'Registration successful. Your account is pending approval.',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    if (user.status === 'pending' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Your account is pending approval' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        village: user.village,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
