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

  // Corrige exclusivamente los hashes defectuosos del seed original. La
  // condicion por hash preserva cualquier contrasena cambiada posteriormente.
  const seedPasswordFixes = [
    ['admin', '$2a$10$ZpuS47E/YmLvh5P9RfpzoOYZZ0.SsNTFPCtNWHmz9OLeZ6wBclMGy', '$2a$10$I5FcxiSEE9l41x.nHpv0VelJrkxBDDYDSsY0M3a/awFzkoDkgl.b6'],
    ['recep', '$2a$10$hIrAIx/xhcDwRTbLy.IdQu9eJh1VPNx/8oxpBdH9e4TT2R2pxhcC6', '$2a$10$ZtKsiKP6LcMaWcib790izep6JacUfNj/3NNRUbS6D/lxd4Fy/.McC'],
    ['trainer', '$2a$10$MZ0zt/YLoT4QLSB6pHO2AetU3thx5oyt4icSfR.7LxSy8KJCvDZSO', '$2a$10$0Y2afhJkoxJnTCkD/gk38uQbCKBCgDjMrHbUafX6rW8mmgDyDP.c2']
  ];
  for (const [username, oldHash, newHash] of seedPasswordFixes) {
    await db.execute(
      'UPDATE usuarios SET password_hash = ? WHERE username = ? AND password_hash = ?',
      [newHash, username, oldHash]
    );
  }
}

module.exports = { runMigrations };
