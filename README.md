# Vehicle Advisor Pro

Proyecto fullstack con:
- Frontend: React + Vite
- Backend: Express + tRPC
- Base de datos: MySQL + Drizzle ORM
- Autenticación: JWT + OAuth
- Almacenamiento: Forge Storage API
- Frontend desplegado en: Vercel
- Backend desplegado en: Railway

## Comandos principales

- `npm install`
- `npm run dev` - inicia el servidor Express en modo desarrollo y carga el frontend vía Vite
- `npm run build` - construye frontend y backend para producción
- `npm run build:client` - construye solo el frontend
- `npm run build:server` - construye solo el backend
- `npm run start` - inicia el servidor Express de producción desde `dist/index.js`
- `npm run check` - valida tipos con TypeScript

## Variables de entorno

Crea un archivo `.env` basado en `.env.example` antes de ejecutar.

### Backend

- `DATABASE_URL` - cadena de conexión MySQL
- `JWT_SECRET` - secreto para la firma de tokens/cookies
- `OAUTH_SERVER_URL` - URL del proveedor OAuth
- `BUILT_IN_FORGE_API_URL` - URL base de la API Forge
- `BUILT_IN_FORGE_API_KEY` - clave de API Forge
- `CORS_ORIGIN` - URL del frontend autorizado en producción
- `OWNER_OPEN_ID` - identificador opcional de propietario

### Frontend

- `VITE_API_URL` - URL pública del backend para el frontend
- `VITE_OAUTH_PORTAL_URL` - URL del portal OAuth
- `VITE_APP_ID` - App ID para el frontend
- `VITE_FRONTEND_FORGE_API_URL` - URL pública de Forge para el frontend
- `VITE_FRONTEND_FORGE_API_KEY` - clave pública de Forge para el frontend

## Desarrollo local (Windows)

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env` y completa los valores.
3. Ejecuta el modo de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre `http://localhost:3000`

El servidor Express arranca en `localhost:3000` y el frontend se entrega con Vite en la misma app.

## Despliegue frontend en Vercel

- Build Command: `npm run build:client`
- Output Directory: `dist/public`
- Asegúrate de usar `vercel.json` para las rutas SPA
- Variables de entorno del frontend: `VITE_API_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`

## Despliegue backend en Railway

- Start Command: `npm run start`
- Build Command: `npm run build`
- Variables de entorno del backend: `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `CORS_ORIGIN`, `OWNER_OPEN_ID`
- Railway provee `PORT` automáticamente; el servidor Express lo usa por defecto.

## Consideraciones de producción

- El backend mantiene Express y tRPC funcionando en producción.
- El frontend se construye y se sirve como archivos estáticos desde `dist/public`.
- `vercel.json` asegura que todas las rutas SPA apunten a `index.html`.
- CORS se habilita con orígenes permitidos mediante `CORS_ORIGIN`.
- `VITE_API_URL` se usa en el frontend para direccionar las llamadas tRPC al backend.
- `cross-env` garantiza compatibilidad Windows para `NODE_ENV`.
