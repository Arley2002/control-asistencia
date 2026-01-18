# Backend (Node.js + NestJS sugerido)

## Requisitos
- Node.js 18+
- npm o pnpm
- MySQL en `localhost` (root / 1234) y base `asoinca_control1` creada con `db/schema.sql`

## Estructura sugerida
- `src/main.ts`: bootstrap NestJS
- `src/app.module.ts`: módulo raíz
- Módulos:
  - `auth` (JWT, refresh, recuperación)
  - `usuarios` (admins/secretarios)
  - `docentes`
  - `municipios`
  - `reuniones`
  - `asistencias` (carga CSV)
  - `certificados` (PDF)
  - `auditoria`
- `prisma` o `typeorm` para ORM (recomendado: TypeORM o Prisma)

## Pasos de inicio rápido (NestJS + TypeORM)
1. Instala el CLI (opcional):
   ```bash
   npm install -g @nestjs/cli
   ```
2. Dentro de `backend/` (crear proyecto Nest si aún no existe):
   ```bash
   nest new api
   # o manual: npm init -y; npm install @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs
   ```
3. Instala dependencias principales:
   ```bash
   npm install @nestjs/typeorm typeorm mysql2 class-validator class-transformer @nestjs/jwt passport passport-jwt bcrypt
   npm install --save-dev @types/passport-jwt
   ```
4. Copia/ajusta `.env.example` a `.env`:
   ```
   # Puerto API
   PORT=3000
   # DB
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=1234
   DB_NAME=asoinca_control1
   # JWT
   JWT_SECRET=super_secreto_cambia_esto
   JWT_EXPIRES=15m
   REFRESH_SECRET=super_secreto_refresh
   REFRESH_EXPIRES=7d
   ```
5. Configura TypeORM en `app.module.ts` con las variables `.env`.
6. Genera módulos/servicios/controladores (ejemplo):
   ```bash
   nest g module auth
   nest g service auth
   nest g controller auth
   ```

## Consideraciones técnicas
- Valida roles con guards (`RolesGuard`) y decorador `@Roles(...)`.
- Usa `bcrypt` para hashes.
- Middleware de rate limit en login/cargas grandes.
- Carga CSV: usa streaming (ej. `fast-csv` o parsing manual) y inserciones batch para performance; respeta UNIQUE (reunion_id, docente_id).
- PDFs: usa `puppeteer` o `pdfkit`; considera encolar con Redis/BullMQ para generación asíncrona.
- Logs de auditoría en cada acción sensible.

## Scripts útiles (cuando ya tengas package.json)
- `npm run start:dev`: desarrollo
- `npm run build`: compilación
- `npm run test`: pruebas unitarias

## TODO
- Inicializar proyecto NestJS o Express.
- Definir entidades y migraciones según `db/schema.sql`.
- Implementar endpoints de autenticación, CRUDs, carga CSV y certificados.
