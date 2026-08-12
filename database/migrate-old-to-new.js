const path = require('path');
const mysql = require('../backend/node_modules/mysql2/promise');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const hasColumn = async (connection, table, column) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].total > 0;
};

const hasTable = async (connection, table) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].total > 0;
};

const addColumnIfMissing = async (connection, table, column, definition) => {
  if (!(await hasColumn(connection, table, column))) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`ADD ${table}.${column}`);
  }
};

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_gimnasio_gd',
    multipleStatements: true
  });

  try {
    await connection.beginTransaction();

    if (!(await hasTable(connection, 'roles'))) {
      await connection.query(`
        CREATE TABLE roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre_rol VARCHAR(50) NOT NULL UNIQUE,
          descripcion VARCHAR(255)
        ) ENGINE=InnoDB
      `);
      console.log('CREATE roles');
    }

    await connection.query(`
      INSERT IGNORE INTO roles (id, nombre_rol, descripcion) VALUES
      (1, 'Administrador', 'Acceso completo a administracion, reportes y configuracion'),
      (2, 'Colaborador_Recepcion', 'Registro de ingresos, clientes y pagos operativos'),
      (3, 'Entrenador', 'Consulta operativa limitada')
    `);

    if (!(await hasTable(connection, 'auditoria'))) {
      await connection.query(`
        CREATE TABLE auditoria (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NULL,
          accion VARCHAR(50) NOT NULL,
          detalle VARCHAR(500),
          fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_auditoria_fecha (fecha_hora),
          INDEX idx_auditoria_accion (accion)
        ) ENGINE=InnoDB
      `);
      console.log('CREATE auditoria');
    }

    await addColumnIfMissing(connection, 'usuarios', 'username', 'VARCHAR(8) NULL');
    await addColumnIfMissing(connection, 'usuarios', 'correo', 'VARCHAR(150) NULL');
    await addColumnIfMissing(connection, 'usuarios', 'rol_id', 'INT NULL');
    await addColumnIfMissing(connection, 'usuarios', 'estado', "VARCHAR(20) NULL DEFAULT 'Activo'");
    await addColumnIfMissing(connection, 'usuarios', 'intentos_fallidos', 'INT NOT NULL DEFAULT 0');
    await addColumnIfMissing(connection, 'usuarios', 'bloqueado_hasta', 'DATETIME NULL');
    await addColumnIfMissing(connection, 'usuarios', 'ultimo_login', 'DATETIME NULL');
    await addColumnIfMissing(connection, 'usuarios', 'creado_en', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');

    await connection.query(`
      UPDATE usuarios
      SET correo = COALESCE(correo, email),
          username = COALESCE(username, LEFT(SUBSTRING_INDEX(email, '@', 1), 8)),
          rol_id = COALESCE(rol_id, CASE WHEN rol = 'admin' THEN 1 ELSE 2 END),
          estado = COALESCE(estado, CASE WHEN activo = 1 THEN 'Activo' ELSE 'Inactivo' END)
    `);

    await addColumnIfMissing(connection, 'clientes', 'nombre_completo', 'VARCHAR(180) NULL');
    await addColumnIfMissing(connection, 'clientes', 'correo', 'VARCHAR(150) NULL');
    await addColumnIfMissing(connection, 'clientes', 'estado', "VARCHAR(20) NULL DEFAULT 'Activo'");
    await addColumnIfMissing(connection, 'clientes', 'fecha_baja', 'DATETIME NULL');
    await addColumnIfMissing(connection, 'clientes', 'creado_en', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    await connection.query(`
      UPDATE clientes
      SET nombre_completo = COALESCE(nombre_completo, TRIM(CONCAT(COALESCE(nombre, ''), ' ', COALESCE(apellido, '')))),
          correo = COALESCE(correo, email),
          estado = COALESCE(estado, CASE WHEN activo = 1 THEN 'Activo' ELSE 'Inactivo' END),
          creado_en = COALESCE(creado_en, created_at)
    `);

    await addColumnIfMissing(connection, 'membresias', 'fecha_vencimiento', 'DATE NULL');
    await addColumnIfMissing(connection, 'membresias', 'creado_en', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    await connection.query("ALTER TABLE membresias MODIFY tipo VARCHAR(20) NOT NULL");
    await connection.query("ALTER TABLE membresias MODIFY estado VARCHAR(30) NOT NULL");
    await connection.query(`
      UPDATE membresias
      SET fecha_vencimiento = COALESCE(fecha_vencimiento, fecha_fin),
          creado_en = COALESCE(creado_en, created_at),
          tipo = CASE
            WHEN tipo IN ('semanal', 'quincenal', 'mensual') THEN tipo
            ELSE 'mensual'
          END,
          estado = CASE
            WHEN fecha_fin < CURDATE() THEN 'Vencida'
            WHEN fecha_fin <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
            ELSE 'Activa'
          END
    `);

    await addColumnIfMissing(connection, 'pagos', 'tipo_membresia', 'VARCHAR(20) NULL');
    await addColumnIfMissing(connection, 'pagos', 'fecha_vencimiento_generada', 'DATE NULL');
    await addColumnIfMissing(connection, 'pagos', 'creado_en', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    await connection.query("ALTER TABLE pagos MODIFY metodo_pago VARCHAR(20) NOT NULL");
    await connection.query(`
      UPDATE pagos p
      LEFT JOIN membresias m ON m.id = p.membresia_id
      SET p.tipo_membresia = COALESCE(p.tipo_membresia, m.tipo, 'mensual'),
          p.fecha_vencimiento_generada = COALESCE(p.fecha_vencimiento_generada, m.fecha_vencimiento, p.fecha_pago),
          p.creado_en = COALESCE(p.creado_en, p.created_at),
          p.metodo_pago = CASE WHEN p.metodo_pago = 'transferencia' THEN 'otro' ELSE p.metodo_pago END
    `);

    await addColumnIfMissing(connection, 'asistencias', 'estado_membresia_al_ingreso', "VARCHAR(30) NULL");
    await connection.query(`
      UPDATE asistencias a
      LEFT JOIN membresias m ON m.cliente_id = a.cliente_id
      SET a.estado_membresia_al_ingreso = COALESCE(a.estado_membresia_al_ingreso, CASE WHEN a.acceso_concedido = 1 THEN 'Activa' ELSE 'Vencida' END)
    `);

    const indexes = [
      ['usuarios', 'idx_usuarios_username', 'CREATE INDEX idx_usuarios_username ON usuarios(username)'],
      ['usuarios', 'idx_usuarios_correo', 'CREATE INDEX idx_usuarios_correo ON usuarios(correo)'],
      ['clientes', 'idx_clientes_estado', 'CREATE INDEX idx_clientes_estado ON clientes(estado)'],
      ['membresias', 'idx_membresias_vencimiento', 'CREATE INDEX idx_membresias_vencimiento ON membresias(fecha_vencimiento)']
    ];

    for (const [table, indexName, sql] of indexes) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, indexName]
      );
      if (rows[0].total === 0) await connection.query(sql);
    }

    await connection.commit();
    console.log('Migracion compatible completada correctamente.');
  } catch (err) {
    await connection.rollback();
    console.error('Error en migracion:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
};

run();
