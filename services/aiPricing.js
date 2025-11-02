const db = require('../config/database');

class AIPricingEngine {
  async analyzeMarketTrends(category, days = 7) {
    try {
      const query = `
        SELECT
          p.category,
          AVG(p.price_per_kg) as avg_price,
          MIN(p.price_per_kg) as min_price,
          MAX(p.price_per_kg) as max_price,
          COUNT(DISTINCT p.id) as total_products,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as sales_count,
          DATE(p.created_at) as date
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        WHERE p.category = ? AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY p.category, DATE(p.created_at)
        ORDER BY p.created_at DESC
      `;

      const [trends] = await db.query(query, [category, days]);
      return trends;
    } catch (error) {
      console.error('Error analyzing market trends:', error);
      throw error;
    }
  }

  async calculateOptimalPrice(productId) {
    try {
      const [product] = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      if (product.length === 0) {
        throw new Error('Product not found');
      }

      const prod = product[0];
      const trends = await this.analyzeMarketTrends(prod.category, 14);

      if (trends.length === 0) {
        return {
          recommendedPrice: prod.price_per_kg,
          confidence: 0.4,
          reasoning: 'Insufficient market data'
        };
      }

      const avgPrice = trends.reduce((sum, t) => sum + t.avg_price, 0) / trends.length;
      const marketMax = Math.max(...trends.map(t => t.max_price));
      const marketMin = Math.min(...trends.map(t => t.min_price));

      const totalSales = trends.reduce((sum, t) => sum + (t.sales_count || 0), 0);
      const demandMultiplier = Math.min(totalSales / 10, 1.3);

      let recommendedPrice = avgPrice * demandMultiplier;
      recommendedPrice = Math.max(marketMin, Math.min(recommendedPrice, marketMax));

      const daysOld = Math.floor((Date.now() - new Date(prod.created_at)) / (1000 * 60 * 60 * 24));
      const freshness = Math.max(0, 1 - (daysOld / 30));
      const priceAdjustment = 1 + (freshness * 0.15);
      recommendedPrice = recommendedPrice * priceAdjustment;

      const confidence = Math.min(0.95, 0.5 + (trends.length * 0.05));

      return {
        recommendedPrice: Math.round(recommendedPrice * 100) / 100,
        currentPrice: prod.price_per_kg,
        marketAverage: Math.round(avgPrice * 100) / 100,
        marketRange: { min: marketMin, max: marketMax },
        demandLevel: demandMultiplier > 1.2 ? 'High' : demandMultiplier > 1.1 ? 'Medium' : 'Low',
        freshnessBonus: Math.round((freshness * 15)),
        potentialIncrease: Math.round(((recommendedPrice - prod.price_per_kg) / prod.price_per_kg) * 100),
        confidence: Math.round(confidence * 100),
        reasoning: `Based on ${trends.length} days of market data with ${totalSales} recent sales`
      };
    } catch (error) {
      console.error('Error calculating optimal price:', error);
      throw error;
    }
  }

  async getMarketInsights(category = null) {
    try {
      let query = `
        SELECT
          p.category,
          COUNT(DISTINCT p.id) as product_count,
          AVG(p.price_per_kg) as avg_price,
          COUNT(DISTINCT p.farmer_id) as farmer_count,
          COUNT(DISTINCT o.id) as total_orders,
          AVG(p.available_quantity) as avg_inventory
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        WHERE p.status = 'available'
      `;

      const params = [];
      if (category) {
        query += ' AND p.category = ?';
        params.push(category);
      }

      query += ` GROUP BY p.category ORDER BY total_orders DESC`;

      const [insights] = await db.query(query, params);
      return insights;
    } catch (error) {
      console.error('Error getting market insights:', error);
      throw error;
    }
  }

  async applyOptimalPrice(productId, farmerId) {
    try {
      const [product] = await db.query(
        'SELECT * FROM products WHERE id = ? AND farmer_id = ?',
        [productId, farmerId]
      );

      if (product.length === 0) {
        throw new Error('Product not found or unauthorized');
      }

      const pricing = await this.calculateOptimalPrice(productId);

      await db.query(
        'INSERT INTO price_history (product_id, farmer_id, old_price, new_price, reason) VALUES (?, ?, ?, ?, ?)',
        [productId, farmerId, product[0].price_per_kg, pricing.recommendedPrice, 'AI optimal pricing']
      );

      await db.query(
        'UPDATE products SET price_per_kg = ? WHERE id = ?',
        [pricing.recommendedPrice, productId]
      );

      return {
        message: 'Price updated successfully',
        oldPrice: product[0].price_per_kg,
        newPrice: pricing.recommendedPrice,
        increase: pricing.potentialIncrease
      };
    } catch (error) {
      console.error('Error applying optimal price:', error);
      throw error;
    }
  }
}

module.exports = new AIPricingEngine();
