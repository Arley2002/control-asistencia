-- =====================================================
-- ASOINCA - Control de Asistencia
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS asoinca_control
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE asoinca_control;

-- =====================================================
-- ROLES
-- =====================================================
CREATE TABLE roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'Administrador', 'Acceso total'),
(2, 'Secretario', 'Gestión operativa'),
(3, 'Consulta', 'Solo lectura');

-- =====================================================
-- USUARIOS
-- =====================================================
CREATE TABLE usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id TINYINT UNSIGNED NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- =====================================================
-- CATALOGOS DE NEGOCIO
-- =====================================================

-- Vinculación
CREATE TABLE vinculaciones (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO vinculaciones (nombre) VALUES
('Docente'),
('Directivo docente'),
('Administrativo'),
('Pensionado');

-- Tipo de vinculación
CREATE TABLE tipos_vinculacion (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  labora_actualmente BOOLEAN NOT NULL
) ENGINE=InnoDB;

INSERT INTO tipos_vinculacion (nombre, labora_actualmente) VALUES
('Propiedad', TRUE),
('Provisional definitivo', TRUE),
('Provisional temporal', TRUE),
('Oferente', TRUE),

('Rector en propiedad', TRUE),
('Rector por encargo', TRUE),
('Coordinador en propiedad', TRUE),
('Coordinador en encargo', TRUE),
('Director rural en propiedad', TRUE),
('Director rural por encargo', TRUE),

('Administrativo en propiedad', TRUE),
('Administrativo provisional', TRUE),

('Pensionado activo', TRUE),
('Pensionado retirado', FALSE);

-- =====================================================
-- RELACION: QUE TIPO APLICA A QUE VINCULACION
-- =====================================================
CREATE TABLE vinculacion_tipo (
  vinculacion_id TINYINT UNSIGNED NOT NULL,
  tipo_vinculacion_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (vinculacion_id, tipo_vinculacion_id),
  FOREIGN KEY (vinculacion_id) REFERENCES vinculaciones(id),
  FOREIGN KEY (tipo_vinculacion_id) REFERENCES tipos_vinculacion(id)
) ENGINE=InnoDB;

-- Docente
INSERT INTO vinculacion_tipo VALUES
(1,1),(1,2),(1,3),(1,4);

-- Directivo docente
INSERT INTO vinculacion_tipo VALUES
(2,5),(2,6),(2,7),(2,8),(2,9),(2,10);

-- Administrativo
INSERT INTO vinculacion_tipo VALUES
(3,11),(3,12);

-- Pensionado
INSERT INTO vinculacion_tipo VALUES
(4,13),(4,14);

-- =====================================================
-- ESTATUTOS
-- =====================================================
CREATE TABLE estatutos (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO estatutos (nombre) VALUES
('1278'),
('2277'),
('504'),
('Etnoeducador'),
('1345');

-- =====================================================
-- UBICACION
-- =====================================================
CREATE TABLE departamentos (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE municipios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  departamento_id SMALLINT UNSIGNED NOT NULL,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
) ENGINE=InnoDB;

-- =====================================================
-- PERSONAS (DOCENTES / ADMINISTRATIVOS / PENSIONADOS)
-- =====================================================
CREATE TABLE personas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  celular VARCHAR(30),
  correo VARCHAR(180),
  fecha_nacimiento DATE,

  vinculacion_id TINYINT UNSIGNED NOT NULL,
  tipo_vinculacion_id TINYINT UNSIGNED NOT NULL,
  estatuto_id TINYINT UNSIGNED,

  departamento_residencia SMALLINT UNSIGNED,
  municipio_residencia BIGINT UNSIGNED,
  direccion_residencia VARCHAR(200),

  municipio_labora BIGINT UNSIGNED,
  institucion_labora VARCHAR(200),

  afiliado_asoinca BOOLEAN DEFAULT FALSE,
  afiliado_provitec BOOLEAN DEFAULT FALSE,

  estado VARCHAR(20) DEFAULT 'Activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (vinculacion_id) REFERENCES vinculaciones(id),
  FOREIGN KEY (tipo_vinculacion_id) REFERENCES tipos_vinculacion(id),
  FOREIGN KEY (estatuto_id) REFERENCES estatutos(id),
  FOREIGN KEY (departamento_residencia) REFERENCES departamentos(id),
  FOREIGN KEY (municipio_residencia) REFERENCES municipios(id),
  FOREIGN KEY (municipio_labora) REFERENCES municipios(id)
) ENGINE=InnoDB;

-- =====================================================
-- REUNIONES
-- =====================================================
CREATE TABLE reuniones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  entidad VARCHAR(50) DEFAULT 'ASOINCA',
  fecha DATE NOT NULL,
  descripcion TEXT,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- =====================================================
-- ASISTENCIAS
-- =====================================================
CREATE TABLE asistencias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reunion_id BIGINT UNSIGNED NOT NULL,
  persona_id BIGINT UNSIGNED NOT NULL,
  fecha_hora DATETIME NOT NULL,
  UNIQUE (reunion_id, persona_id),
  FOREIGN KEY (reunion_id) REFERENCES reuniones(id),
  FOREIGN KEY (persona_id) REFERENCES personas(id)
) ENGINE=InnoDB;

-- =====================================================
-- CERTIFICADOS
-- =====================================================
CREATE TABLE certificados (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reunion_id BIGINT UNSIGNED NOT NULL,
  persona_id BIGINT UNSIGNED NOT NULL,
  url_pdf VARCHAR(500) NOT NULL,
  hash_verificacion CHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (reunion_id, persona_id),
  FOREIGN KEY (reunion_id) REFERENCES reuniones(id),
  FOREIGN KEY (persona_id) REFERENCES personas(id)
) ENGINE=InnoDB;

-- =====================================================
-- AUDITORIA
-- =====================================================
CREATE TABLE auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED,
  accion VARCHAR(100),
  entidad VARCHAR(100),
  entidad_id BIGINT UNSIGNED,
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
