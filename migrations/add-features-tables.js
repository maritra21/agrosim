const db = require('../config/database');

async function addFeaturesTables() {
  try {
    console.log('Creating price_history table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        farmer_id INT NOT NULL,
        old_price DECIMAL(10, 2) NOT NULL,
        new_price DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (farmer_id) REFERENCES users(id),
        INDEX idx_product (product_id),
        INDEX idx_farmer (farmer_id)
      )
    `);
    console.log('✓ price_history table created');

    console.log('Creating supply_chain_ledger table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS supply_chain_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ledger_id VARCHAR(50) UNIQUE NOT NULL,
        product_id INT NOT NULL,
        farmer_id INT,
        event_type VARCHAR(100) NOT NULL,
        event_data JSON NOT NULL,
        transaction_hash VARCHAR(255) NOT NULL,
        qr_code LONGTEXT,
        status VARCHAR(50) DEFAULT 'recorded',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (farmer_id) REFERENCES users(id),
        INDEX idx_product (product_id),
        INDEX idx_ledger (ledger_id),
        INDEX idx_event (event_type)
      )
    `);
    console.log('✓ supply_chain_ledger table created');

    console.log('\n✅ All feature tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

addFeaturesTables();
