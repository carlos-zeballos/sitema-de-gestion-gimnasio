const db = require('../config/db');
const response = require('../utils/responseHelper');

const getClientes = async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado = 'Activo' THEN 1 ELSE 0 END), 0) AS activos,
        COALESCE(SUM(CASE WHEN estado = 'Inactivo' THEN 1 ELSE 0 END), 0) AS inactivos
      FROM clientes
    `);

    const { total, activos, inactivos } = rows[0];
    const porcentaje = total > 0 ? parseFloat(((activos / total) * 100).toFixed(2)) : 0;

    return response.success(res, { total, activos, inactivos, porcentaje }, 'Reporte de clientes obtenido exitosamente.');
  } catch (err) {
    next(err);
  }
};

const getPagos = async (req, res, next) => {
  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return response.error(res, 'Debe proveer los parametros mes y anio en la consulta.', 400);
  }

  try {
    const [summaryRows] = await db.execute(
      `SELECT COUNT(*) AS total_pagos, COALESCE(SUM(monto), 0) AS monto_total
       FROM pagos
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?`,
      [mes, anio]
    );

    const [tipoRows] = await db.execute(
      `SELECT tipo_membresia, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS subtotal
       FROM pagos
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?
       GROUP BY tipo_membresia
       ORDER BY tipo_membresia`,
      [mes, anio]
    );

    const [methodRows] = await db.execute(
      `SELECT metodo_pago, COUNT(*) AS total_pagos, COALESCE(SUM(monto), 0) AS monto_total
       FROM pagos
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?
       GROUP BY metodo_pago`,
      [mes, anio]
    );

    const { total_pagos, monto_total } = summaryRows[0];

    return response.success(res, {
      total_pagos,
      monto_total: parseFloat(monto_total),
      desglose_por_tipo: tipoRows.map((row) => ({
        tipo_membresia: row.tipo_membresia,
        cantidad: row.cantidad,
        subtotal: parseFloat(row.subtotal)
      })),
      por_metodo: methodRows.map((row) => ({
        metodo_pago: row.metodo_pago,
        total_pagos: row.total_pagos,
        monto_total: parseFloat(row.monto_total)
      })),
      generado_en: new Date().toISOString()
    }, `Reporte de ingresos para ${mes}/${anio} obtenido correctamente.`);
  } catch (err) {
    next(err);
  }
};

const getIngresos = async (req, res, next) => {
  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return response.error(res, 'Debe proveer los parametros mes y anio en la consulta.', 400);
  }

  try {
    const [summaryRows] = await db.execute(
      `SELECT COUNT(*) AS total_pagos, COALESCE(SUM(monto), 0) AS monto_total
       FROM pagos
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?`,
      [mes, anio]
    );

    const [detailRows] = await db.execute(
      `SELECT tipo_membresia AS tipo, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS subtotal
       FROM pagos
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?
       GROUP BY tipo_membresia
       ORDER BY FIELD(tipo_membresia, 'semanal', 'quincenal', 'mensual')`,
      [mes, anio]
    );
    const [paymentRows] = await db.execute(`
      SELECT p.id, p.fecha_pago, p.monto, p.metodo_pago, p.tipo_membresia,
             p.fecha_vencimiento_generada, c.id AS cliente_id, c.nombre_completo, c.dni
      FROM pagos p INNER JOIN clientes c ON c.id = p.cliente_id
      WHERE MONTH(p.fecha_pago) = ? AND YEAR(p.fecha_pago) = ?
      ORDER BY p.fecha_pago DESC, p.id DESC`, [mes, anio]);

    return response.success(res, {
      gimnasio: 'GD Madrid S.A.',
      titulo: 'Reporte mensual de ingresos',
      periodo: `${mes}/${anio}`,
      generado_en: new Date().toISOString(),
      total_pagos: summaryRows[0].total_pagos,
      monto_total: parseFloat(summaryRows[0].monto_total),
      desglose: detailRows.map((row) => ({
        tipo: row.tipo,
        cantidad: row.cantidad,
        subtotal: parseFloat(row.subtotal)
      })),
      pagos: paymentRows.map((row) => ({ ...row, monto: parseFloat(row.monto) }))
    }, 'Reporte mensual de ingresos generado correctamente.');
  } catch (err) {
    next(err);
  }
};

const getRetencion = async (req, res, next) => {
  const { mes, anio } = req.query;
  const periodDate = mes && anio
    ? `${anio}-${String(mes).padStart(2, '0')}-01`
    : new Date().toISOString().slice(0, 10);

  try {
    const [summaryRows] = await db.execute(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN estado = 'Activo' THEN 1 ELSE 0 END), 0) AS activos,
             COALESCE(SUM(CASE WHEN estado = 'Inactivo' THEN 1 ELSE 0 END), 0) AS inactivos
      FROM clientes
      WHERE fecha_inscripcion <= LAST_DAY(?)
    `, [periodDate]);

    const summary = summaryRows[0];
    const porcentaje = summary.total > 0
      ? parseFloat(((summary.activos / summary.total) * 100).toFixed(2))
      : 0;

    const [inactivosRows] = await db.execute(`
      SELECT c.id, c.nombre_completo, c.dni, c.telefono,
             COALESCE(MAX(p.fecha_pago), 'Sin pagos') AS ultimo_pago
      FROM clientes c
      LEFT JOIN pagos p ON p.cliente_id = c.id
      WHERE c.estado = 'Inactivo'
        AND c.fecha_inscripcion <= LAST_DAY(?)
      GROUP BY c.id, c.nombre_completo, c.dni, c.telefono
      ORDER BY c.nombre_completo ASC
    `, [periodDate]);
    const [activosRows] = await db.execute(`
      SELECT c.id, c.nombre_completo, c.dni, c.telefono,
             COALESCE(MAX(p.fecha_pago), 'Sin pagos') AS ultimo_pago
      FROM clientes c LEFT JOIN pagos p ON p.cliente_id = c.id
      WHERE c.estado = 'Activo' AND c.fecha_inscripcion <= LAST_DAY(?)
      GROUP BY c.id, c.nombre_completo, c.dni, c.telefono
      ORDER BY c.nombre_completo ASC`, [periodDate]);

    return response.success(res, {
      gimnasio: 'GD Madrid S.A.',
      titulo: 'Reporte de retencion de clientes',
      periodo: mes && anio ? `${mes}/${anio}` : 'Actual',
      generado_en: new Date().toISOString(),
      total_clientes: summary.total,
      activos: summary.activos,
      inactivos: summary.inactivos,
      porcentaje_retencion: porcentaje,
      formula: '(Clientes Activos / Total de Clientes) x 100',
      clientes_inactivos: inactivosRows,
      clientes_activos: activosRows
    }, 'Reporte de retencion generado correctamente.');
  } catch (err) {
    next(err);
  }
};

