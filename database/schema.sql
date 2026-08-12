-- =================================================================
-- CRM Gimnasio GD Madrid S.A. - MySQL 8.0
-- Modelo actualizado segun nueva base de datos del proyecto
-- =================================================================

CREATE DATABASE IF NOT EXISTS crm_gimnasio_gd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_gimnasio_gd;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS asistencias;
DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS membresias;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE COMMENT 'Administrador | Colaborador_Recepcion | Entrenador',
    descripcion VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    username VARCHAR(8) NOT NULL UNIQUE COMMENT 'max. 8 caracteres',
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL COMMENT 'hash bcrypt',
    rol_id INT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' COMMENT 'Activo | Inactivo',
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL,
    ultimo_login DATETIME NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (rol_id) REFERENCES roles(id),
    CONSTRAINT chk_usuarios_estado CHECK (estado IN ('Activo', 'Inactivo')),
    CONSTRAINT chk_usuarios_username_len CHECK (CHAR_LENGTH(username) <= 8),
    INDEX idx_usuarios_username (username),
    INDEX idx_usuarios_correo (correo),
    INDEX idx_usuarios_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(180) NOT NULL,
    dni CHAR(8) NOT NULL UNIQUE COMMENT '8 digitos',
    telefono VARCHAR(20),
    correo VARCHAR(150),
    fecha_inscripcion DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' COMMENT 'Activo | Inactivo',
    fecha_baja DATETIME NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_clientes_estado CHECK (estado IN ('Activo', 'Inactivo')),
    CONSTRAINT chk_clientes_dni CHECK (dni REGEXP '^[0-9]{8}$'),
    INDEX idx_clientes_nombre (nombre_completo),
    INDEX idx_clientes_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE membresias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL COMMENT 'semanal | quincenal | mensual',
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activa' COMMENT 'calculado: Activa | Proxima_a_vencer | Vencida',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_membresias_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT chk_membresias_tipo CHECK (tipo IN ('semanal', 'quincenal', 'mensual')),
    CONSTRAINT chk_membresias_estado CHECK (estado IN ('Activa', 'Proxima_a_vencer', 'Vencida')),
    INDEX idx_membresias_cliente_fecha (cliente_id, creado_en),
    INDEX idx_membresias_vencimiento (fecha_vencimiento),
    INDEX idx_membresias_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    membresia_id INT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL COMMENT 'efectivo | yape | plin | otro',
    tipo_membresia VARCHAR(20) NOT NULL,
    fecha_vencimiento_generada DATE NOT NULL,
    registrado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagos_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_membresias FOREIGN KEY (membresia_id) REFERENCES membresias(id) ON DELETE SET NULL,
    CONSTRAINT fk_pagos_usuarios FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pagos_metodo CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'otro')),
    CONSTRAINT chk_pagos_tipo CHECK (tipo_membresia IN ('semanal', 'quincenal', 'mensual')),
    INDEX idx_pagos_fecha (fecha_pago),
    INDEX idx_pagos_cliente (cliente_id)
) ENGINE=InnoDB;

CREATE TABLE asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por INT NOT NULL,
    estado_membresia_al_ingreso VARCHAR(30) NOT NULL,
    CONSTRAINT fk_asistencias_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_asistencias_usuarios FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_asistencias_fecha (fecha_hora),
    INDEX idx_asistencias_cliente (cliente_id)
) ENGINE=InnoDB;

CREATE TABLE auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(50) NOT NULL COMMENT 'LOGIN_OK | LOGIN_FALLIDO | CUENTA_BLOQUEADA | BACKUP_BD | RESTORE_BD | ...',
    detalle VARCHAR(500),
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_auditoria_fecha (fecha_hora),
    INDEX idx_auditoria_accion (accion)
) ENGINE=InnoDB;

-- Seeds de roles
INSERT INTO roles (nombre_rol, descripcion) VALUES
('Administrador', 'Acceso completo a administracion, reportes y configuracion'),
('Colaborador_Recepcion', 'Registro de ingresos, clientes y pagos operativos'),
('Entrenador', 'Consulta operativa limitada');

-- Passwords de prueba:
-- admin123 / recepcion123 / entrenador123
INSERT INTO usuarios (nombre, username, correo, password_hash, rol_id, estado) VALUES
('Administrador General', 'admin', 'admin@gym.com', '$2a$10$ZpuS47E/YmLvh5P9RfpzoOYZZ0.SsNTFPCtNWHmz9OLeZ6wBclMGy', 1, 'Activo'),
('Recepcionista Turno Tarde', 'recep', 'recepcion@gym.com', '$2a$10$hIrAIx/xhcDwRTbLy.IdQu9eJh1VPNx/8oxpBdH9e4TT2R2pxhcC6', 2, 'Activo'),
('Entrenador Principal', 'trainer', 'entrenador@gym.com', '$2a$10$MZ0zt/YLoT4QLSB6pHO2AetU3thx5oyt4icSfR.7LxSy8KJCvDZSO', 3, 'Activo');

INSERT INTO clientes (nombre_completo, dni, telefono, correo, fecha_inscripcion, estado) VALUES
('Juan Perez Quispe', '71234567', '958473621', 'juan.perez@email.com', '2026-06-08', 'Activo'),
('Maria Mendoza Ramos', '72345678', '948372615', 'maria.mendoza@email.com', '2026-06-10', 'Activo'),
('Carlos Diaz Castro', '73456789', '938271604', 'carlos.diaz@email.com', '2026-06-15', 'Activo'),
('Sofia Lozada Flores', '74567890', '928170593', 'sofia.lozada@email.com', '2026-07-01', 'Activo'),
('Luis Torres Benavente', '75678901', '918069482', 'luis.torres@email.com', '2026-07-05', 'Inactivo');

INSERT INTO membresias (cliente_id, tipo, fecha_inicio, fecha_vencimiento, estado) VALUES
(1, 'mensual', '2026-06-08', '2026-07-08', 'Proxima_a_vencer'),
(2, 'mensual', '2026-06-10', '2026-07-10', 'Proxima_a_vencer'),
(3, 'quincenal', '2026-06-15', '2026-06-30', 'Vencida'),
(4, 'semanal', '2026-07-01', '2026-07-08', 'Proxima_a_vencer');

INSERT INTO pagos (cliente_id, membresia_id, monto, fecha_pago, metodo_pago, tipo_membresia, fecha_vencimiento_generada, registrado_por) VALUES
(1, 1, 90.00, '2026-06-08', 'yape', 'mensual', '2026-07-08', 1),
(2, 2, 90.00, '2026-06-10', 'efectivo', 'mensual', '2026-07-10', 2),
(3, 3, 50.00, '2026-06-15', 'plin', 'quincenal', '2026-06-30', 2),
(4, 4, 30.00, '2026-07-01', 'yape', 'semanal', '2026-07-08', 2);

INSERT INTO asistencias (cliente_id, fecha_hora, registrado_por, estado_membresia_al_ingreso) VALUES
(1, '2026-06-09 08:30:00', 2, 'Activa'),
(2, '2026-06-11 18:00:00', 2, 'Activa'),
(3, '2026-07-01 09:00:00', 2, 'Vencida');

INSERT INTO auditoria (usuario_id, accion, detalle) VALUES
(1, 'LOGIN_OK', 'Seed inicial de auditoria');
