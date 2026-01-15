# ASOINCA - Esquema de base de datos

Este repositorio contiene el SQL inicial para crear la base de datos **asoinca_control** en MySQL.

## Requisitos
- MySQL 8.x
- Usuario: `root`
- Contraseña: `1234`

## Cómo crear la base de datos
1. Asegúrate de tener MySQL en ejecución.
2. Desde la raíz del proyecto, ejecuta:

```bash
mysql -u root -p1234 < db/schema.sql
```

Esto creará la base de datos, tablas, llaves foráneas e índices, y cargará los roles básicos (administrador, secretario, docente).

## Esquema incluido
- roles
- usuarios
- municipios
- docentes
- reuniones
- asistencias (único por reunión + docente)
- certificados (único por reunión + docente)
- password_reset_tokens
- auditoria

## Notas
- Las contraseñas deben almacenarse con hash (ej. bcrypt). No se incluye usuario admin inicial para no exponer hashes inseguros.
- Todos los índices clave para búsquedas por cédula, nombre, municipio, reunión y fecha ya están definidos.

## Control de versiones (git)
Si todavía no has iniciado git en este directorio:

```bash
git init
git add .
git commit -m "chore: add initial mysql schema"
```

Recuerda no subir credenciales reales en futuros commits.
