const db = require('./src/config/db');

async function check() {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.nombre, u.username, u.correo, r.nombre_rol, u.estado, u.ultimo_login
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      ORDER BY u.id
    `);
    console.log('--- USUARIOS EN BASE DE DATOS ---');
    console.table(rows);
    console.log('---------------------------------');
  } catch (err) {
    console.error('Error al consultar usuarios:', err.message);
  } finally {
    process.exit(0);
  }
}

check();
