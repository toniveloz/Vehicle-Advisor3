# CI_SETUP

Objetivo: pipeline básico de CI para validar builds, TypeScript y la integridad de las migraciones (sin ejecutarlas en producción).

Descripción general del workflow (GitHub Actions):
- Instala dependencias (`npm ci`).
- Ejecuta `npm run build` (frontend build).
- Ejecuta `npm run check` (TypeScript `tsc --noEmit`).
- Ejecuta validaciones de Drizzle (generación/validación de esquema) sin aplicar migraciones automáticas.

Archivo de ejemplo: `.github/workflows/ci.yml`

Comportamiento clave:
- NO ejecutar `drizzle-kit migrate` en CI automáticamente.
- Validar que los artefactos de build se generan correctamente.
- Reportar fallos y prevenir merge si el build o TypeScript falla.

Cómo usar:
1. Añadir el archivo `.github/workflows/ci.yml` (ejemplo incluido en el repo).
2. Push a rama `main` o PR; Actions ejecutará el pipeline.

Qué valida el pipeline:
- `npm ci` — dependencias instalables.
- `npm run vercel-build` o `npm run build` — build sin errores.
- `npm run check` — TypeScript passes.
- `npx drizzle-kit generate` — valida la generación de migraciones/ajustes (non-destructive).

Ejecución manual (local):

```bash
npm ci
npm run build
npm run check
npx drizzle-kit generate
```
