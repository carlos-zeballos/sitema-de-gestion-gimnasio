const db = require('../config/db');
const response = require('../utils/responseHelper');

const getLatestMembership = async (clienteId) => {
  const [membresias] = await db.execute(
    `SELECT *,
            CASE
              WHEN fecha_vencimiento < CURDATE() THEN 'Vencida'
              WHEN fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
              ELSE 'Activa'
            END AS estado_calculado
     FROM membresias
     WHERE cliente_id = ?
     ORDER BY creado_en DESC
     LIMIT 1`,
    [clienteId]
  );
  return membresias[0] || null;
};

const registrar = async (req, res, next) => {
  const { cliente_id } = req.body;
  const registrado_por = req.user.id;

  try {
    const [clientes] = await db.execute('SELECT * FROM clientes WHERE id = ?', [cliente_id]);
    if (clientes.length === 0) {
      return response.error(res, 'Cliente no encontrado. Verifica el DNI ingresado.', 404);
    }

    const cliente = clientes[0];
    if (cliente.estado !== 'Activo') {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Acceso denegado - El cliente esta dado de baja.',
        data: {
          acceso_concedido: false,
          warning: 'El cliente esta dado de baja',
          membresia_estado: 'Inactivo',
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre_completo,
            apellido: '',
            dni: cliente.dni
          }
        }
      });
    }

    const membresia = await getLatestMembership(cliente_id);
    if (!membresia) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Acceso denegado - Cliente sin membresia registrada.',
        data: {
          acceso_concedido: false,
          warning: 'Membresia inexistente',
          membresia_estado: 'Vencida',
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre_completo,
            apellido: '',
            dni: cliente.dni
          }
        }
      });
    }

    if (membresia.estado_calculado === 'Vencida') {
      await db.execute("UPDATE membresias SET estado = 'Vencida' WHERE id = ?", [membresia.id]);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Acceso denegado - La membresia vencio el ${membresia.fecha_vencimiento}.`,
        data: {
          acceso_concedido: false,
          warning: `La membresia vencio el ${membresia.fecha_vencimiento}`,
          membresia_estado: 'Vencida',
          membresia_fin: membresia.fecha_vencimiento,
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre_completo,
            apellido: '',
            dni: cliente.dni
          }
        }
      });
    }

    await db.execute('UPDATE membresias SET estado = ? WHERE id = ?', [membresia.estado_calculado, membresia.id]);

    const [insertResult] = await db.execute(
      `INSERT INTO asistencias (cliente_id, registrado_por, estado_membresia_al_ingreso)
       VALUES (?, ?, ?)`,
      [cliente_id, registrado_por, membresia.estado_calculado]
    );

    return response.success(res, {
      id: insertResult.insertId,
      acceso_concedido: true,
      membresia_estado: membresia.estado_calculado,
      membresia_fin: membresia.fecha_vencimiento,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre_completo,
        apellido: '',
        dni: cliente.dni
      }
    }, `Acceso permitido - Membresia vigente hasta ${membresia.fecha_vencimiento}`, 201);
  } catch (err) {
    next(err);
  }
};

const getByCliente = async (req, res, next) => {
  try {
    const [asistencias] = await db.execute(
      `SELECT a.*,
              u.nombre AS registrado_por_nombre,
              1 AS acceso_concedido,
              NULL AS observacion
       FROM asistencias a
       LEFT JOIN usuarios u ON a.registrado_por = u.id
       WHERE a.cliente_id = ?
       ORDER BY a.fecha_hora DESC`,
      [req.params.clienteId]
    );
    return response.success(res, asistencias, 'Historial de ingresos obtenido');
  } catch (err) {
    next(err);
  }
};

const getByFecha = async (req, res, next) => {
  const { fecha } = req.query;

  if (!fecha) {
    return response.error(res, 'Debe especificar el parametro fecha (YYYY-MM-DD)', 400);
  }

  try {
    const [asistencias] = await db.execute(
      `SELECT a.*,
              c.nombre_completo AS cliente_nombre_completo,
              SUBSTRING_INDEX(c.nombre_completo, ' ', 1) AS cliente_nombre,
              TRIM(SUBSTRING(c.nombre_completo, LOCATE(' ', c.nombre_completo) + 1)) AS cliente_apellido,
              c.dni AS cliente_dni,
              u.nombre AS registrado_por_nombre,
              1 AS acceso_concedido,
              NULL AS observacion
       FROM asistencias a
       INNER JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN usuarios u ON a.registrado_por = u.id
       WHERE DATE(a.fecha_hora) = ?
       ORDER BY a.fecha_hora DESC`,
      [fecha]
    );

    return response.success(res, asistencias, `Asistencias del dia ${fecha} obtenidas`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registrar,
  getByCliente,
  getByFecha
};
