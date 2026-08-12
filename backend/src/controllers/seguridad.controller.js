const fs = require('fs/promises');
const path = require('path');
const db = require('../config/db');
const response = require('../utils/responseHelper');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
const BACKUP_MARKER = '-- CRM_GD_MADRID_BACKUP';

const sqlValue = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

const ensureBackupDir = async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
};

const listBackups = async (req, res, next) => {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    for (const file of files.filter((name) => name.endsWith('.sql'))) {
      const stat = await fs.stat(path.join(BACKUP_DIR, file));
      backups.push({ file, size: stat.size, creado_en: stat.birthtime });
    }
    backups.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    return response.success(res, backups, 'Backups listados correctamente.');
  } catch (err) {
    next(err);
  }
};

const createBackup = async (req, res, next) => {
  const tables = ['roles', 'usuarios', 'clientes', 'membresias', 'pagos', 'asistencias', 'auditoria', 'clientes_bajas'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const fileName = `backup_crm_gd_madrid_${stamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  try {
    await ensureBackupDir();

    const lines = [
      BACKUP_MARKER,
      `-- generated_at=${new Date().toISOString()}`,
      'SET FOREIGN_KEY_CHECKS = 0;',
      'CREATE DATABASE IF NOT EXISTS crm_gimnasio_gd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
      'USE crm_gimnasio_gd;'
    ];

    for (const table of tables) {
      const [createRows] = await db.execute(`SHOW CREATE TABLE ${table}`);
      const createSql = createRows[0]['Create Table'];
      lines.push(`DROP TABLE IF EXISTS ${table};`);
      lines.push(`${createSql};`);
    }

    for (const table of tables) {
      const [rows] = await db.execute(`SELECT * FROM ${table}`);
      for (const row of rows) {
        const columns = Object.keys(row).map((col) => `\`${col}\``).join(', ');
        const values = Object.values(row).map(sqlValue).join(', ');
        lines.push(`INSERT INTO ${table} (${columns}) VALUES (${values});`);
      }
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'BACKUP_BD', fileName]
    );

    return response.success(res, { file: fileName, path: filePath }, 'Backup generado correctamente.', 201);
  } catch (err) {
    next(err);
  }
};

const downloadBackup = async (req, res, next) => {
  try {
    const file = path.basename(req.params.file);
    const filePath = path.join(BACKUP_DIR, file);
    await fs.access(filePath);
    return res.download(filePath);
  } catch (err) {
    next(err);
  }
};

const restoreBackup = async (req, res, next) => {
  const file = path.basename(req.body.file || '');
  if (!file.endsWith('.sql')) {
    return response.error(res, 'Debe seleccionar un archivo .sql valido.', 400);
  }

  try {
    const filePath = path.join(BACKUP_DIR, file);
    const sql = await fs.readFile(filePath, 'utf8');
    if (!sql.startsWith(BACKUP_MARKER)) {
      return response.error(res, 'El archivo no corresponde a un backup del sistema.', 400);
    }

    const executableSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const statements = executableSql
      .split(/;\s*\n/)
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      await db.query(statement);
    }

    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'RESTORE_BD', file]
    );

    return response.success(res, { file }, 'Restauracion finalizada correctamente.');
  } catch (err) {
    next(err);
  }
};

