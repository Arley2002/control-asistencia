# Frontend (Vue 3 + Vite)

## Requisitos
- Node.js 18+
- npm o pnpm

## Pasos de inicio rápido
1. Dentro de `frontend/` crea el proyecto:
   ```bash
   npm create vite@latest . -- --template vue
   npm install
   ```
2. Instala dependencias sugeridas:
   ```bash
   npm install axios pinia vue-router
   ```
3. Crea un store de autenticación (Pinia) para guardar tokens/rol y proteger rutas.
4. Configura rutas con guards por rol: `/admin`, `/secretario`, `/docente`, `/login`.
5. Usa componentes de tabla con paginación y filtros (buscar por cédula/nombre/municipio; rango de fechas).
6. Implementa un uploader CSV (input file) que envíe `multipart/form-data` a `/reuniones/:id/asistencias`.
7. Descarga de certificados: consumir endpoint y abrir/descargar PDF.

## Estructura sugerida
- `src/main.ts`: bootstrap Vue + router + Pinia
- `src/router/index.ts`: rutas y guards
- `src/stores/auth.ts`: estado de sesión y rol
- `src/api/axios.ts`: instancia con baseURL y auth header
- Vistas:
  - `views/Login.vue`
  - `views/admin/Dashboard.vue`
  - `views/admin/Docentes.vue`
  - `views/admin/Reuniones.vue`
  - `views/admin/Usuarios.vue`
  - `views/secretario/Reuniones.vue` (lista visibles) + `CargaCSV.vue`
  - `views/docente/MisAsistencias.vue` + descarga de certificados

## Configuración de entorno (crear `.env`)
```
VITE_API_BASE=http://localhost:3000
```

## Buenas prácticas
- Usa `debounce` en búsquedas.
- Paginación en todas las tablas.
- Maneja expiración de token: si 401/403, refresca o redirige a login.
- Lazy loading de vistas con `defineAsyncComponent` o `() => import(...)`.
