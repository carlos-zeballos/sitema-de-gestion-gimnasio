const db = require('./db');

async function runMigrations() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clientes_bajas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NOT NULL,
      estado_anterior VARCHAR(20) NOT NULL,
      estado_nuevo VARCHAR(20) NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      registrado_por INT NOT NULL,
      fecha_baja DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_bajas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
      CONSTRAINT fk_bajas_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
      INDEX idx_bajas_cliente_fecha (cliente_id, fecha_baja)
    ) ENGINE=InnoDB
  `);
}

module.exports = { runMigrations };
