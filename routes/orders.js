const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('buyer'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { items, delivery_address, delivery_date, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    await connection.beginTransaction();

    const farmerOrders = {};

    for (const item of items) {
      const [products] = await connection.query('SELECT * FROM products WHERE id = ? AND status = "available"', [item.product_id]);

      if (products.length === 0) {
        throw new Error(`Product ${item.product_id} not found or unavailable`);
      }

      const product = products[0];

      if (product.available_quantity < item.quantity) {
        throw new Error(`Insufficient quantity for ${product.name}`);
      }

      if (!farmerOrders[product.farmer_id]) {
        farmerOrders[product.farmer_id] = {
          items: [],
          total: 0
        };
      }

      const subtotal = item.quantity * product.price_per_kg;
      farmerOrders[product.farmer_id].items.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_per_unit: product.price_per_kg,
        subtotal: subtotal
      });
      farmerOrders[product.farmer_id].total += subtotal;
    }

    const orderIds = [];

    for (const [farmerId, orderData] of Object.entries(farmerOrders)) {
      const [orderResult] = await connection.query(
        'INSERT INTO orders (buyer_id, farmer_id, total_amount, delivery_address, delivery_date, status, payment_status, notes) VALUES (?, ?, ?, ?, ?, "pending", "pending", ?)',
        [req.user.id, farmerId, orderData.total, delivery_address, delivery_date, notes]
      );

      const orderId = orderResult.insertId;
      orderIds.push(orderId);

      for (const item of orderData.items) {
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_per_unit, subtotal) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price_per_unit, item.subtotal]
        );

        await connection.query(
          'UPDATE products SET available_quantity = available_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      const [buyer] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);

      await connection.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [farmerId, 'New Order Received!', `You have a new order from ${buyer[0].name} worth BDT ${orderData.total.toFixed(2)}`, 'order']
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order placed successfully',
      orderIds: orderIds
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    connection.release();
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'farmer') {
      query = `
        SELECT o.*, u.name as buyer_name, u.phone as buyer_phone, u.email as buyer_email
        FROM orders o
        JOIN users u ON o.buyer_id = u.id
        WHERE o.farmer_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'buyer') {
      query = `
        SELECT o.*, u.name as farmer_name, u.phone as farmer_phone, u.village
        FROM orders o
        JOIN users u ON o.farmer_id = u.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'admin') {
      query = `
        SELECT o.*,
          ub.name as buyer_name, ub.phone as buyer_phone,
          uf.name as farmer_name, uf.phone as farmer_phone, uf.village
        FROM orders o
        JOIN users ub ON o.buyer_id = ub.id
        JOIN users uf ON o.farmer_id = uf.id
        ORDER BY o.created_at DESC
      `;
      params = [];
    }

    const [orders] = await db.query(query, params);
    res.json(orders);

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*,
        ub.name as buyer_name, ub.phone as buyer_phone, ub.email as buyer_email, ub.address as buyer_address,
        uf.name as farmer_name, uf.phone as farmer_phone, uf.village, uf.address as farmer_address
       FROM orders o
       JOIN users ub ON o.buyer_id = ub.id
       JOIN users uf ON o.farmer_id = uf.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (req.user.role !== 'admin' && req.user.id !== order.buyer_id && req.user.id !== order.farmer_id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.unit
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    order.items = items;
    res.json(order);

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (req.user.role === 'farmer' && req.user.id !== order.farmer_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (req.user.role === 'buyer' && req.user.id !== order.buyer_id && status !== 'cancelled') {
      return res.status(403).json({ error: 'Buyers can only cancel orders' });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    let notifUserId, notifMessage;
    if (req.user.role === 'farmer') {
      notifUserId = order.buyer_id;
      notifMessage = `Your order #${order.id} status has been updated to: ${status}`;
    } else {
      notifUserId = order.farmer_id;
      notifMessage = `Order #${order.id} has been ${status} by the buyer`;
    }

    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [notifUserId, 'Order Status Update', notifMessage, 'order']
    );

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
