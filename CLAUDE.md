# Dispenser La Tienda — Sistema de Logística
## Contexto del proyecto

App de gestión para técnicos de dispensers de agua. Maneja servicios técnicos,
ventas, clientes, repuestos e inventario. Usada en tablet/mobile en campo.

---

## Stack técnico

### Frontend
- React 18 + Tailwind CSS (arbitrary values, NO inline styles)
- react-select / react-select/creatable para selectores
- react-hot-toast para notificaciones
- Axios para HTTP (instancia en src/services/api.js)
- Context API para estado global (MontosContext, ThemeContext)

### Backend
- Spring Boot + JPA + PostgreSQL
- Puerto 8080 local, accesible via Tailscale (100.72.16.36:8080)
- URL configurada en .env como REACT_APP_API_URL

### Acceso móvil
- Tailscale conecta el celu a la PC servidor
- IP Tailscale de la PC: 100.72.16.36

---

## Sistema de diseño

### Paleta — usar SIEMPRE estos valores

#### Dark mode
- bg-base:    #141414  (fondo general)
- bg-surface: #1C1C1C  (header, sidebar)
- bg-card:    #242424  (cards)
- bg-raised:  #2E2E2E  (inputs, chips)

#### Light mode (warm, NO blanco puro)
- bg-base:    #C8C4BE
- bg-surface: #D8D4CE
- bg-card:    #EDEAE6
- bg-raised:  #C0BCB6

#### Marca
- brand:  #D13A28 (light) / #E8422F (dark) — rojo principal
- gold:   #D48800 (light) / #F0A500 (dark) — acento dorado
- text-1: #1C1917 (light) / #F0EEE9 (dark)
- text-3: #A8A29E (muted en ambos modos)

### Reglas de código frontend
- SIEMPRE Tailwind arbitrary values: bg-[#242424] dark:bg-[#141414]
- NUNCA style={{}} inline
- NUNCA clases slate-*, emerald-*, etc hardcodeadas — usar los colores del sistema
- Componentes < 200 líneas. Si supera, dividir en sub-componentes
- Comentar en español

### Componentes reutilizables disponibles
- src/components/servicio/ServicioUI.jsx → Label, NextBtn, BackBtn, DSCard, DSInput, DSTextarea, M (monto ocultable), buildSelectStyles
- src/context/MontosContext.jsx → useMontos() para ocultar montos sensibles
- src/components/ui/FiltrosPanel.jsx → filtros de fecha/estado/búsqueda
- src/components/ui/Paginacion.jsx → paginación estándar
- src/components/ui/Card.jsx → card base con prop layer

---

## Arquitectura de componentes

### Patrón de formularios (3 pasos)
Los formularios complejos siguen este patrón:
1. PasoCliente → datos del cliente y fecha
2. PasoEquipos/PasoProductos → el trabajo o productos
3. PasoResumen → descuento, rentabilidad (privada), confirmar

Ver: src/components/servicio/ServicioForm.jsx como referencia.

### Hooks principales
- useServicioForm.js → estado completo del flujo de servicio técnico
- useCajaData.js → stats del dashboard
- useFiltros.js → filtros + paginación reutilizable

---

## Endpoints del backend

### Servicios
- GET  /servicios?page=0&size=1000
- POST /servicios
- PUT  /servicios/:id
- DELETE /servicios/:id
- PATCH /servicios/:id/estado

### Clientes / Sedes / Equipos
- GET/POST /clientes
- GET/POST /sedes
- GET/POST /equipos

### Repuestos
- GET/POST /repuestos
- PUT /repuestos/:id

### Ventas / Gastos
- GET/POST /ventas
- GET/POST /gastos
- DELETE /gastos/:id

---

## Bugs conocidos y resueltos
- Sede no encontrada al guardar → resuelto en useServicioForm.js (buildOverrides sin sedeId hardcodeado)
- Equipo 1 se abría solo → resuelto con flujo de 3 pasos
- Toggle cliente nuevo/registrado coexistían → resuelto con modo excluyente

---

## Pendiente v1.0
- [x] VentaManager → rediseño con 3 pasos (PasoClienteVenta, PasoProductosVenta, PasoResumenVenta)
- [x] Auto-sede inteligente (si cliente tiene 1 sede, usarla automáticamente) — en useServicioForm.js
- [x] Repuesto al vuelo → CreatableSelect + api.post('/repuestos') — en PasoProductosVenta
- [x] PresupuestosManager → rediseño
- [x] ClienteManager → Opción C implementada: lista expandible + historial inline + badge alerta 90d + filtros chip + acceso rápido a servicio/venta
- [x] Sidebar + Drawer → colores del sistema
- [ ] Deploy: Railway (backend) + Vercel (frontend) + PostgreSQL cloud3