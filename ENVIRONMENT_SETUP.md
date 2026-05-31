# ENVIRONMENT_SETUP

Resumen de variables necesarias para desarrollo y producción (Vercel + Supabase).

Variables generales (desarrollo & producción):
- `DATABASE_URL` — Postgres connection string (ej: `postgresql://user:pass@host:5432/dbname`).
- `JWT_SECRET` — Secreto para JWT.
- `OAUTH_SERVER_URL` — URL del proveedor OAuth (opcional).

Variables relacionadas con LLM:
- `OPENAI_API_KEY` — OpenAI API key usada por la ruta de análisis Carfax.
- `OPENAI_API_URL` — Optional OpenAI base URL; por defecto se usa `https://api.openai.com/v1/chat/completions`.
- `OPENAI_MODEL` — Modelo OpenAI por defecto (`gpt-4.1-mini`).

Supabase (Storage + Postgres):
- `SUPABASE_URL` — URL del proyecto Supabase (ej: https://xxx.supabase.co).
- `SUPABASE_ANON_KEY` — Public anon key (usado por frontend si usas uploads directos).
- `SUPABASE_SERVICE_ROLE_KEY` — Service Role key (MUST NOT be committed; usar en servidor para acciones privilegiadas).
- `SUPABASE_STORAGE_BUCKET` — Nombre del bucket para fotos y PDFs (ej: `vehicle-photos`).

Vercel specifics:
- Añadir las variables anteriores como Environment Variables en Vercel (Production + Preview según corresponda).
- `VERCEL_URL` se provee automáticamente en runtime.

Notas de seguridad:
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente ni en repositorios.
- Mantener `JWT_SECRET` y `OPENAI_API_KEY` como secrets en Vercel/GHA.

Ejemplo mínimo `.env` (desarrollo):

```
DATABASE_URL=postgresql://user:pass@localhost:5432/vehicle_advisor
JWT_SECRET=dev-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=vehicle-photos
```

Migraciones:
- Ejecuta migraciones manualmente con `npx drizzle-kit migrate:up` apuntando a `DATABASE_URL`.
- No automatizar migraciones en el pipeline de CI o en cold-start de funciones.
