# Audit de codigo - Dispenser La Tienda
Fecha: 2026-05-28

Diagnostico completo del proyecto. Usar como checklist para limpiar el codebase.
Cada item tiene prioridad y riesgo para decidir orden de ejecucion.

---

## Fase 1 — Codigo muerto (riesgo nulo)

### Frontend - Componentes no usados (borrar)
- [x] `src/components/ordenes/ModalDespachoRapido.jsx` — BORRADO
- [x] `src/components/servicio/ServicioAgenda.jsx` — BORRADO
- [x] `src/components/venta/VentaStats.jsx` — BORRADO
- [x] `src/components/CrearEquipoModal.jsx` — BORRADO
- [x] `src/components/EquipoItem.jsx` — BORRADO

### Frontend - Hooks no usados (borrar)
- [x] `src/hooks/useClienteForm.js` — BORRADO

### Frontend - Utils no usados (borrar)
- [x] `src/utils/migrarTitleCase.js` — BORRADO
- ~~`src/utils/generadorPDFCatalogo.js`~~ — FALSO POSITIVO, se usa en useRepuestoManager
- ~~`src/utils/generadorPDFListaPrecios.js`~~ — FALSO POSITIVO, se usa en useRepuestoManager

### Frontend - Otros archivos muertos
- [x] `src/App.css` — BORRADO

### Frontend - Exports muertos dentro de archivos vivos
- [x] `src/utils/clienteUtils.js` — borrados `diasSinServicio` y `aplicarFiltroChip`
- [x] `src/utils/construirUrlFoto.js` — borrado `fotoUrlABase64`

### Backend - Codigo muerto
- [x] `EquipoSugerenciaDTO.java` — BORRADO
- [x] `GarantiaStatusDTO.java` — BORRADO
- [x] `ServicioService.java` — 2 sobrecargas muertas de `cambiarEstado()` BORRADAS

**Fase 1 completada 2026-05-28. Build verificado OK.**

---

## Fase 2 — Duplicacion (riesgo bajo)

### Crear `src/utils/dateUtils.js`
- [ ] Extraer `resolverFechas()` (3 implementaciones distintas en useServicioManager, useVentaManager, useFiltros)
- [ ] Extraer `getTodayISO()` — `new Date().toISOString().split('T')[0]` repetido en 12 archivos
- [ ] Exportar `inicioMes()`, `finMes()` desde ahi

### Crear `src/utils/errorHandler.js`
- [ ] Extraer `getErrorMessage(error)` — normaliza `err.response?.data?.mensaje || err.message` (40 archivos)

### Usar lo que ya existe
- [ ] Reemplazar `document.documentElement.classList.contains('dark')` por `useTheme()` (8 archivos, 14 ocurrencias)
- [ ] Reemplazar clases de input locales por `DSInput` de `ServicioUI.jsx` (5+ archivos)

### Hooks sugeridos (opcional, no urgente)
- `useApiCall()` — abstrae patron cargando+toast+try/catch (25 archivos)
- `useModalState()` — abstrae `[isOpen, open, close]` (6 archivos)
- `useFormState()` — abstrae `handleChange` con `[e.target.name]` (4 archivos)

---

## Fase 3 — Inline styles y colores (riesgo bajo)

### Inline styles (38 ocurrencias) — migrar a Tailwind arbitrary values
- [ ] `DashboardCaja.jsx` (6 ocurrencias)
- [ ] `DashboardFinanzas.jsx` (6 ocurrencias)
- [ ] `StockQuickSheet.jsx` (2)
- [ ] `RepuestosBottomSheet.jsx` (2)
- [ ] `PresupuestosManager.jsx` (1)
- [ ] `ModalCotizacionVolumen.jsx` (1)
- [ ] `ModalDespacharPresupuesto.jsx` (1)
- [ ] `MisOrdenes.jsx` (3)
- [ ] `DespachoManager.jsx` (2)
- [ ] `PasoEquipos.jsx` (1)
- [ ] `PasoResumen.jsx` (2)
- [ ] `ServicioForm.jsx` (2)
- [ ] `ServicioCard.jsx` (1)
- [ ] `ServicioUI.jsx` (1)
- [ ] `ClienteCard.jsx` (1)
- [ ] `HistorialEquipoModal.jsx` (1)
- [ ] `FirmaPad.jsx` (1)
- [ ] `SwipeColumns.jsx` (1)
- [ ] `ServicioAgenda.jsx` (1) — si se borra en fase 1, ignorar

