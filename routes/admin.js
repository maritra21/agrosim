const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { role, status } = req.query;

    let query = 'SELECT id, name, email, phone, role, address, village, status, created_at FROM users WHERE role != "admin"';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await db.query(query, params);
    res.json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ error: 'Cannot modify admin status' });
    }

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);

    let message;
    if (status === 'active') {
      message = 'Your account has been approved! You can now use all features of AgroConnect.';
    } else if (status === 'suspended') {
      message = 'Your account has been suspended. Please contact support for more information.';
    } else {
      message = 'Your account status has been updated.';
    }

    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Account Status Update', message, 'system']
    );

    res.json({ message: 'User status updated successfully' });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

router.get('/statistics', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [farmerCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "farmer"');
    const [buyerCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "buyer"');
    const [pendingUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE status = "pending"');
    const [activeProducts] = await db.query('SELECT COUNT(*) as count FROM products WHERE status = "available"');
    const [totalOrders] = await db.query('SELECT COUNT(*) as count FROM orders');
    const [pendingOrders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');
    const [totalRevenue] = await db.query('SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"');

    res.json({
      farmers: farmerCount[0].count,
      buyers: buyerCount[0].count,
      pendingUsers: pendingUsers[0].count,
      activeProducts: activeProducts[0].count,
      totalOrders: totalOrders[0].count,
      pendingOrders: pendingOrders[0].count,
      totalRevenue: totalRevenue[0].total || 0
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.post('/broadcast', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { title, message, target_role, target_user_id } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const [broadcastResult] = await db.query(
      'INSERT INTO broadcast_messages (admin_id, title, message, target_role, target_user_id) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, message, target_role || 'all', target_user_id || null]
    );

    let userQuery = 'SELECT id FROM users WHERE status = "active" AND role != "admin"';
    const params = [];

    if (target_role && target_role !== 'all') {
      if (target_role === 'specific' && target_user_id) {
        userQuery = 'SELECT id FROM users WHERE id = ?';
        params.push(target_user_id);
      } else if (target_role !== 'specific') {
        userQuery += ' AND role = ?';
        params.push(target_role);
      }
    }

    const [users] = await db.query(userQuery, params);

    for (const user of users) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [user.id, title, message, 'announcement']
      );
    }

    res.json({
      message: 'Broadcast sent successfully',
      recipientCount: users.length
    });

  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

router.get('/broadcasts', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [broadcasts] = await db.query(
      `SELECT b.*, u.name as admin_name, tu.name as target_user_name
       FROM broadcast_messages b
       JOIN users u ON b.admin_id = u.id
       LEFT JOIN users tu ON b.target_user_id = tu.id
       ORDER BY b.created_at DESC
       LIMIT 50`
    );

    res.json(broadcasts);

  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

module.exports = router;
