const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agroconnect',
  port: process.env.DB_PORT || 3306
};

async function fixAdminPassword() {
  let connection;

  try {
    console.log('Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');

    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('\nGenerated password hash for "admin123":', hashedPassword);

    const [result] = await connection.query(
      `UPDATE users SET password = ? WHERE email = 'admin@agroconnect.com'`,
      [hashedPassword]
    );

    if (result.affectedRows > 0) {
      console.log('\n✅ Admin password updated successfully!');
      console.log('\nYou can now login with:');
      console.log('Email: admin@agroconnect.com');
      console.log('Password: admin123');
    } else {
      console.log('\n⚠️  Admin user not found. Creating admin user...');

      await connection.query(
        `INSERT INTO users (name, email, password, role, address, village, status)
         VALUES ('Admin User', 'admin@agroconnect.com', ?, 'admin', 'GEC Circle, Chattogram', 'Chattogram', 'active')`,
        [hashedPassword]
      );

      console.log('\n✅ Admin user created successfully!');
      console.log('\nYou can now login with:');
      console.log('Email: admin@agroconnect.com');
      console.log('Password: admin123');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  MySQL server is not running or not accessible.');
      console.error('\nPlease ensure:');
      console.error('1. MySQL server is installed and running');
      console.error('2. MySQL is listening on port 3306');
      console.error('3. Your .env file has correct credentials');
      console.error('\nTo start MySQL:');
      console.error('  - On Windows: Start MySQL service from Services');
      console.error('  - On Mac: brew services start mysql');
      console.error('  - On Linux: sudo systemctl start mysql');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n⚠️  Database does not exist.');
      console.error('\nPlease run: npm run setup-db');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminPassword();
