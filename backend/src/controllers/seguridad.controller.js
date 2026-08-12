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
  const tables = ['roles', 'usuarios', 'clientes', 'membresias', 'pagos', 'asistencias', 'auditoria'];
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

module.exports = {
  listBackups,
  createBackup,
  downloadBackup,
  restoreBackup
};
