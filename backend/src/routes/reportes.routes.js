const express = require('express');
const { query } = require('express-validator');
const reportesController = require('../controllers/reportes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

// Todas las rutas en este enrutador requieren token JWT válido
router.use(verifyToken);

/**
 * @route GET /api/reportes/clientes
 * @desc Reporte estadístico de clientes (Total, Activos, Inactivos, Porcentaje)
 * @access Admin
 */
router.get('/clientes', requireAdmin, reportesController.getClientes);

/**
 * @route GET /api/reportes/pagos
 * @desc Reporte mensual y anual de ingresos totales y por método de pago
 * @access Admin
 */
router.get(
  '/pagos',
  [
    requireAdmin,
    query('mes')
      .isInt({ min: 1, max: 12 }).withMessage('El mes debe ser un entero entre 1 y 12.'),
    query('anio')
      .isInt({ min: 2020, max: 2100 }).withMessage('El año debe ser un entero válido.'),
    validate
  ],
  reportesController.getPagos);

router.get(
  '/ingresos',
  [
    requireAdmin,
    query('mes').isInt({ min: 1, max: 12 }).withMessage('El mes debe ser un entero entre 1 y 12.'),
    query('anio').isInt({ min: 2020, max: 2100 }).withMessage('El anio debe ser un entero valido.'),
    validate
  ],
  reportesController.getIngresos
);

router.get(
  '/retencion',
  [
    requireAdmin,
    query('mes').isInt({ min: 1, max: 12 }).withMessage('El mes debe ser un entero entre 1 y 12.'),
    query('anio').isInt({ min: 2020, max: 2100 }).withMessage('El anio debe ser un entero valido.'),
    validate
  ],
  reportesController.getRetencion
);

/**
 * @route GET /api/reportes/dashboard/indicadores
 * @desc Contadores rápidos para el Dashboard (Activos, Vencidos, Por vencer)
 * @access Autenticado (Ambos roles: Recepción y Admin)
 */
router.get('/dashboard/indicadores', reportesController.getDashboardIndicadores);

module.exports = router;
