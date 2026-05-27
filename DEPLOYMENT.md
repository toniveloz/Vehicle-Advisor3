# Instrucciones de despliegue en Railway

## Resumen arquitectónico

**Architecture Unified**: Express sirve tanto la API (tRPC) como el frontend compilado (React) desde un único servidor.

```
Railway (Express 4.21.2 @ Node 20+)
├── /api/trpc/* → tRPC Endpoints
├── /api/storage/* → Presigned URLs (Manus Forge)
├── /api/auth/* → OAuth Callbacks
└── /* → SPA (React + Vite compilado)
```

## Paso 1: Prepara Railway

1. Crea una cuenta en [railway.app](https://railway.app)
2. Conecta tu repositorio GitHub (vehicle-advisor-pro)

## Paso 2: Crea los servicios

### Service 1: MySQL Database

```
Dashboard → New Project → Marketplace
Busca "MySQL" → Add to Project
```

Railway automáticamente genera:
- `DATABASE_URL` (guarda este valor)

### Service 2: Express + tRPC App

```
Dashboard → New Project → Deploy from GitHub
Selecciona: vehicle-advisor-pro
```

## Paso 3: Configura variables de entorno

En el servicio Express (Settings → Variables), agrega **exactamente** estas variables:

### Requerido (sin defaults)

```
DATABASE_URL=postgresql://...    # Copia del MySQL service
JWT_SECRET=your-secret-key       # Elige algo muy seguro
OAUTH_SERVER_URL=https://...     # Tu proveedor OAuth
BUILT_IN_FORGE_API_URL=https://forge.example.com
BUILT_IN_FORGE_API_KEY=your-api-key
```

### Opcional (si tienes OAuth / App ID)

```
VITE_APP_ID=your-app-id
VITE_OAUTH_PORTAL_URL=https://oauth-portal.example.com
OWNER_OPEN_ID=
```

### Para mismo-origen (déja vacías)

```
VITE_API_URL=
CORS_ORIGIN=
VITE_FRONTEND_FORGE_API_URL=https://forge.example.com
VITE_FRONTEND_FORGE_API_KEY=your-api-key
```

## Paso 4: Configura los comandos de build

En el servicio Express (Settings → Build & Execution):

```
Build Command:  npm run build
Start Command:  npm run start
```

## Paso 5: Deploy

Railway automáticamente detecta los cambios y deploya cuando haces push a GitHub.

**O manualmente:**
```
Settings → Redeploy
```

## Paso 6: Verifica el deploy

Railway proporciona una URL pública como: `https://vehicle-advisor-pro-{random}.railway.app`

Prueba en tu navegador:

```
https://vehicle-advisor-pro-{random}.railway.app/
→ Should show home page

https://vehicle-advisor-pro-{random}.railway.app/admin
→ Should show admin panel
```

### Troubleshooting de deploy

**❌ Build fallaen Railway pero funciona local**
- Revisa los logs: `Deployments → Latest → Logs`
- Verifica que npm run build ejecuta sin errores localmente

**❌ Error "Cannot find module" después de deploy**
- `Settings → Clear Build Cache` → Redeploy

**❌ Admin panel carga pero sin datos**
- Verifica `DATABASE_URL` es accesible desde Railway
- En Logs busca: "Error connecting to MySQL"

**❌ Fotos no se cargan / Carfax no se analiza**
- Verifica `BUILT_IN_FORGE_API_URL` y `BUILT_IN_FORGE_API_KEY`
- Asegúrate que la URL puede ser llamada desde Railway

**❌ tRPC devuelve 404**
- El servidor debería estar escuchando en el puerto que Railway asigna automáticamente
- Revisa que `npm run start` inicia sin errores

## Monitoreo

En Railway Dashboard puedes ver:
- **Logs en vivo** → Deployments → Logs
- **Métricas** → Environment → Metrics (CPU, RAM, tráfico)
- **Crashes** → Alerts

## Rollback

Si necesitas volver a una versión anterior:
```
Deployments → Haz click en una versión previa → Redeploy
```

## CI/CD Automático

Railway automáticamente:
1. Detecta push a GitHub
2. Ejecuta `npm run build`
3. Empaqueta `dist/index.js` + `dist/public/`
4. Inicia el servidor

No necesitas hacer nada manual después del primer setup.

## Tips de producción

✅ **Secrets en Railway, no en .env**
- Railway lee las variables de environment automáticamente
- No commitees `.env` a GitHub

✅ **Backups de MySQL**
- Railway proporciona snapshots automáticos
- Dashboard → MySQL → Backups

✅ **Dominios personalizados**
- Settings → Domains → Agregar tu dominio (ej: vehicleadvisor.com)
- Railway proporciona SSL/TLS automáticamente

✅ **Rate limiting (opcional)**
- Agregar Cloudflare frente a Railway para DDoS protection

## Health check

El servidor debería responder:

```bash
# Desde tu máquina
curl https://your-railway-url.railway.app/

# Expected: HTML page (React app)
# Status: 200 OK
```

## Performance

Nuestro setup:
- Frontend: ~510KB JS, ~127KB CSS (minificado + gzipped)
- Backend: ~84KB (esbuild bundle)
- Database: MySQL en Railway (compartido, configurable a pago)
- Storage: Presigned URLs vía Manus Forge (external)

Railway starter plan:
- $5/mes incluye compute + DB
- Escalable si necesitas más

---

**Documentación Railway**: [docs.railway.app](https://docs.railway.app)

**Deploy status**: ✅ Ready to production

**Last update**: May 2026