const seedExhibition = async (req, res, next) => {
  const connection = await db.getConnection();
  const today = new Date();
  const iso = (date) => date.toISOString().slice(0, 10);
  const addDays = (days) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return iso(date);
  };
  const names = [
    ['Valeria', 'Paredes'], ['Andres', 'Caceres'], ['Camila', 'Ortega'], ['Fernando', 'Silva'],
    ['Daniela', 'Reyes'], ['Marco', 'Medina'], ['Gabriela', 'Campos'], ['Sergio', 'Vega'],
    ['Natalia', 'Aguilar'], ['Ricardo', 'Fuentes'], ['Monica', 'Soto'], ['Alonso', 'Peña'],
    ['Fiorella', 'Mora'], ['Bruno', 'Palacios'], ['Claudia', 'Espinoza'], ['Renato', 'Valdez'],
    ['Mariana', 'Ibarra'], ['Oscar', 'Zamora'], ['Paola', 'Miranda'], ['Hector', 'Chavez']
  ];

  try {
    await connection.beginTransaction();
    const summary = { activos_pagados: 0, inactivos: 0, proximos_vencer: 0, dados_baja: 0 };

    for (let index = 0; index < names.length; index += 1) {
      const number = index + 1;
      const dni = `82${String(number).padStart(6, '0')}`;
      const [nombre, apellido] = names[index];
      const correo = `demo20.${String(number).padStart(2, '0')}@gym.com`;
      const isInactive = index >= 12 && index < 16;
      const isUpcoming = index >= 16 && index < 18;
      const isDeactivated = index >= 18;
      const estadoCliente = (isInactive || isDeactivated) ? 'Inactivo' : 'Activo';

      const [existing] = await connection.execute('SELECT id FROM clientes WHERE dni = ?', [dni]);
      let clienteId;
      if (existing.length) {
        clienteId = existing[0].id;
        await connection.execute(
          'UPDATE clientes SET nombre = ?, apellido = ?, nombre_completo = ?, telefono = ?, correo = ?, email = ?, estado = ?, activo = ?, fecha_baja = ? WHERE id = ?',
          [nombre, apellido, `${nombre} ${apellido}`, `920000${String(number).padStart(3, '0')}`, correo, correo, estadoCliente, estadoCliente === 'Activo' ? 1 : 0, isDeactivated ? new Date() : null, clienteId]
        );
        await connection.execute('DELETE FROM pagos WHERE cliente_id = ?', [clienteId]);
        await connection.execute('DELETE FROM membresias WHERE cliente_id = ?', [clienteId]);
        await connection.execute('DELETE FROM clientes_bajas WHERE cliente_id = ?', [clienteId]);
      } else {
        const [created] = await connection.execute(
          `INSERT INTO clientes (nombre, apellido, nombre_completo, dni, telefono, correo, email, fecha_inscripcion, estado, activo, fecha_baja)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nombre, apellido, `${nombre} ${apellido}`, dni, `920000${String(number).padStart(3, '0')}`, correo, correo, addDays(-30 + index), estadoCliente, estadoCliente === 'Activo' ? 1 : 0, isDeactivated ? new Date() : null]
        );
        clienteId = created.insertId;
      }

      if (!isInactive && !isDeactivated) {
        const endDate = isUpcoming ? addDays(index === 16 ? 2 : 5) : addDays(15 + index);
        const [membership] = await connection.execute(
          `INSERT INTO membresias (cliente_id, tipo, fecha_inicio, fecha_fin, fecha_vencimiento, estado, monto_pagado)
           VALUES (?, 'mensual', ?, ?, ?, ?, 90.00)`,
          [clienteId, addDays(-15), endDate, endDate, isUpcoming ? 'Proxima_a_vencer' : 'Activa']
        );
        await connection.execute(
          `INSERT INTO pagos (cliente_id, membresia_id, monto, fecha_pago, metodo_pago, tipo_membresia, fecha_vencimiento_generada, registrado_por, observacion)
           VALUES (?, ?, 90.00, ?, ?, 'mensual', ?, ?, 'Carga de exposicion 20 clientes')`,
          [clienteId, membership.insertId, addDays(-(index % 12)), ['efectivo', 'yape', 'plin'][index % 3], endDate, req.user.id]
        );
        summary[isUpcoming ? 'proximos_vencer' : 'activos_pagados'] += 1;
      } else if (isDeactivated) {
        await connection.execute(
          `INSERT INTO clientes_bajas (cliente_id, estado_anterior, estado_nuevo, motivo, registrado_por)
           VALUES (?, 'Activo', 'Inactivo', 'Baja demostrativa para exposicion', ?)`,
          [clienteId, req.user.id]
        );
        summary.dados_baja += 1;
      } else {
        summary.inactivos += 1;
      }
    }

    await connection.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'SEED_EXPOSICION', JSON.stringify(summary)]
    );
    await connection.commit();
    return response.success(res, { total: 20, ...summary, dni_desde: '82000001', dni_hasta: '82000020' }, 'Datos de exposicion generados correctamente.', 201);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = {
  listBackups,
  createBackup,
  downloadBackup,
  restoreBackup
  ,seedExhibition
};
