const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { category, search, farmer_id } = req.query;

    let query = `
      SELECT p.*, u.name as farmer_name, u.village, u.phone as farmer_phone
      FROM products p
      JOIN users u ON p.farmer_id = u.id
      WHERE p.status = 'available' AND u.status = 'active'
    `;
    const params = [];

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (farmer_id) {
      query += ' AND p.farmer_id = ?';
      params.push(farmer_id);
    }

    query += ' ORDER BY p.created_at DESC';

    const [products] = await db.query(query, params);
    res.json(products);

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT p.*, u.name as farmer_name, u.village, u.phone as farmer_phone, u.address as farmer_address
       FROM products p
       JOIN users u ON p.farmer_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/', authenticateToken, authorizeRole('farmer'), async (req, res) => {
  try {
    const { name, description, category, price_per_kg, available_quantity, unit, harvest_date } = req.body;

    if (!name || !price_per_kg || !available_quantity) {
      return res.status(400).json({ error: 'Name, price, and quantity are required' });
    }

    const [result] = await db.query(
      `INSERT INTO products (farmer_id, name, description, category, price_per_kg, available_quantity, unit, harvest_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [req.user.id, name, description, category, price_per_kg, available_quantity, unit || 'kg', harvest_date]
    );

    res.status(201).json({
      message: 'Product added successfully',
      productId: result.insertId
    });

  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.put('/:id', authenticateToken, authorizeRole('farmer'), async (req, res) => {
  try {
    const { name, description, category, price_per_kg, available_quantity, unit, harvest_date, status } = req.body;

    const [products] = await db.query('SELECT * FROM products WHERE id = ? AND farmer_id = ?', [req.params.id, req.user.id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    await db.query(
      `UPDATE products SET name = ?, description = ?, category = ?, price_per_kg = ?, available_quantity = ?, unit = ?, harvest_date = ?, status = ?
       WHERE id = ? AND farmer_id = ?`,
      [name, description, category, price_per_kg, available_quantity, unit, harvest_date, status, req.params.id, req.user.id]
    );

    res.json({ message: 'Product updated successfully' });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('farmer'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ? AND farmer_id = ?', [req.params.id, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
