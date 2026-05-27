# Vehicle Advisor Pro - TODO

## Migración Base
- [x] Copiar esquema de base de datos (drizzle/schema.ts)
- [x] Generar y aplicar migraciones SQL
- [x] Copiar código de servidor (routers, db, carfaxAnalysis, storage)
- [x] Copiar código de cliente (pages, components, hooks, contexts)
- [x] Copiar tipos compartidos (shared/types.ts, shared/const.ts)

## Análisis Carfax Automático en Background
- [x] Implementar sistema de cola/background jobs para procesar PDFs
- [x] Crear endpoint que procese PDFs automáticamente cuando se adjunta
- [x] Integrar extracción de hechos del PDF con IA
- [x] Generar insights automáticos sin intervención del usuario
- [x] Actualizar estado de análisis en tiempo real

## Carrusel Interactivo en Galería de Detalles
- [x] Implementar componente de carrusel con embla-carousel
- [x] Agregar navegación con flechas (anterior/siguiente)
- [x] Crear miniaturas para selección rápida
- [x] Implementar transiciones animadas
- [x] Asegurar navegación por teclado

## Visualización de Fotos de Daño a Pantalla Completa
- [x] Crear componente modal/lightbox
- [x] Implementar apertura a pantalla completa al hacer clic
- [x] Agregar botón X en esquina superior derecha
- [x] Implementar cierre con ESC y click fuera del modal
- [x] Asegurar animaciones suaves

## Pruebas y Validación
- [x] Escribir tests para análisis Carfax automático
- [x] Escribir tests para carrusel interactivo
- [x] Escribir tests para modal de fotos
- [x] Verificar funcionalidad en navegador
- [x] Validar responsive design

## Bugs Reportados
- [x] Corregir error 404 en ruta /admin

## Mejora: Botón de Análisis Manual en Formulario
- [x] Agregar botón de análisis junto a la carga del PDF Carfax
- [x] Implementar análisis manual con IA en background
- [x] Rellenar automáticamente el campo de Notas Adicionales con el resumen
- [x] Mostrar estado de carga durante el análisis
- [x] Manejar errores de análisis

## Bugs Encontrados en Testing
- [x] Corregir error "Vehículo no encontrado" en análisis manual sin vehículo creado

## Cambio de Requisitos: Acceso Público
- [x] Remover restricciones de autenticación en rutas públicas
- [x] Hacer todo el contenido accesible sin iniciar sesión
- [x] Verificar que AdminPanel siga protegido si es necesario

## Mejora: Editar Fotos en Modal de Edición
- [x] Agregar interfaz para editar fotos principales en modal de edición
- [x] Agregar interfaz para editar fotos de daño en modal de edición
- [x] Permitir agregar nuevas fotos
- [x] Permitir eliminar fotos existentes
- [x] Sincronizar cambios con la base de datos

## Bugs Encontrados - Edición de Fotos
- [x] Las fotos no se guardan al editar vehículos - revisar backend
- [x] Corregir mutación update para procesar photosBase64, damages y parts

## Bugs Encontrados - Análisis Carfax
- [x] Corregir error "recommendationLabel incompleto o inválido" en análisis Carfax
- [x] Hacer campos opcionales en extracción de Carfax

## Bugs Críticos - Creación de Vehículos
- [x] Las fotos no se guardan al crear vehículos nuevos (solo en edición funcionan) - CORREGIDO: handleCloseEditModal ahora resetea mainPhotos


## Nueva Funcionalidad: Sistema de Cálculo de Distancia Logística
- [ ] Agregar campos pickup_zipcode y delivery_zipcode a la base de datos
- [ ] Agregar campos distance_miles y logistics_priority_color a la base de datos
- [ ] Implementar autocompletado inteligente de ZIP codes en el formulario
- [ ] Crear motor de cálculo de distancia entre ZIP codes
- [ ] Implementar clasificación visual por colores (Verde/Amarillo/Naranja/Rojo)
- [ ] Agregar indicador visual en la página de listado de vehículos
- [ ] Implementar caching de resultados de distancia
- [ ] Agregar validaciones de ZIP codes
- [ ] Crear componentes reutilizables para indicadores logísticos
