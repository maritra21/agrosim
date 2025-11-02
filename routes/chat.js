const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'farmer') {
      query = `
        SELECT c.*,
          u.name as buyer_name,
          u.phone as buyer_phone,
          u.email as buyer_email,
          (SELECT COUNT(*) FROM chat_messages cm
           WHERE cm.conversation_id = c.id
           AND cm.sender_id != ?
           AND cm.is_read = FALSE) as unread_count
        FROM chat_conversations c
        JOIN users u ON c.buyer_id = u.id
        WHERE c.farmer_id = ?
        ORDER BY c.last_message_at DESC, c.created_at DESC
      `;
      params = [req.user.id, req.user.id];
    } else if (req.user.role === 'buyer') {
      query = `
        SELECT c.*,
          u.name as farmer_name,
          u.phone as farmer_phone,
          u.village,
          u.email as farmer_email,
          (SELECT COUNT(*) FROM chat_messages cm
           WHERE cm.conversation_id = c.id
           AND cm.sender_id != ?
           AND cm.is_read = FALSE) as unread_count
        FROM chat_conversations c
        JOIN users u ON c.farmer_id = u.id
        WHERE c.buyer_id = ?
        ORDER BY c.last_message_at DESC, c.created_at DESC
      `;
      params = [req.user.id, req.user.id];
    } else {
      return res.status(403).json({ error: 'Admins cannot access chat' });
    }

    const [conversations] = await db.query(query, params);
    res.json(conversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { other_user_id } = req.body;

    if (!other_user_id) {
      return res.status(400).json({ error: 'other_user_id is required' });
    }

    const [otherUser] = await db.query('SELECT role FROM users WHERE id = ?', [other_user_id]);

    if (otherUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let buyerId, farmerId;

    if (req.user.role === 'buyer' && otherUser[0].role === 'farmer') {
      buyerId = req.user.id;
      farmerId = other_user_id;
    } else if (req.user.role === 'farmer' && otherUser[0].role === 'buyer') {
      farmerId = req.user.id;
      buyerId = other_user_id;
    } else {
      return res.status(400).json({ error: 'Conversations can only be between farmers and buyers' });
    }

    const [existing] = await db.query(
      'SELECT id FROM chat_conversations WHERE buyer_id = ? AND farmer_id = ?',
      [buyerId, farmerId]
    );

    if (existing.length > 0) {
      return res.json({ conversationId: existing[0].id, message: 'Conversation already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO chat_conversations (buyer_id, farmer_id) VALUES (?, ?)',
      [buyerId, farmerId]
    );

    res.status(201).json({ conversationId: result.insertId, message: 'Conversation created' });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const [conversations] = await db.query(
      'SELECT * FROM chat_conversations WHERE id = ?',
      [req.params.id]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversations[0];

    if (req.user.id !== conversation.buyer_id && req.user.id !== conversation.farmer_id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const [messages] = await db.query(
      `SELECT m.*, u.name as sender_name, u.role as sender_role
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    await db.query(
      'UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?',
      [req.params.id, req.user.id]
    );

    res.json(messages);

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const [conversations] = await db.query(
      'SELECT * FROM chat_conversations WHERE id = ?',
      [req.params.id]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversations[0];

    if (req.user.id !== conversation.buyer_id && req.user.id !== conversation.farmer_id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const [result] = await db.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, message.trim()]
    );

    await db.query(
      'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [message.trim(), req.params.id]
    );

    const recipientId = req.user.id === conversation.buyer_id ? conversation.farmer_id : conversation.buyer_id;
    const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);

    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [recipientId, 'New Message', `${sender[0].name}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'system']
    );

    const [messages] = await db.query(
      `SELECT m.*, u.name as sender_name, u.role as sender_role
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(messages[0]);

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM chat_messages cm
       JOIN chat_conversations c ON cm.conversation_id = c.id
       WHERE cm.sender_id != ?
       AND cm.is_read = FALSE
       AND (c.buyer_id = ? OR c.farmer_id = ?)`,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json({ count: result[0].count });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
