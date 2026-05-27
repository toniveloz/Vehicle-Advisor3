# Vehicle Advisor Pro

Proyecto fullstack profesional con:
- Frontend: React + Vite (compilado)
- Backend: Express + tRPC
- Base de datos: MySQL + Drizzle ORM
- Autenticación: JWT + OAuth
- Almacenamiento: Manus Forge S3
- LLM Analysis: Google Gemini 2.5-flash
- Deploy: Railway (Express sirve frontend + backend unificado)

## Arquitectura

**Deploy Unified**: Todo (frontend compilado + API) se despliega desde un único servidor Express en Railway.

```
Railway (Express Server)
├── /api/trpc/* -> tRPC API endpoints
├── /api/oauth/* -> OAuth callbacks  
├── /storage/* -> Storage proxy (Manus Forge)
└── /* -> Compiled React frontend (SPA)
```

## Comandos principales

```bash
npm install              # instala dependencias
npm run dev             # modo desarrollo (Express + Vite hot reload)
npm run build           # compila frontend (Vite) + backend (esbuild)
npm run start           # inicia servidor Express de producción
npm run preview         # prueba build de producción localmente
npm run check           # valida tipos TypeScript
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores. Ver archivo para detalles.

Mínimo requerido en producción:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing key
- `BUILT_IN_FORGE_API_URL` - Forge API URL
- `BUILT_IN_FORGE_API_KEY` - Forge API Key
- `OAUTH_SERVER_URL` - OAuth provider URL

## Desarrollo local (Windows)

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa los valores

3. Ejecuta el modo de desarrollo:
   ```bash
   npm run dev
   ```
   Esto arranca Express en `http://localhost:3000` con Vite hot reload

4. Abre `http://localhost:3000` en el navegador

## Funcionalidades

✅ **Admin Panel**
- Crear, editar, eliminar vehículos
- Cargar y analizar PDFs Carfax (LLM)
- Subir fotos de vehículos (hasta 5)
- Registrar daños y piezas a reemplazar
- Evaluación interna (con badge "RECOMENDABLE")
- Guardar códigos ZIP y estado para logística

✅ **Home Page**
- Listar vehículos con datos logísticos
- Filtros por estado, precio, evaluación
- Integración Google Maps

✅ **Vehicle Detail**
- Vista completa del vehículo
- Galería de fotos
- Análisis Carfax
- Datos de daño y piezas

✅ **Storage**
- Presigned URLs para S3 (Forge)
- Carga directa de archivos
- Soporte máximo 50MB por archivo

✅ **LLM Analysis**
- Análisis automático de Carfax PDFs
- Extracción de hechos relevantes
- Evaluación de viabilidad de compra
- Google Gemini 2.5-flash

✅ **Error Handling**
- Custom error classes
- Zod validation
- Type safety

## Despliegue en Railway

### Setup Inicial

1. Crea una cuenta en [Railway.app](https://railway.app)
2. Conecta tu repositorio GitHub
3. Crea dos servicios:

   **Service 1: MySQL Database**
   - Marketplace → MySQL
   - Variables generadas automáticamente

   **Service 2: Express App**
   - Import from GitHub → vehicle-advisor-pro
   - Environment Variables (ver `.env.example`)

### Deploy Commands

```
Build: npm run build
Start: npm run start
```

### Verifica el deploy

Railway proporciona una URL pública: `https://your-app.railway.app`

Prueba:
- `/admin` → Admin panel
- `/` → Home page

## Build & Verification

```bash
# Compila frontend y backend
npm run build

# Prueba build de producción localmente
npm run preview
# Abre http://localhost:3000
```

## Troubleshooting

**❌ Error: Invalid URL**
- Asegúrate de que VITE_API_URL esté vacío (para same-origin)

**❌ Admin panel carga pero sin datos**
- Verifica que DATABASE_URL está correcto

**❌ Fotos no se cargan**
- Verifica BUILT_IN_FORGE_API_KEY

**❌ Análisis Carfax falla**
- Verifica que BUILT_IN_FORGE_API_KEY tiene permisos

## Type Safety & Quality

- TypeScript con strict mode
- Drizzle ORM para type-safe queries
- Zod para validación runtime
- tRPC para type-safe API calls
- Drizzle relaciones para FK type safety

## Notas

- El frontend se compila a archivos estáticos en `dist/public`
- Express sirve estos archivos automáticamente en `/*`
- Las rutas API `/api/trpc` son interceptadas antes que el fallback SPA
- El servidor soporta hot reload en desarrollo via Vite
- Todas las imágenes se guardan en S3 via Manus Forge
