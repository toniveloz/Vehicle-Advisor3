# Vercel Deployment Guide

Este documento describe los pasos y variables necesarias para desplegar Vehicle-Advisor3 en Vercel.

## Variables de entorno (Secrets)
Configura estas variables en Vercel → Project Settings → Environment Variables (Production/Preview/Development según corresponda):

- `DATABASE_URL` — URL de conexión a PostgreSQL (ej: `postgresql://user:pass@host:5432/dbname`).
- `JWT_SECRET` — Secreto para firmar JWT (cadena larga y segura).
- `OAUTH_SERVER_URL` — URL de tu proveedor OAuth (opcional pero recomendado si usas OAuth).
- `OPENAI_API_KEY` — API key de OpenAI.
- `SUPABASE_URL` — URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key de Supabase.
- `SUPABASE_STORAGE_BUCKET` — Nombre del bucket de Supabase Storage.
- `VITE_APP_ID` — ID de la app frontend (opcional).
- `VITE_OAUTH_PORTAL_URL` — URL del portal OAuth (opcional).
- `CORS_ORIGIN` — Valor opcional para el origen permitido en CORS (por defecto se detecta Vercel URL).

Además, añade cualquier otra secret que uses en `.env.example`.

## Vercel configuration (vercel.json)
El proyecto ya contiene `vercel.json` configurado para usar `npm run build` como comando de build y `dist` como output directory. Revisa `vercel.json` y adapta si cambias el build command.

## Pasos de despliegue recomendados

1. Conecta el repositorio en Vercel.
2. Añade las variables listadas arriba en Project Settings → Environment Variables.
3. Ejecuta las migraciones de base de datos antes del primer deploy (NO ejecutar migraciones en cold-start de funciones):

```bash
# Instala dependencias
npm ci

# Ejecuta migraciones (drizzle-kit)
npx drizzle-kit migrate:up
```

4. Construye y prueba localmente (opcional):

```bash
npm run build
npm run preview
```

5. Deploy en Vercel: push a la rama `main` o usa el botón Deploy en Vercel.

6. Probar endpoints serverless con `vercel dev`:

```bash
vercel dev
```

## Rutas importantes

- `/` — Frontend (estático)
- `/api/trpc` — tRPC (JSON)
- `/api/oauth` — OAuth callbacks
- `/api/storageProxy` — Storage proxy

## Recomendaciones y notas técnicas

- No realizar tareas de inicialización/migraciones en cada invocación de función. Ejecuta migraciones por separado en CI o manualmente.
- Si tu código llama a `initializeDatabase()` en startup, refactoriza para que sea idempotente y barato, o bien ejecútalo fuera del path de runtime de funciones.
- Usa `vercel dev` para testear localmente el comportamiento de las funciones serverless.
- Si necesitas tareas programadas o workers persistentes, considera moverlas a un servicio aparte (e.g., Cloud Run, Railway worker, o cron en Vercel Enterprise).

## Troubleshooting

- Si el frontend no carga correctamente, verifica que `dist` contiene los assets y que `vercel.json` apunta a la carpeta correcta.
- Si hay errores de conexión a la DB, revisa `DATABASE_URL` y reglas de acceso/allowlist del host MySQL.
- Para problemas con OAuth, asegúrate de que `OAUTH_SERVER_URL` y callbacks estén configuradas en el proveedor OAuth.

## Comandos útiles

```
npm ci
npm run vercel-build   # usado por Vercel
npm run build          # build del frontend (local)
vercel dev             # emular Vercel localmente
```

---

Si quieres, puedo añadir un job de CI (GitHub Actions) que ejecute las migraciones antes del deploy y que valide el build automáticamente.
