const express = require('express');
const { body } = require('express-validator');
const { login } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.post(
  '/login',
  [
    body().custom((value) => {
      if (!value.username && !value.usuario && !value.correo && !value.email) {
        throw new Error('El nombre de usuario es obligatorio.');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('La contrasena es obligatoria.'),
    validate
  ],
  login
);

module.exports = router;
