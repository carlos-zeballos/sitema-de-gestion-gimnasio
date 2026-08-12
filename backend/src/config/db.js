const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'crm_gimnasio_gd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const promisePool = pool.promise();

// Test de conexión inicial en desarrollo
promisePool.getConnection()
  .then(connection => {
    console.log('✅ Conexión exitosa a la base de datos MySQL (Pool activo).');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión al pool MySQL:', err.message);
  });

module.exports = promisePool;
