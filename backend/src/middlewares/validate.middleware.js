const { validationResult } = require('express-validator');
const response = require('../utils/responseHelper');

/**
 * Middleware para validar reglas de express-validator y retornar errores con status 422
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.error(
      res, 
      'Datos de solicitud inválidos o con formato incorrecto', 
      422, 
      errors.array()
    );
  }
  next();
};

module.exports = {
  validate
};
