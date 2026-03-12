require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  let connection;
  try {
    // Connect without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    console.log('Connected to MySQL server');

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);
    console.log('Schema created successfully');

    // Switch to the database
    await connection.query('USE crm_db');

    // Check if admin already exists
    const [admins] = await connection.query(
      'SELECT id FROM admins WHERE email = ?',
      [process.env.ADMIN_EMAIL || 'admin@example.com']
    );

    if (admins.length === 0) {
      const passwordHash = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'Admin@123456',
        12
      );
      await connection.query(
        'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
        [
          process.env.ADMIN_NAME || 'Super Admin',
          process.env.ADMIN_EMAIL || 'admin@example.com',
          passwordHash,
        ]
      );
      console.log(`Admin created: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
    } else {
      console.log('Admin already exists, skipping seed');
    }

    console.log('\n✅ Database initialized successfully!');
    console.log(`Database: crm_db`);
    console.log(`Admin Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
    console.log(`Admin Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
