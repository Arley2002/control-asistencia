-- ASOINCA Control de Asistencia - Esquema inicial
-- Base de datos: asoinca_control1
-- Ejecutar con: mysql -u root -p1234 < db/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS asoinca_control1
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE asoinca_control1;

-- Tabla de roles (semilla inicial)
CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
  (1, 'administrador', 'Acceso total'),
  (2, 'secretario', 'Carga de asistencias y gestión limitada'),
  (3, 'docente', 'Consulta de asistencias y certificados');

-- Usuarios del sistema (administradores / secretarios / docentes con acceso)
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id TINYINT UNSIGNED NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_rol_estado ON usuarios(rol_id, estado);

-- Usuario administrador inicial (password: "Admin123!")
INSERT IGNORE INTO usuarios (id, nombre, correo, username, password_hash, rol_id, estado)
VALUES (1, 'Administrador', 'admin@asoinca.com', 'admin', '$2a$10$MrDbKm/mz1gZGVBCYKxREOLnooJDKx.XMdag.f4uwOkNsTPCJBOVC', 1, 'activo');

-- Catálogo de departamentos (normalizado)
CREATE TABLE IF NOT EXISTS departamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Catálogo de estatutos
CREATE TABLE IF NOT EXISTS estatutos (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO estatutos (id, nombre) VALUES
  (1, '1278'), (2, '2277'), (3, '504'), (4, 'Etnoeducadores'), (5, '1345');

-- Catálogo de municipios (con referencia a departamento)
CREATE TABLE IF NOT EXISTS municipios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  departamento_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
) ENGINE=InnoDB;

CREATE INDEX idx_municipios_nombre ON municipios(nombre);
CREATE INDEX idx_municipios_departamento_id ON municipios(departamento_id);

-- Docentes
CREATE TABLE IF NOT EXISTS docentes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  numero_celular VARCHAR(30) NULL,
  correo_electronico VARCHAR(180) NULL,
  fecha_nacimiento DATE NULL,
  estatuto_id TINYINT UNSIGNED NULL,
  departamento_residencia VARCHAR(80) NULL,
  municipio_residencia_id BIGINT UNSIGNED NULL,
  direccion_residencia VARCHAR(180) NULL,
  municipio_donde_labora_id BIGINT UNSIGNED NULL,
  institucion_educativa_donde_labora VARCHAR(180) NULL,
  vinculacion ENUM('docente','directivo_docente','administrativo','pensionado') NOT NULL DEFAULT 'docente',
  tipo_vinculacion ENUM(
    'propiedad','provisional_definitivo','provisional_temporal','oferente',
    'rector_propiedad','rector_encargo','coordinador_propiedad','coordinador_encargo',
    'director_rural_propiedad','director_rural_encargo',
    'administrativo_propiedad','administrativo_provisional',
    'pensionado_activo','pensionado_retirado'
  ) NOT NULL DEFAULT 'propiedad',
  usuario_id BIGINT UNSIGNED NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (municipio_residencia_id) REFERENCES municipios(id),
  FOREIGN KEY (municipio_donde_labora_id) REFERENCES municipios(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (estatuto_id) REFERENCES estatutos(id)
) ENGINE=InnoDB;

CREATE INDEX idx_docentes_nombre ON docentes(apellidos, nombres);
CREATE INDEX idx_docentes_municipio_residencia ON docentes(municipio_residencia_id);
CREATE INDEX idx_docentes_municipio_labora ON docentes(municipio_donde_labora_id);
CREATE INDEX idx_docentes_estatuto ON docentes(estatuto_id);

-- Reuniones
CREATE TABLE IF NOT EXISTS reuniones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  entidad_convocante ENUM('ASOINCA','PROVITEC','OTRA') NOT NULL DEFAULT 'ASOINCA',
  fecha DATE NOT NULL,
  descripcion TEXT NULL,
  visible_secretario BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE INDEX idx_reuniones_fecha ON reuniones(fecha);
CREATE INDEX idx_reuniones_nombre ON reuniones(nombre);

-- Asistencias
CREATE TABLE IF NOT EXISTS asistencias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reunion_id BIGINT UNSIGNED NOT NULL,
  docente_id BIGINT UNSIGNED NOT NULL,
  fecha_hora DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asistencia (reunion_id, docente_id),
  INDEX idx_asistencias_docente_fecha (docente_id, fecha_hora),
  FOREIGN KEY (reunion_id) REFERENCES reuniones(id),
  FOREIGN KEY (docente_id) REFERENCES docentes(id)
) ENGINE=InnoDB;

-- Certificados
CREATE TABLE IF NOT EXISTS certificados (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reunion_id BIGINT UNSIGNED NOT NULL,
  docente_id BIGINT UNSIGNED NOT NULL,
  url_pdf VARCHAR(512) NOT NULL,
  generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hash_verificacion CHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_certificado (reunion_id, docente_id),
  INDEX idx_certificados_docente (docente_id),
  INDEX idx_certificados_hash (hash_verificacion),
  FOREIGN KEY (reunion_id) REFERENCES reuniones(id),
  FOREIGN KEY (docente_id) REFERENCES docentes(id)
) ENGINE=InnoDB;

-- Tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  token CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Auditoría básica
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NULL,
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidad_id BIGINT UNSIGNED NULL,
  payload JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_entidad (entidad, entidad_id),
  INDEX idx_auditoria_usuario (usuario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
