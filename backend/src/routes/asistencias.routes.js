const express = require('express');
const { body, query } = require('express-validator');
const asistenciasController = require('../controllers/asistencias.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

// Todas las rutas en este enrutador requieren token JWT válido
router.use(verifyToken);

/**
 * @route POST /api/asistencias
 * @desc Registrar el ingreso diario de un cliente (Control de Acceso)
 * @access Autenticado (Ambos roles)
 */
router.post(
  '/',
  [
    body('cliente_id')
      .isInt({ min: 1 }).withMessage('El ID del cliente es obligatorio y debe ser un entero positivo.'),
    body('observacion')
      .optional({ checkFalsy: true })
      .trim(),
    validate
  ],
  asistenciasController.registrar
);

/**
 * @route GET /api/asistencias
 * @desc Consultar registros de asistencias del día filtrado por fecha
 * @access Admin
 */
router.get(
  '/',
  [
    requireAdmin,
    query('fecha')
      .isDate().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD).'),
    validate
  ],
  asistenciasController.getByFecha
);

/**
 * @route GET /api/asistencias/:clienteId
 * @desc Obtener historial de asistencias de un cliente específico
 * @access Autenticado (Ambos roles)
 */
router.get('/:clienteId', asistenciasController.getByCliente);

module.exports = router;
