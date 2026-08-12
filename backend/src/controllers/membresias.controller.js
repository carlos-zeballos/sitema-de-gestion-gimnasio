const db = require('../config/db');
const response = require('../utils/responseHelper');

const syncMembresiasEstado = async () => {
  await db.execute(`
    UPDATE membresias
    SET estado = CASE
      WHEN fecha_vencimiento < CURDATE() THEN 'Vencida'
      WHEN fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
      ELSE 'Activa'
    END
  `);
};

const baseQuery = `
  SELECT m.*,
         m.fecha_vencimiento AS fecha_fin,
         c.nombre_completo AS cliente_nombre_completo,
         SUBSTRING_INDEX(c.nombre_completo, ' ', 1) AS cliente_nombre,
         TRIM(SUBSTRING(c.nombre_completo, LOCATE(' ', c.nombre_completo) + 1)) AS cliente_apellido,
         c.dni AS cliente_dni
  FROM membresias m
  INNER JOIN clientes c ON m.cliente_id = c.id
`;

const getActivas = async (req, res, next) => {
  try {
    await syncMembresiasEstado();
    const [membresias] = await db.execute(`
      ${baseQuery}
      WHERE m.estado = 'Activa' AND c.estado = 'Activo'
      ORDER BY m.fecha_vencimiento ASC
    `);
    return response.success(res, membresias, 'Membresias vigentes obtenidas correctamente.');
  } catch (err) {
    next(err);
  }
};

const getVencidas = async (req, res, next) => {
  try {
    await syncMembresiasEstado();
    const [membresias] = await db.execute(`
      ${baseQuery}
      WHERE m.estado = 'Vencida' AND c.estado = 'Activo'
      ORDER BY m.fecha_vencimiento DESC
    `);
    return response.success(res, membresias, 'Membresias vencidas obtenidas correctamente.');
  } catch (err) {
    next(err);
  }
};

const getProximasVencer = async (req, res, next) => {
  try {
    await syncMembresiasEstado();
    const [membresias] = await db.execute(`
      ${baseQuery}
      WHERE m.estado = 'Proxima_a_vencer' AND c.estado = 'Activo'
      ORDER BY m.fecha_vencimiento ASC
    `);
    return response.success(res, membresias, 'Membresias proximas a vencer obtenidas.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getActivas,
  getVencidas,
  getProximasVencer
};
