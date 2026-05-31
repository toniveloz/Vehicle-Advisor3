# Instrucciones de despliegue en Vercel

Este repositorio ahora está preparado para desplegarse en Vercel. El frontend se construye con Vite y el backend se expone como funciones en `api/` (Serverless Functions). See `vercel.json` para la configuración de build.

Rutas importantes:

- `/api/trpc` — tRPC (JSON, límite 50mb)
- `/api/oauth` — endpoints OAuth y callbacks
- `/api/storageProxy` — proxy de almacenamiento compatible con URLs legacy /manus-storage

Variables de entorno necesarias (configurar como Secrets en Vercel):

- `DATABASE_URL` — URL de la base de datos PostgreSQL
- `JWT_SECRET` — Secreto para firmar JWT
- `OAUTH_SERVER_URL` — URL del proveedor OAuth
- `OPENAI_API_KEY` — API key de OpenAI
- `SUPABASE_URL` — URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key de Supabase
- `SUPABASE_STORAGE_BUCKET` — Nombre del bucket de Supabase Storage
- `VITE_APP_ID` — ID de la app frontend (opcional)
- `VITE_OAUTH_PORTAL_URL` — URL del portal OAuth (opcional)

Pasos de despliegue recomendados:

1. Configura los Secrets en Vercel (Project Settings → Environment Variables) con las claves listadas arriba.
2. Ejecuta migraciones en un paso separado (CI o manual) antes del primer deploy:

```bash
# Usar drizzle-kit o su herramienta de migraciones contra DATABASE_URL
npx drizzle-kit migrate:up
```

3. En Vercel, build command: `npm run vercel-build` (o `npm run build` según configuración). El output del frontend va a `dist`.
4. Deploy automático: conecta el repo a Vercel y activa Deploys a push.

Notas y recomendaciones:

- No ejecute `initializeDatabase()` ni migraciones en el path de las funciones (evitar realizar migraciones en cold-starts de funciones). Ejecuta migraciones en CI o manualmente.
- Verifica CORS y dominios permitidos si usas dominios personalizados.
- Prueba localmente con `vercel dev` para validar endpoints serverless.

Ver también: `README.md` y `vercel.json` para detalles adicionales.
