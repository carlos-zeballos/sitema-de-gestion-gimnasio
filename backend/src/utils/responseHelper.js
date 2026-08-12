/**
 * Helper para estandarizar las respuestas JSON de la API
 */

const success = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data
  });
};

const error = (res, message = 'Ocurrió un error en el servidor', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors
  });
};

module.exports = {
  success,
  error
};
