const db = require('./src/config/db');
const { runMigrations } = require('./src/config/migrations');

const scenarios = [
  { dni: '80000001', nombre: 'QA Cliente Recien Creado', correo: 'qa.nuevo@gdmadrid.test', kind: 'nuevo' },
  { dni: '80000002', nombre: 'QA Cliente Proximo a Vencer', correo: 'qa.proximo@gdmadrid.test', kind: 'proximo' },
  { dni: '80000003', nombre: 'QA Cliente Vencido Hoy', correo: 'qa.vencido@gdmadrid.test', kind: 'vencido' }
];

async function seed() {
  await runMigrations();
  for (const item of scenarios) {
    await db.execute(`
      INSERT INTO clientes (nombre, apellido, nombre_completo, dni, telefono, email, correo, fecha_inscripcion, activo, estado)
      VALUES ('QA', ?, ?, ?, '900000000', ?, ?, CURDATE(), 1, 'Activo')
      ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo), estado='Activo', activo=1, fecha_baja=NULL`,
      [item.nombre.replace(/^QA /, ''), item.nombre, item.dni, item.correo, item.correo]);
    const [[client]] = await db.execute('SELECT id FROM clientes WHERE dni = ?', [item.dni]);
    if (item.kind === 'nuevo') {
      await db.execute('DELETE FROM membresias WHERE cliente_id = ?', [client.id]);
      continue;
    }
    const offset = item.kind === 'proximo' ? 3 : -1;
    const state = item.kind === 'proximo' ? 'Proxima_a_vencer' : 'Vencida';
    await db.execute('DELETE FROM membresias WHERE cliente_id = ?', [client.id]);
    await db.execute(`
      INSERT INTO membresias (cliente_id, tipo, fecha_inicio, fecha_fin, fecha_vencimiento, estado, monto_pagado, created_at, creado_en)
      VALUES (?, 'mensual', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL ? DAY),
              DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 90, NOW(), NOW())`,
      [client.id, offset, offset, state]);
  }
  const [rows] = await db.execute(`
    SELECT c.id, c.nombre_completo, c.dni, m.fecha_vencimiento,
      CASE WHEN m.id IS NULL THEN 'Sin_membresia' WHEN m.fecha_vencimiento < CURDATE() THEN 'Vencida'
           WHEN m.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer' ELSE 'Activa' END estado
    FROM clientes c LEFT JOIN membresias m ON m.id=(SELECT id FROM membresias WHERE cliente_id=c.id ORDER BY creado_en DESC,id DESC LIMIT 1)
    WHERE c.dni IN ('80000001','80000002','80000003') ORDER BY c.dni`);
  console.table(rows);
  await db.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
