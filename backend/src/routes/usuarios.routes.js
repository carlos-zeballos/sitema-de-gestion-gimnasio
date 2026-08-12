const express = require('express');
const { body } = require('express-validator');
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);

const baseValidators = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 8 }).withMessage('El usuario debe tener entre 3 y 8 caracteres.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, numeros y guion bajo.'),
  body('correo').trim().isEmail().withMessage('El correo debe tener formato valido.'),
  body('rol_id').isInt({ min: 1 }).withMessage('El rol es obligatorio.'),
  body('estado').isIn(['Activo', 'Inactivo']).withMessage('El estado debe ser Activo o Inactivo.')
];
const passwordPolicy = body('password')
  .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
  .withMessage('La contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial.');

router.get('/roles', usuariosController.getRoles);
router.get('/', usuariosController.getAll);
router.post(
  '/',
  [
    ...baseValidators,
    passwordPolicy,
    validate
  ],
  usuariosController.create
);
router.put(
  '/:id',
  [
    ...baseValidators,
    passwordPolicy.optional({ checkFalsy: true }),
    validate
  ],
  usuariosController.update
);
router.delete('/:id', usuariosController.deactivate);

module.exports = router;
