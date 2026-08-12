const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

async function fix() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const recepcionHash = await bcrypt.hash('recepcion123', 10);
    const entrenadorHash = await bcrypt.hash('entrenador123', 10);

    console.log('Actualizando contrasenas de prueba...');

    await db.execute('UPDATE usuarios SET password_hash = ? WHERE username = ? OR correo = ?', [adminHash, 'admin', 'admin@gym.com']);
    await db.execute('UPDATE usuarios SET password_hash = ? WHERE username = ? OR correo = ?', [recepcionHash, 'recep', 'recepcion@gym.com']);
    await db.execute('UPDATE usuarios SET password_hash = ? WHERE username = ? OR correo = ?', [entrenadorHash, 'trainer', 'entrenador@gym.com']);

    console.log('Contrasenas actualizadas: admin/admin123, recep/recepcion123, trainer/entrenador123');
  } catch (err) {
    console.error('Error al actualizar contrasenas:', err.message);
  } finally {
    process.exit(0);
  }
}

fix();
