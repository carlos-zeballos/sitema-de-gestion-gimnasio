const db = require('../config/db');
const response = require('../utils/responseHelper');
const { calculateExpirationDate } = require('../utils/dateHelper');

const crear = async (req, res, next) => {
  const { cliente_id, monto, metodo_pago, tipo_membresia } = req.body;
  const fecha_pago = req.body.fecha_pago || new Date().toISOString().split('T')[0];
  const registrado_por = req.user.id;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [clientes] = await connection.execute(
      `SELECT c.id, m.id AS membresia_id, m.fecha_vencimiento,
              CASE WHEN m.id IS NULL THEN 'Sin_membresia'
                   WHEN m.fecha_vencimiento < CURDATE() THEN 'Vencida'
                   WHEN m.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
                   ELSE 'Activa' END AS membresia_estado
       FROM clientes c
       LEFT JOIN membresias m ON m.id = (SELECT id FROM membresias WHERE cliente_id = c.id ORDER BY creado_en DESC, id DESC LIMIT 1)
       WHERE c.id = ? AND c.estado = 'Activo' FOR UPDATE`,
      [cliente_id]
    );
    if (clientes.length === 0) {
      await connection.rollback();
      return response.error(res, 'Cliente no encontrado o inactivo.', 404);
    }

    if (!['Vencida', 'Proxima_a_vencer'].includes(clientes[0].membresia_estado)) {
      await connection.rollback();
      const message = clientes[0].membresia_estado === 'Sin_membresia'
        ? 'El cliente aun no tiene una membresia vencida o proxima a vencer.'
        : `La membresia sigue activa hasta ${String(clientes[0].fecha_vencimiento).slice(0, 10)}. Solo puede renovarse cuando este vencida o proxima a vencer.`;
      return response.error(res, message, 409);
    }

    await connection.execute(
      "UPDATE membresias SET estado = 'Vencida' WHERE cliente_id = ? AND estado IN ('Activa', 'Proxima_a_vencer')",
      [cliente_id]
    );

    const fecha_inicio = fecha_pago;
    const fecha_vencimiento = calculateExpirationDate(fecha_inicio, tipo_membresia);
    const estado = new Date(fecha_vencimiento + 'T00:00:00') <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ? 'Proxima_a_vencer'
      : 'Activa';

    const [insertMembresia] = await connection.execute(
      `INSERT INTO membresias (cliente_id, tipo, fecha_inicio, fecha_fin, fecha_vencimiento, estado, monto_pagado, created_at, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [cliente_id, tipo_membresia, fecha_inicio, fecha_vencimiento, fecha_vencimiento, estado, monto]
    );

    const membresia_id = insertMembresia.insertId;

    const [insertPago] = await connection.execute(
      `INSERT INTO pagos (cliente_id, membresia_id, monto, fecha_pago, metodo_pago, registrado_por, observacion, created_at, tipo_membresia, fecha_vencimiento_generada, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NOW(), ?, ?, NOW())`,
      [cliente_id, membresia_id, monto, fecha_inicio, metodo_pago, registrado_por, tipo_membresia, fecha_vencimiento]
    );

    await connection.commit();

    req.app.get('io')?.emit('pago:registrado', {
      pago_id: insertPago.insertId, cliente_id, monto: Number(monto), tipo_membresia, fecha_pago, fecha_vencimiento
    });
    req.app.get('io')?.emit('dashboard:actualizar', { motivo: 'pago_registrado' });

    return response.success(res, {
      pago_id: insertPago.insertId,
      membresia: {
        id: membresia_id,
        cliente_id,
        tipo: tipo_membresia,
        fecha_inicio,
        fecha_vencimiento,
        fecha_fin: fecha_vencimiento,
        estado
      }
    }, 'Pago registrado correctamente. La membresia del cliente ha sido activada.', 201);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

const getByCliente = async (req, res, next) => {
  try {
    const filters = ['p.cliente_id = ?'];
    const params = [req.params.clienteId];
    if (req.query.fechaInicio) { filters.push('DATE(p.fecha_pago) >= ?'); params.push(req.query.fechaInicio); }
    if (req.query.fechaFin) { filters.push('DATE(p.fecha_pago) <= ?'); params.push(req.query.fechaFin); }
    const [pagos] = await db.execute(
      `SELECT p.*,
              p.tipo_membresia AS membresia_tipo,
              p.fecha_vencimiento_generada AS membresia_fin,
              u.nombre AS registrado_por_nombre
       FROM pagos p
       LEFT JOIN usuarios u ON p.registrado_por = u.id
       WHERE ${filters.join(' AND ')}
       ORDER BY p.fecha_pago DESC, p.id DESC`,
      params
    );

    return response.success(res, pagos, 'Historial de pagos del cliente obtenido.');
  } catch (err) {
    next(err);
  }
};

const getByMes = async (req, res, next) => {
  const { mes, anio } = req.query;

  try {
    const [pagos] = await db.execute(
      `SELECT p.*,
              c.nombre_completo AS cliente_nombre_completo,
              SUBSTRING_INDEX(c.nombre_completo, ' ', 1) AS cliente_nombre,
              TRIM(SUBSTRING(c.nombre_completo, LOCATE(' ', c.nombre_completo) + 1)) AS cliente_apellido,
              c.dni AS cliente_dni,
              p.tipo_membresia AS membresia_tipo,
              u.nombre AS registrado_por_nombre
       FROM pagos p
       INNER JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN usuarios u ON p.registrado_por = u.id
       WHERE MONTH(p.fecha_pago) = ? AND YEAR(p.fecha_pago) = ?
       ORDER BY p.fecha_pago DESC, p.id DESC`,
      [mes, anio]
    );

    return response.success(res, pagos, `Pagos obtenidos para el periodo ${mes}/${anio}.`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  crear,
  getByCliente,
  getByMes
};
