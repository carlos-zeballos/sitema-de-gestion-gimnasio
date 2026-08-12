const response = require('../utils/responseHelper');

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return response.error(res, 'No autenticado en el sistema', 401);
  }

  if (req.user.rol !== 'admin' && req.user.nombre_rol !== 'Administrador') {
    return response.error(res, 'Acceso denegado: Se requiere rol de Administrador para realizar esta accion', 403);
  }

  next();
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return response.error(res, 'No autenticado en el sistema', 401);
  }

  if (!roles.includes(req.user.rol) && !roles.includes(req.user.nombre_rol)) {
    return response.error(res, 'Acceso denegado: No cuenta con permisos para realizar esta accion', 403);
  }

  next();
};

module.exports = {
  requireAdmin,
  requireRoles
};
