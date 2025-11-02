const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const aiPricing = require('../services/aiPricing');

router.get('/analyze/:category', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const trends = await aiPricing.analyzeMarketTrends(req.params.category, parseInt(days));
    res.json({ category: req.params.category, trends });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    res.status(500).json({ error: 'Failed to analyze trends' });
  }
});

router.get('/optimal-price/:productId', async (req, res) => {
  try {
    const pricing = await aiPricing.calculateOptimalPrice(req.params.productId);
    res.json(pricing);
  } catch (error) {
    console.error('Error calculating optimal price:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const { category } = req.query;
    const insights = await aiPricing.getMarketInsights(category || null);
    res.json({ insights });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

router.post('/apply-optimal-price/:productId', authenticateToken, authorizeRole('farmer'), async (req, res) => {
  try {
    const result = await aiPricing.applyOptimalPrice(req.params.productId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error applying optimal price:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
