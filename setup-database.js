const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
};

const schema = `
CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'agroconnect'};

USE ${process.env.DB_NAME || 'agroconnect'};

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('farmer', 'buyer', 'admin') NOT NULL,
  address TEXT,
  village VARCHAR(255),
  status ENUM('pending', 'active', 'suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  farmer_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price_per_kg DECIMAL(10, 2) NOT NULL,
  available_quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  image_url VARCHAR(500),
  harvest_date DATE,
  status ENUM('available', 'out_of_stock', 'discontinued') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_farmer (farmer_id),
  INDEX idx_status (status),
  INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date DATE,
  status ENUM('pending', 'confirmed', 'delivered', 'cancelled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_buyer (buyer_id),
  INDEX idx_farmer (farmer_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('order', 'system', 'announcement') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_role ENUM('all', 'farmer', 'buyer', 'specific') DEFAULT 'all',
  target_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_admin (admin_id),
  INDEX idx_target (target_role),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_conversation (buyer_id, farmer_id),
  INDEX idx_buyer (buyer_id),
  INDEX idx_farmer (farmer_id),
  INDEX idx_last_message (last_message_at)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
);

INSERT INTO users (name, email, password, role, address, village, status)
VALUES ('Admin User', 'admin@agroconnect.com', '$2a$10$nCOwyJXX5R2.FTLmIg4Rd.hB6xne6GL3dgAK271LfXwrCh7Q.yB8G', 'admin', 'GEC Circle, Chattogram', 'Chattogram', 'active')
ON DUPLICATE KEY UPDATE password='$2a$10$nCOwyJXX5R2.FTLmIg4Rd.hB6xne6GL3dgAK271LfXwrCh7Q.yB8G';
`;

async function setupDatabase() {
  let connection;

  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(dbConfig);

    console.log('Connected successfully!');
    console.log('Creating database and tables...');

    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log(`Database "${process.env.DB_NAME || 'agroconnect'}" is ready to use.`);
    console.log('\nDefault admin credentials:');
    console.log('Email: admin@agroconnect.com');
    console.log('Password: admin123 (You should change this after first login)');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('\nPlease make sure:');
    console.error('1. MySQL server is running');
    console.error('2. Your .env file has correct database credentials');
    console.error('3. The database user has sufficient privileges');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
