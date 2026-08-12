const express = require('express');
const { body, query } = require('express-validator');
const clientesController = require('../controllers/clientes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(verifyToken);

const nombreCompletoValidator = body().custom((value) => {
  const nombre = value.nombre_completo || `${value.nombre || ''} ${value.apellido || ''}`.trim();
  if (!nombre) throw new Error('El nombre completo es obligatorio.');
  return true;
});

const clienteValidators = [
  nombreCompletoValidator,
  body('dni')
    .trim()
    .matches(/^[0-9]{8}$/).withMessage('El DNI debe tener exactamente 8 digitos'),
  body('telefono').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }).withMessage('Numero de telefono invalido.'),
  body('correo').optional({ checkFalsy: true }).trim().isEmail().withMessage('Debe proveer un correo con formato valido.'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Debe proveer un correo con formato valido.'),
  body('fecha_inscripcion').optional({ checkFalsy: true }).isISO8601().withMessage('La fecha de inscripcion debe ser valida.')
];

router.get(
  '/search',
  [
    query('q').notEmpty().withMessage('El termino de busqueda (q) no puede estar vacio.'),
    validate
  ],
  clientesController.search
);

router.get('/', clientesController.getAll);
router.get('/:id', clientesController.getById);

router.post('/', [requireAdmin, ...clienteValidators, validate], clientesController.create);
router.put('/:id', [requireAdmin, ...clienteValidators, validate], clientesController.update);
router.patch('/:id/estado', [requireAdmin, body('estado').isIn(['Activo', 'Inactivo']), validate], clientesController.changeStatus);
router.delete('/:id', requireAdmin, clientesController.delete);

module.exports = router;
