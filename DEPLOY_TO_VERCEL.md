# DEPLOY_TO_VERCEL

Pasos para desplegar en Vercel (después de migración a Supabase):

1. Configura secretos en Vercel (Project → Settings → Environment Variables):

```
DATABASE_URL
JWT_SECRET
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
BUILT_IN_FORGE_API_URL (si aplica)
BUILT_IN_FORGE_API_KEY (si aplica)
```

2. Configura build command en Vercel: `npm run vercel-build`.
3. Asegúrate de ejecutar migraciones manualmente antes del primer deploy de producción:

```bash
# Ejecutar migraciones contra DATABASE_URL
npx drizzle-kit migrate:up
```

4. Despliega: push a `main` o usar Deploy en Vercel dashboard.
5. Validaciones post-deploy:
- Probar `/api/trpc`.
- Probar uploads y descargas de imágenes y PDFs (E2E).
- Revisar logs y errores en Vercel.
