# STORAGE_MIGRATION_REPORT

Objetivo: identificar y mapear todas las rutas y puntos del código que usan Forge/Manus/S3/legacy uploads y proponer la migración a Supabase Storage.

1) Resumen de hallazgos (archivos clave)
- `server/storage.ts` — implementa presign + PUT directo a S3 vía Forge; devuelve `/manus-storage/{key}` URLs.
- `server/_core/storageProxy.ts` — proxy que obtiene `presign/get` de Forge y redirige (307) a la URL S3.
- `server/carfaxAnalysis.ts` — limpieza/lectura de paths `/manus-storage/` para analizar PDFs.
- `server/_core/dataApi.ts`, `server/_core/voiceTranscription.ts`, `server/_core/imageGeneration.ts`, `server/_core/notification.ts`, `server/_core/heartbeat.ts`, `server/_core/llm.ts` — llaman a `ENV.forgeApiUrl`/`ENV.forgeApiKey` (algunas funciones LLM/Forge no son storage pero dependen de Forge API).
- `client/src/components/Map.tsx` — usa `VITE_FRONTEND_FORGE_API_URL` y `VITE_FRONTEND_FORGE_API_KEY` para proxy de mapas.
- `client` bundle & runtime — contiene referencias a `/manus-storage/` en compiled assets.

2) Tipos de contenido afectados
- Imágenes de vehículos: subida actualmente a S3 vía presign, URLs `/manus-storage/{key}`.
- PDFs de Carfax: almacenados en same storage, accesados por `/manus-storage/` para análisis LLM.
- Archivos adjuntos: idem.


3) Implementación realizada
- Implementé adaptador Supabase en `server/storage.ts` (subida con `supabase.storage.from(bucket).upload`) y mantiene la interfaz existente (`storagePut`, `storageGet`, `storageGetSignedUrl`).
- Implementé shim en `server/_core/storageProxy.ts` que responde a `/manus-storage/*` y redirige (307) a `createSignedUrl` de Supabase (compatibilidad retroactiva).

4) Recomendación de migración (alto nivel)
-- Introducir cliente de Supabase Storage en el cliente (para uploads directos desde navegador, usar signed upload via Supabase client) o mantener uploads vía backend si prefieres no exponer `anon` keys.
-- Actualizar `server/carfaxAnalysis.ts` para resolver URLs de Supabase (descargar por URL pública o mediante cliente con Service Role key si privado).
-- Actualizar cliente (`client/src`) para subir y consumir imágenes desde Supabase Storage y usar `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

4) Plan mínimo de cambios por prioridad
- 1: Añadir variables Supabase a `.env`/Vercel.
- 2: Implementar en `server/storage.ts` un adaptador `uploadToSupabase()` que no borre el original (mantener interfaz existente: return { key, url }).
- 3: Cambiar `registerStorageProxy` para traducir `/manus-storage/*` a Supabase signed URLs (shim) — mínima interrupción.
- 4: Actualizar cliente upload flows para usar Supabase upload endpoints o signed URLs.
- 5: Probar flujo completo: upload image → mostrar image; upload PDF → analizar Carfax.
- 6: Una vez verificado, eliminar código y variables relacionados con Forge Storage / Manus Storage.

5) Riesgos y consideraciones
- Permisos: si los objetos deben ser privados, se requiere `SUPABASE_SERVICE_ROLE_KEY` en servidor para generar signed URLs y descargar en backend.
- Tamaño y límites: Supabase Storage tiene límites y política de buckets; verificar límites (50MB por archivo actualmente usado).
- Integración LLM: Carfax analysis debe poder descargar PDFs; si los PDFs son privados, backend debe actuar como puente.

6) Próximos pasos recomendados
- Implementar adaptador Supabase en `server/storage.ts` y `server/_core/storageProxy.ts` como shim.
- Actualizar `client` a usar Supabase JS para uploads o usar endpoint tRPC que llame a `server/storage.ts`.

---

Generado por la FASE 5 inicial — puedo continuar con los cambios de código cuando confirmes que proceda con la sustitución directa por Supabase Storage.