const getDashboardIndicadores = async (req, res, next) => {
  try {
    await db.execute(`
      UPDATE membresias
      SET estado = CASE
        WHEN fecha_vencimiento < CURDATE() THEN 'Vencida'
        WHEN fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
        ELSE 'Activa'
      END
    `);

    const [activeRows] = await db.execute(`
      SELECT COUNT(DISTINCT m.cliente_id) AS total_activos
      FROM membresias m
      INNER JOIN clientes c ON c.id = m.cliente_id
      WHERE c.estado = 'Activo'
        AND m.estado = 'Activa'
    `);

    const [upcomingRows] = await db.execute(`
      SELECT COUNT(DISTINCT m.cliente_id) AS total_proximos_vencer
      FROM membresias m
      INNER JOIN clientes c ON c.id = m.cliente_id
      WHERE c.estado = 'Activo'
        AND m.estado = 'Proxima_a_vencer'
    `);

    const [expiredRows] = await db.execute(`
      SELECT COUNT(DISTINCT c.id) AS total_vencidos
      FROM clientes c
      LEFT JOIN (
        SELECT m1.*
        FROM membresias m1
        INNER JOIN (
          SELECT cliente_id, MAX(creado_en) AS max_creado
          FROM membresias
          GROUP BY cliente_id
        ) lm ON lm.cliente_id = m1.cliente_id AND lm.max_creado = m1.creado_en
      ) m ON m.cliente_id = c.id
      WHERE c.estado = 'Activo'
        AND (m.id IS NULL OR m.estado = 'Vencida')
    `);

    return response.success(res, {
      miembros_activos: activeRows[0].total_activos,
      miembros_vencidos: expiredRows[0].total_vencidos,
      miembros_proximos_vencer: upcomingRows[0].total_proximos_vencer
    }, 'Indicadores del dashboard cargados correctamente.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getClientes,
  getPagos,
  getIngresos,
  getRetencion,
  getDashboardIndicadores
};
