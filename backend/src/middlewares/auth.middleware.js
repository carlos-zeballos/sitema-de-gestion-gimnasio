const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');
const response = require('../utils/responseHelper');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return response.error(res, 'Token no proporcionado', 401);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return response.error(res, 'Token no valido', 401);
  }

  try {
    req.user = jwt.verify(parts[1], secret);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.error(res, 'Token expirado', 401);
    }

    return response.error(res, 'Token no valido', 401);
  }
};

module.exports = {
  verifyToken
};
