const db = require('../config/db');
const response = require('../utils/responseHelper');
const { membershipStatusSql } = require('../utils/dateHelper');

const clienteSelect = `
  SELECT c.id,
         c.nombre_completo,
         SUBSTRING_INDEX(c.nombre_completo, ' ', 1) AS nombre,
         TRIM(SUBSTRING(c.nombre_completo, LOCATE(' ', c.nombre_completo) + 1)) AS apellido,
         c.dni,
         c.telefono,
         c.correo,
         c.correo AS email,
         c.fecha_inscripcion,
         c.estado,
         CASE WHEN c.estado = 'Activo' THEN 1 ELSE 0 END AS activo,
         m.id AS membresia_id,
         m.tipo AS membresia_tipo,
         m.fecha_inicio AS membresia_inicio,
         m.fecha_vencimiento AS membresia_fin,
         m.fecha_vencimiento AS membresia_vencimiento,
         ${membershipStatusSql} AS membresia_estado
  FROM clientes c
  LEFT JOIN (
    SELECT m1.*
    FROM membresias m1
    INNER JOIN (
      SELECT cliente_id, MAX(creado_en) AS max_creado
      FROM membresias
      GROUP BY cliente_id
    ) m2 ON m1.cliente_id = m2.cliente_id AND m1.creado_en = m2.max_creado
  ) m ON c.id = m.cliente_id
`;

const buildNombreCompleto = (body) => {
  if (body.nombre_completo) return body.nombre_completo.trim();
  return `${body.nombre || ''} ${body.apellido || ''}`.replace(/\s+/g, ' ').trim();
};

const syncMembresias = async () => {
  await db.execute(`
    UPDATE membresias
    SET estado = CASE
      WHEN fecha_vencimiento < CURDATE() THEN 'Vencida'
      WHEN fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
      ELSE 'Activa'
    END
  `);
};

const getAll = async (req, res, next) => {
  try {
    await syncMembresias();
    const estadoCliente = req.query.estadoCliente || 'Activo';
    const estadoMembresia = req.query.estadoMembresia;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = [20, 50, 100].includes(Number(req.query.limit)) ? Number(req.query.limit) : 100;
    const where = [];
    const params = [];
    if (estadoCliente !== 'Todos') { where.push('c.estado = ?'); params.push(estadoCliente); }
    if (estadoMembresia) { where.push(`${membershipStatusSql} = ?`); params.push(estadoMembresia); }
    const [clientes] = await db.execute(`
      ${clienteSelect}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.nombre_completo ASC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `, params);
    return response.success(res, clientes, 'Clientes obtenidos correctamente');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    await syncMembresias();
    const [rows] = await db.execute(`
      ${clienteSelect}
      WHERE c.id = ? AND c.estado = 'Activo'
    `, [req.params.id]);

    if (rows.length === 0) {
      return response.error(res, 'Cliente no encontrado o dado de baja', 404);
    }

    return response.success(res, rows[0], 'Cliente obtenido correctamente');
  } catch (err) {
    next(err);
  }
};

