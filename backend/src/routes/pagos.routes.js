const express = require('express');
const { body, query } = require('express-validator');
const pagosController = require('../controllers/pagos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(verifyToken);

router.post(
  '/',
  [
    body('cliente_id').isInt({ min: 1 }).withMessage('El ID del cliente es obligatorio y debe ser valido.'),
    body('monto').isFloat({ min: 0.01 }).withMessage('El monto del pago debe ser mayor que cero.'),
    body('metodo_pago').isIn(['efectivo', 'yape', 'plin', 'otro']).withMessage('Metodo de pago no valido.'),
    body('tipo_membresia').isIn(['semanal', 'quincenal', 'mensual']).withMessage('Tipo de membresia no valido.'),
    body('fecha_pago').optional().isISO8601().custom((value) => {
      if (value > new Date().toISOString().slice(0, 10)) throw new Error('La fecha de pago no puede ser una fecha futura.');
      return true;
    }),
    validate
  ],
  pagosController.crear
);

router.get(
  '/',
  [
    requireAdmin,
    query('mes').isInt({ min: 1, max: 12 }).withMessage('El mes debe estar entre 1 y 12.'),
    query('anio').isInt({ min: 2020, max: 2100 }).withMessage('El anio debe ser valido.'),
    validate
  ],
  pagosController.getByMes
);

router.get('/:clienteId', [
  query('fechaInicio').optional().isISO8601(),
  query('fechaFin').optional().isISO8601().custom((value, { req }) => {
    if (req.query.fechaInicio && req.query.fechaInicio > value) throw new Error('La fecha inicio no puede ser posterior a la fecha fin.');
    return true;
  }),
  validate
], pagosController.getByCliente);

module.exports = router;
