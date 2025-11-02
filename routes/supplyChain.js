const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const supplyChain = require('../services/supplyChainLedger');

router.post('/create-ledger/:productId', authenticateToken, authorizeRole('farmer'), async (req, res) => {
  try {
    const ledger = await supplyChain.createProductLedger(req.params.productId, req.user.id);
    res.status(201).json({
      message: 'Supply chain ledger created',
      ...ledger
    });
  } catch (error) {
    console.error('Error creating ledger:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/record-event/:productId', authenticateToken, async (req, res) => {
  try {
    const { eventType, eventData } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const result = await supplyChain.recordEvent(
      req.params.productId,
      eventType,
      eventData || {},
      req.user.id
    );

    res.json({
      message: 'Event recorded in supply chain',
      ...result
    });
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/journey/:productId', async (req, res) => {
  try {
    const journey = await supplyChain.getSupplyChainJourney(req.params.productId);
    res.json({
      productId: req.params.productId,
      journey,
      totalEvents: journey.length
    });
  } catch (error) {
    console.error('Error getting journey:', error);
    res.status(500).json({ error: 'Failed to get supply chain journey' });
  }
});

router.get('/verify/:ledgerId', async (req, res) => {
  try {
    const verification = await supplyChain.verifyIntegrity(req.params.ledgerId);
    res.json(verification);
  } catch (error) {
    console.error('Error verifying integrity:', error);
    res.status(500).json({ error: 'Failed to verify integrity' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { ledgerId } = req.query;
    const stats = await supplyChain.getChainStatistics(ledgerId || null);
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
