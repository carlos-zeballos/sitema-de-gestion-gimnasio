const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { secret, expiresIn } = require('../config/jwt');
const response = require('../utils/responseHelper');

const roleSlug = (nombreRol) => {
  if (nombreRol === 'Administrador') return 'admin';
  if (nombreRol === 'Colaborador_Recepcion') return 'recepcion';
  if (nombreRol === 'Entrenador') return 'entrenador';
  return 'recepcion';
};

const audit = async (usuarioId, accion, detalle) => {
  try {
    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [usuarioId || null, accion, detalle || null]
    );
  } catch (err) {
    console.error('No se pudo registrar auditoria:', err.message);
  }
};

const login = async (req, res, next) => {
  const identifier = req.body.username || req.body.usuario || req.body.correo || req.body.email;
  const { password } = req.body;

  try {
    const [rows] = await db.execute(
      `SELECT u.*, r.nombre_rol
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       WHERE (u.username = ? OR u.correo = ?)
       LIMIT 1`,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      await audit(null, 'LOGIN_FALLIDO', `Identificador no registrado: ${identifier || '(vacio)'}`);
      return response.error(res, 'Usuario o contrasena incorrectos. Intenta de nuevo.', 401);
    }

    const usuario = rows[0];

    if (usuario.estado !== 'Activo') {
      await audit(usuario.id, 'LOGIN_FALLIDO', 'Usuario inactivo intento iniciar sesion');
      return response.error(res, 'Usuario inactivo. Contacte al administrador.', 403);
    }

    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      await audit(usuario.id, 'CUENTA_BLOQUEADA', 'Intento de login durante bloqueo temporal');
      return response.error(res, 'Cuenta bloqueada temporalmente. Intenta mas tarde.', 423);
    }

    const isMatch = await bcrypt.compare(password, usuario.password_hash);
    if (!isMatch) {
      const intentos = (usuario.intentos_fallidos || 0) + 1;
      const bloqueadoHasta = intentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.execute(
        'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [intentos >= 5 ? 0 : intentos, bloqueadoHasta, usuario.id]
      );
      await audit(usuario.id, intentos >= 5 ? 'CUENTA_BLOQUEADA' : 'LOGIN_FALLIDO', 'Credenciales invalidas');
      return response.error(res, 'Usuario o contrasena incorrectos. Intenta de nuevo.', 401);
    }

    const rol = roleSlug(usuario.nombre_rol);
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        correo: usuario.correo,
        rol,
        nombre_rol: usuario.nombre_rol,
        nombre: usuario.nombre
      },
      secret,
      { expiresIn }
    );

    await db.execute(
      'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW() WHERE id = ?',
      [usuario.id]
    );
    await audit(usuario.id, 'LOGIN_OK', 'Autenticacion exitosa');

    return response.success(res, {
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        correo: usuario.correo,
        email: usuario.correo,
        rol,
        nombre_rol: usuario.nombre_rol
      }
    }, 'Autenticacion exitosa. Bienvenido al sistema.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login
};
