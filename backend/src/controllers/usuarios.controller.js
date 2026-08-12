const bcrypt = require('bcryptjs');
const db = require('../config/db');
const response = require('../utils/responseHelper');

const roleSlug = (nombreRol) => {
  if (nombreRol === 'Administrador') return 'admin';
  if (nombreRol === 'Colaborador_Recepcion') return 'recepcion';
  if (nombreRol === 'Entrenador') return 'entrenador';
  return 'recepcion';
};

const roleNameById = (rolId) => {
  if (Number(rolId) === 1) return 'Administrador';
  if (Number(rolId) === 3) return 'Entrenador';
  return 'Colaborador_Recepcion';
};

const getRoles = async (req, res, next) => {
  try {
    const [roles] = await db.execute('SELECT * FROM roles ORDER BY id');
    return response.success(res, roles, 'Roles obtenidos correctamente.');
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const [usuarios] = await db.execute(`
      SELECT u.id, u.nombre, u.username, u.correo, u.rol_id, r.nombre_rol,
             u.estado, u.intentos_fallidos, u.bloqueado_hasta, u.ultimo_login, u.creado_en
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      ORDER BY u.nombre ASC
    `);
    return response.success(res, usuarios.map((u) => ({ ...u, rol: roleSlug(u.nombre_rol) })), 'Usuarios obtenidos correctamente.');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  const { nombre, username, correo, password, rol_id, estado = 'Activo' } = req.body;

  try {
    const [duplicated] = await db.execute(
      'SELECT id FROM usuarios WHERE username = ? OR correo = ?',
      [username, correo]
    );
    if (duplicated.length > 0) {
      return response.error(res, 'Ya existe un usuario con ese nombre de usuario o correo.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const legacyRol = roleSlug(roleNameById(rol_id));
    const [result] = await db.execute(
      `INSERT INTO usuarios (nombre, email, username, correo, password_hash, rol, rol_id, activo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, correo, username, correo, passwordHash, legacyRol, rol_id, estado === 'Activo' ? 1 : 0, estado]
    );

    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'USUARIO_CREADO', `Usuario creado: ${username}`]
    );

    return response.success(res, { id: result.insertId, nombre, username, correo, rol_id, estado }, 'Usuario creado correctamente.', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  const { id } = req.params;
  const { nombre, username, correo, password, rol_id, estado } = req.body;

  try {
    const [existing] = await db.execute('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return response.error(res, 'Usuario no encontrado.', 404);
    }

    const [duplicated] = await db.execute(
      'SELECT id FROM usuarios WHERE (username = ? OR correo = ?) AND id <> ?',
      [username, correo, id]
    );
    if (duplicated.length > 0) {
      return response.error(res, 'Ya existe un usuario con ese nombre de usuario o correo.', 409);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.execute(
        `UPDATE usuarios
         SET nombre = ?, email = ?, username = ?, correo = ?, password_hash = ?, rol = ?, rol_id = ?, activo = ?, estado = ?, intentos_fallidos = 0, bloqueado_hasta = NULL
         WHERE id = ?`,
        [nombre, correo, username, correo, passwordHash, roleSlug(roleNameById(rol_id)), rol_id, estado === 'Activo' ? 1 : 0, estado, id]
      );
    } else {
      await db.execute(
        `UPDATE usuarios
         SET nombre = ?, email = ?, username = ?, correo = ?, rol = ?, rol_id = ?, activo = ?, estado = ?, intentos_fallidos = 0, bloqueado_hasta = NULL
         WHERE id = ?`,
        [nombre, correo, username, correo, roleSlug(roleNameById(rol_id)), rol_id, estado === 'Activo' ? 1 : 0, estado, id]
      );
    }

    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'USUARIO_ACTUALIZADO', `Usuario actualizado: ${username}`]
    );

    return response.success(res, { id: Number(id), nombre, username, correo, rol_id, estado }, 'Usuario actualizado correctamente.');
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return response.error(res, 'No puedes desactivar tu propio usuario.', 400);
  }

  try {
    const [result] = await db.execute('UPDATE usuarios SET estado = "Inactivo", activo = 0 WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return response.error(res, 'Usuario no encontrado.', 404);
    }

    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, ?, ?)',
      [req.user.id, 'USUARIO_DESACTIVADO', `Usuario desactivado ID ${id}`]
    );

    return response.success(res, { id: Number(id) }, 'Usuario desactivado correctamente.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRoles,
  getAll,
  create,
  update,
  deactivate
};
