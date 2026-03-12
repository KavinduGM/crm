require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration(file) {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_db',
      multipleStatements: true,
    });

    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await connection.query(sql);
    console.log(`✅ Migration ${file} complete`);
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

const file = process.argv[2] || 'migrate_phase2.sql';
runMigration(file);