Nota: algunos style={{}} son dinamicos (width calculado, borderColor variable). Esos pueden quedarse si no hay forma con Tailwind.

### Colores fuera del sistema de diseno
- [ ] `CrearSedeModal.jsx` — slate-*, rose-*, blue-*
- [ ] `CrearEquipoModal.jsx` — slate-*, rose-*
- [ ] `ClienteFormDireccion.jsx` — slate-*, rose-*, blue-*
- [ ] `RepuestoModal.jsx` — emerald-*, blue-*, amber-*, purple-*
- [ ] `ServicioCard.jsx` — blue-*, purple-*, indigo-*
- [ ] `PasoClienteVenta.jsx` — blue-*
- [ ] `ServicioManager.jsx` — red-*

---

## Fase 4 — Malas practicas frontend (riesgo bajo-medio)

### Catch silenciados (agregar al menos console.warn)
- [ ] `DashboardCaja.jsx:39`
- [ ] `useBadges.js:21`
- [ ] `useOrdenes.js:32`
- [ ] `useServicioManager.js:145`
- [ ] `PasoProductosVenta.jsx:27`
- [ ] `VentaManager.jsx:57`
- [ ] `ServicioManager.jsx:173`
- [ ] `ClienteManager.jsx:77`

### Keys con indice en listas que mutan (cambiar a IDs)
Priorizar estos (listas que el usuario reordena/elimina):
- [ ] `PasoResumen.jsx:40,70,171` — items de servicio
- [ ] `PasoEquipos.jsx:397` — repuestos
- [ ] `ServicioCard.jsx:199` — items
- [ ] `EjecutarOrdenSheet.jsx:294` — items
- [ ] `EjecutarAdminSheet.jsx:79` — items
- [ ] `ServicioList.jsx:235,290` — items

### Props drilling
- [ ] `ServicioForm.jsx` — considerar Context para las 40+ props de useServicioForm

---

## Fase 5 — Backend (riesgo medio)

### Arquitectura
- [ ] Crear `RepuestoService.java` — mover logica de RepuestoController (120 lineas de negocio en controller)
- [ ] Extraer logica de FileController a StorageService (decision disco vs R2)
- [ ] Mover logica de ConfiguracionController a ConfiguracionService

### N+1 queries
- [ ] Agregar `@EntityGraph` en `ServicioRepository` para eager-load usuario/cliente/sede
- [ ] Revisar VentaRepository lazy loading

### Inyeccion de dependencias
- [ ] `FileController.java` — cambiar @Autowired fields a constructor injection
- [ ] `FileStorageService.java` — idem

### Logging
- [ ] Reemplazar `e.printStackTrace()` por SLF4J logger (11 ocurrencias en RepuestoController, ServicioService, FileController)
- [ ] Reemplazar `System.out.println` en FileController por logger

### Validacion
- [ ] Agregar @Valid en endpoints que reciben @RequestBody sin validar
- [ ] Reemplazar `Map<String, Object>` por DTOs tipados en ServicioController y VentaController
- [ ] Agregar @NotBlank/@NotNull en DTOs principales

### Transaccionalidad
- [ ] Revisar @Transactional en operaciones de RepuestoController que guardan entidad + archivo

---

## Fase 6 — Splitear archivos grandes (riesgo medio)

Archivos >400 lineas que se beneficiarian de division:

### `pdf/index.js` (1670 lineas)
Dividir en archivos por tipo de PDF (ya parcialmente hecho con pdf/cierreCaja.js, pdf/historialCliente.js)

### `DashboardFinanzas.jsx` (665 lineas)
Extraer: TabBalance, TabGastos, TabInventario, StatCard

### `EjecutarOrdenSheet.jsx` (625 lineas)
Extraer: FotosSection, RepuestosSection, DiagnosticoSection

### `DashboardCaja.jsx` (614 lineas)
Extraer: SectionStats, SectionCajaDiaria, SectionPipeline

### `RepuestoModal.jsx` (591 lineas)
Extraer: PricingSection, ImagenSection, FormFields

### `ServicioService.java` (678 lineas) — backend
Extraer: ServicioCalculationService (stats/rendimiento), ServicioMappingService (mapToDTO/buildSpec)

---

## Notas

- Priorizar fases 1-2 primero: son gratis y limpian mucho
- Fase 3-4 son cosmeticas pero mejoran consistencia
- Fase 5-6 requieren testing manual post-cambio
- NO hacer todo de golpe — un commit por fase
- Testear happy path despues de cada fase
