const db = require('../config/database');
const crypto = require('crypto');

class SupplyChainLedger {
  generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  generateQRCode(ledgerId) {
    return `${process.env.BASE_URL || 'http://localhost:3000'}/verify-supply-chain?ledger=${ledgerId}`;
  }

  async createProductLedger(productId, farmerId) {
    try {
      const [product] = await db.query(
        'SELECT * FROM products WHERE id = ? AND farmer_id = ?',
        [productId, farmerId]
      );

      if (product.length === 0) {
        throw new Error('Product not found');
      }

      const prod = product[0];
      const ledgerData = {
        productId,
        farmerId,
        productName: prod.name,
        category: prod.category,
        timestamp: new Date().toISOString(),
        quantity: prod.available_quantity,
        unit: prod.unit
      };

      const ledgerId = crypto.randomBytes(8).toString('hex');
      const hash = this.generateHash(ledgerData);
      const qrCode = this.generateQRCode(ledgerId);

      await db.query(
        `INSERT INTO supply_chain_ledger
         (ledger_id, product_id, farmer_id, event_type, event_data, transaction_hash, qr_code, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ledgerId, productId, farmerId, 'product_created', JSON.stringify(ledgerData), hash, qrCode, 'active']
      );

      return { ledgerId, hash, qrCode };
    } catch (error) {
      console.error('Error creating product ledger:', error);
      throw error;
    }
  }

  async recordEvent(productId, eventType, eventData, userId) {
    try {
      const [ledgers] = await db.query(
        'SELECT ledger_id FROM supply_chain_ledger WHERE product_id = ? ORDER BY created_at DESC LIMIT 1',
        [productId]
      );

      if (ledgers.length === 0) {
        throw new Error('No ledger found for product');
      }

      const ledgerId = ledgers[0].ledger_id;
      const data = {
        ledgerId,
        productId,
        eventType,
        timestamp: new Date().toISOString(),
        userId,
        ...eventData
      };

      const hash = this.generateHash(data);

      await db.query(
        `INSERT INTO supply_chain_ledger
         (ledger_id, product_id, event_type, event_data, transaction_hash, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ledgerId, productId, eventType, JSON.stringify(data), hash, 'recorded']
      );

      return { success: true, hash, timestamp: data.timestamp };
    } catch (error) {
      console.error('Error recording event:', error);
      throw error;
    }
  }

  async getSupplyChainJourney(productId) {
    try {
      const [journey] = await db.query(
        `SELECT
          ledger_id,
          event_type,
          event_data,
          transaction_hash,
          created_at,
          qr_code
        FROM supply_chain_ledger
        WHERE product_id = ?
        ORDER BY created_at ASC`,
        [productId]
      );

      const events = journey.map((event, index) => ({
        stepNumber: index + 1,
        eventType: event.event_type,
        timestamp: event.created_at,
        hash: event.transaction_hash,
        data: JSON.parse(event.event_data),
        qrCode: event.qr_code,
        verified: true
      }));

      return events;
    } catch (error) {
      console.error('Error getting supply chain journey:', error);
      throw error;
    }
  }

  async verifyIntegrity(ledgerId) {
    try {
      const [ledgers] = await db.query(
        `SELECT
          id,
          event_type,
          event_data,
          transaction_hash,
          created_at
        FROM supply_chain_ledger
        WHERE ledger_id = ?
        ORDER BY created_at ASC`,
        [ledgerId]
      );

      if (ledgers.length === 0) {
        return { verified: false, reason: 'Ledger not found' };
      }

      let chainValid = true;
      const verifications = [];

      for (let i = 0; i < ledgers.length; i++) {
        const event = ledgers[i];
        const hash = this.generateHash({
          eventType: event.event_type,
          eventData: JSON.parse(event.event_data),
          timestamp: event.created_at
        });

        const matches = hash === event.transaction_hash;
        verifications.push({
          step: i + 1,
          eventType: event.event_type,
          timestamp: event.created_at,
          hashVerified: matches
        });

        if (!matches) chainValid = false;
      }

      return {
        verified: chainValid,
        ledgerId,
        totalEvents: ledgers.length,
        verifications,
        integrityStatus: chainValid ? 'Perfect' : 'Tampered'
      };
    } catch (error) {
      console.error('Error verifying integrity:', error);
      throw error;
    }
  }

  async getChainStatistics(ledgerId = null) {
    try {
      let query = `
        SELECT
          COUNT(DISTINCT ledger_id) as total_chains,
          COUNT(DISTINCT product_id) as products_tracked,
          COUNT(*) as total_events,
          COUNT(DISTINCT event_type) as event_types
        FROM supply_chain_ledger
      `;

      const params = [];
      if (ledgerId) {
        query += ' WHERE ledger_id = ?';
        params.push(ledgerId);
      }

      const [stats] = await db.query(query, params);
      return stats[0];
    } catch (error) {
      console.error('Error getting chain statistics:', error);
      throw error;
    }
  }
}

module.exports = new SupplyChainLedger();
