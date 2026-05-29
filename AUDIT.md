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
- [x] Extraer `resolverFechas()` — unificado de useServicioManager, useVentaManager. useFiltros usa inicioMes/finMes.
- [x] Extraer `getTodayISO()` + `formatDateISO()` — reemplazado en 21 ocurrencias, 0 restantes
- [x] Exportar `inicioMes()`, `finMes()` — usados por useFiltros

### Crear `src/utils/errorHandler.js`
- [x] Creado `getErrorMessage(error, fallback)` — soporta camposInvalidos + mensaje + err.message
- [ ] Adoptar en los 8 archivos que usan el patron manual (gradual, bajo riesgo)

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

### Catch silenciados — DONE
- [x] 6 catch silenciados reemplazados por console.warn con contexto
- Nota: catch {} en PDFs (addImage) son intencionales — no romper PDF por una imagen

### Keys con indice — DONE
- [x] PasoResumen ticketItems — key compuesta serial+idx
- [x] ServicioCard seriales — key por valor (serial unico)
- [x] ServicioCard items expandidos — key compuesta
- [x] PasoDetalle items y repuestos — key compuesta
- [x] EjecutarAdminSheet items — key compuesta
- [x] ServicioList items (2 instancias) — key compuesta

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

### Inyeccion de dependencias — DONE
- [x] `FileController.java` — constructor injection + SLF4J logger
- [x] `FileStorageService.java` — constructor injection + SLF4J logger

### Logging — DONE
- [x] RepuestoController: 3 printStackTrace → log.error
- [x] ServicioService: 3 printStackTrace + 4 catch ignored → log.warn
- [x] FileController: 2 System.out.println → log.error
- [x] FileStorageService: 1 System.out.println → log.info
- [x] R2StorageService: 3 System.out.println → log.info/warn
- 0 printStackTrace y 0 System.out.println en services/controllers

### Validacion
- [ ] Agregar @Valid en endpoints que reciben @RequestBody sin validar
- [ ] Reemplazar `Map<String, Object>` por DTOs tipados en ServicioController y VentaController
- [ ] Agregar @NotBlank/@NotNull en DTOs principales

### Transaccionalidad
- [ ] Revisar @Transactional en operaciones de RepuestoController que guardan entidad + archivo

---

## Fase 6 — Splitear archivos grandes (riesgo medio)

### Componentes React atomizados:
- [x] `DashboardFinanzas.jsx` (667 → 68) — 5 archivos: TabBalance, TabTecnicos, TabGastos, TabInventario, StatCard
- [x] `DashboardCaja.jsx` (616 → 230) — 5 archivos: PlanificadorBlock, AgendaBlock, AgendaCard, AlertasBlock, estadoConstants
- [x] `EjecutarOrdenSheet.jsx` (625 → 223) — 4 archivos: PasoDetalle, PasoFirmas, PasoCobro, PasoResumenEjecutar
- [x] `RepuestoModal.jsx` (591 → 185) — 3 archivos: FotosUploader, SeccionesPrecios, comprimirFoto util
- [x] `PasoEquipos.jsx` (542 → 274) — 3 archivos: FotoUpload, TicketItemsList, CalculadoraMO
- [x] `ServicioManager.jsx` (648 → 546) — 2 archivos: CobroSheet, DetalleSheet
- [x] `PresupuestosManager.jsx` (518 → 349) — 1 archivo: PresupuestoCard

### PDFs atomizados:
- [x] `pdf/index.js` (1670 → 118) — 4 archivos: generarTecnico, generarPresupuesto, generarVenta, pdfShared
- [x] `pdf/bloques.js` (1044 → 6 re-export) — 5 archivos: clienteEquipo, tablaStats, firmasChecklist, fotosQR, condiciones

### Pendientes:
- [ ] `useServicioForm.js` (746 lineas) — evaluar si se puede dividir (estado muy interdependiente)
- [ ] `ServicioService.java` (678 lineas) — backend: extraer calculos y mapping

---

## Resumen de progreso (sesion 2026-05-29)

### Completado:
- Fase 1: codigo muerto — DONE (-1168 lineas)
- Fase 2: duplicacion (dateUtils, errorHandler) — DONE
- Fase 3: useTheme + inline styles — DONE (38→17 style={{}}, 17 restantes son dinamicos legitimos)
- Fase 6: atomizacion — DONE (9 archivos monoliticos → 40+ archivos focalizados)
  - 8 componentes React atomizados
  - 2 archivos PDF atomizados (index.js + bloques.js)
  - Total: ~6900 lineas de monolitos divididas

### Pendiente:
- Fase 4: malas practicas frontend (catch silenciados, keys con indice, props drilling)
- Fase 5: backend (RepuestoService, @EntityGraph, logging, validacion)
- useServicioForm.js (746 lineas) y ServicioService.java (678 lineas)
- Adoptar errorHandler.js en los 8 archivos con patron manual
- Colores fuera del sistema de diseno (6 archivos)
