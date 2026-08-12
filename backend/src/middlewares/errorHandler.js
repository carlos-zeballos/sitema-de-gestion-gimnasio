const response = require('../utils/responseHelper');

/**
 * Middleware de captura de errores globales de Express
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error no controlado en la aplicación:', err.stack || err);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || 500;
  
  // En producción ocultamos la traza detallada del error por seguridad
  const message = isProduction 
    ? 'Ocurrió un error interno en el servidor. Inténtelo más tarde.' 
    : err.message;

  const errorDetails = isProduction ? null : err.stack;

  return response.error(res, message, statusCode, errorDetails);
};

module.exports = {
  errorHandler
};