const search = async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return response.error(res, 'Debe especificar un termino de busqueda en el parametro q', 400);
  }

  try {
    await syncMembresias();
    const searchPattern = `%${q}%`;
    const [clientes] = await db.execute(`
      ${clienteSelect}
      WHERE c.estado = 'Activo'
        AND (LOWER(c.nombre_completo) LIKE LOWER(?) OR c.dni LIKE ?)
      ORDER BY c.nombre_completo ASC
    `, [searchPattern, searchPattern]);

    return response.success(res, clientes, 'Busqueda completada');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  const nombre_completo = buildNombreCompleto(req.body);
  const { dni, telefono } = req.body;
  const correo = req.body.correo || req.body.email || null;
  const fecha_inscripcion = req.body.fecha_inscripcion || new Date().toISOString().split('T')[0];

  try {
    const [existing] = await db.execute('SELECT id FROM clientes WHERE dni = ?', [dni]);
    if (existing.length > 0) {
      return response.error(res, 'Ya existe un cliente registrado con este DNI', 409);
    }

    const nombre = (req.body.nombre || nombre_completo.split(' ')[0] || nombre_completo).trim();
    const apellido = (req.body.apellido || nombre_completo.split(' ').slice(1).join(' ') || ' ').trim();
    const [result] = await db.execute(
      `INSERT INTO clientes (nombre, apellido, nombre_completo, dni, telefono, email, correo, fecha_inscripcion, activo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'Activo')`,
      [nombre, apellido || ' ', nombre_completo, dni, telefono || null, correo, correo, fecha_inscripcion]
    );

    return response.success(res, {
      id: result.insertId,
      nombre_completo,
      nombre: nombre_completo.split(' ')[0],
      apellido: nombre_completo.split(' ').slice(1).join(' '),
      dni,
      telefono,
      correo,
      email: correo,
      fecha_inscripcion,
      estado: 'Activo'
    }, 'Cliente registrado correctamente.', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  const { id } = req.params;
  const nombre_completo = buildNombreCompleto(req.body);
  const { dni, telefono, fecha_inscripcion } = req.body;
  const correo = req.body.correo || req.body.email || null;

  try {
    const [existing] = await db.execute('SELECT * FROM clientes WHERE id = ? AND estado = "Activo"', [id]);
    if (existing.length === 0) {
      return response.error(res, 'Cliente no encontrado', 404);
    }

    if (dni) {
      const [duplicated] = await db.execute('SELECT id FROM clientes WHERE dni = ? AND id <> ?', [dni, id]);
      if (duplicated.length > 0) {
        return response.error(res, 'Ya existe un cliente registrado con este DNI', 409);
      }
    }

    const current = existing[0];
    const nextData = {
      nombre_completo: nombre_completo || current.nombre_completo,
      dni: dni || current.dni,
      telefono: telefono || null,
      correo,
      fecha_inscripcion: fecha_inscripcion || current.fecha_inscripcion
    };

    await db.execute(
      `UPDATE clientes
       SET nombre = ?, apellido = ?, nombre_completo = ?, dni = ?, telefono = ?, email = ?, correo = ?, fecha_inscripcion = ?,
           activo = CASE WHEN estado = 'Activo' THEN 1 ELSE 0 END
       WHERE id = ? AND estado = 'Activo'`,
      [
        nextData.nombre_completo.split(' ')[0] || nextData.nombre_completo,
        nextData.nombre_completo.split(' ').slice(1).join(' ') || ' ',
        nextData.nombre_completo,
        nextData.dni,
        nextData.telefono,
        nextData.correo,
        nextData.correo,
        nextData.fecha_inscripcion,
        id
      ]
    );

    return response.success(res, {
      id: Number(id),
      ...nextData,
      email: nextData.correo
    }, 'Datos del cliente actualizados correctamente.');
  } catch (err) {
    next(err);
  }
};

const deleteLogical = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [existing] = await db.execute('SELECT id FROM clientes WHERE id = ? AND estado = "Activo"', [id]);
    if (existing.length === 0) {
      return response.error(res, 'Cliente no encontrado o ya dado de baja', 404);
    }

    await db.execute('UPDATE clientes SET estado = "Inactivo", activo = 0, fecha_baja = NOW() WHERE id = ?', [id]);

    return response.success(res, { id: Number(id) }, 'Cliente dado de baja correctamente');
  } catch (err) {
    next(err);
  }
};

const changeStatus = async (req, res, next) => {
  const estado = req.body.estado;
  try {
    const [rows] = await db.execute('SELECT id, nombre_completo, dni, estado FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows.length) return response.error(res, 'Cliente no encontrado', 404);
    await db.execute(
      `UPDATE clientes SET estado = ?, activo = ?, fecha_baja = ${estado === 'Inactivo' ? 'NOW()' : 'NULL'} WHERE id = ?`,
      [estado, estado === 'Activo' ? 1 : 0, req.params.id]
    );
    req.app.get('io')?.emit('cliente:estado', { id: Number(req.params.id), estado });
    return response.success(res, { id: Number(req.params.id), estado }, estado === 'Activo' ? 'Cliente reactivado correctamente.' : 'Cliente dado de baja correctamente.');
  } catch (err) { next(err); }
};

module.exports = {
  getAll,
  getById,
  search,
  create,
  update,
  delete: deleteLogical,
  changeStatus
};
