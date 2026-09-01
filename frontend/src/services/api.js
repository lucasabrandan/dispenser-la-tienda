import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    headers: { 'Content-Type': 'application/json' }
});

// Adjunta el token JWT y limpia Content-Type para FormData
api.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Dejar que el navegador establezca Content-Type con boundary correcto
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Spring Boot tarda ~20-40s en arrancar, entonces 8 reintentos × 5s = 40s de ventana
const MAX_REINTENTOS = 8;
const DELAY_MS       = 5000;

api.interceptors.response.use(
    res => res,
    async error => {
        const config = error.config;

        // Si recibimos 401, el token venció o es inválido — forzar logout
        if (error.response?.status === 401 && !config.url?.includes('/auth/login')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_usuario');
            window.location.reload();
            return Promise.reject(error);
        }

        // Solo reintentar si no hubo respuesta del servidor (red caída / servidor no listo)
        if (!error.response && config) {
            config._reintento = (config._reintento || 0) + 1;
            if (config._reintento <= MAX_REINTENTOS) {
                await new Promise(r => setTimeout(r, DELAY_MS));
                return api(config);
            }
        }
        return Promise.reject(error);
    }
);
// ── Helpers de paginación ────────────────────────────────────────────────────
// Para listas de selección en formularios (dropdowns, selects)
const PAGE_ALL = '?page=0&size=500';

// Construye query string a partir de un objeto de parámetros
function buildQuery(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, v);
    });
    return q.toString() ? `?${q.toString()}` : '';
}

// ── Clientes ─────────────────────────────────────────────────────────────────
export const getClientes  = () => api.get(`/clientes${PAGE_ALL}`);
export const crearCliente = (data) => api.post('/clientes', data);
export const editarCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`);

// ── Sedes ─────────────────────────────────────────────────────────────────────
export const getSedes   = () => api.get(`/sedes${PAGE_ALL}`);
export const crearSede  = (data) => api.post('/sedes', data);
export const editarSede = (id, data) => api.put(`/sedes/${id}`, data);
export const eliminarSede = (id) => api.delete(`/sedes/${id}`);
export const eliminarSedeDefinitivo = (id) => api.delete(`/sedes/${id}/definitivo`);

// ── Equipos ───────────────────────────────────────────────────────────────────
export const getEquipos   = () => api.get(`/equipos${PAGE_ALL}`);
export const crearEquipo  = (data) => api.post('/equipos', data);
export const editarEquipo = (id, data) => api.put(`/equipos/${id}`, data);
export const archivarEquipo = (id) => api.delete(`/equipos/${id}`);
export const restaurarEquipo = (id) => api.patch(`/equipos/${id}/restaurar`);
export const eliminarEquipoDefinitivo = (id) => api.delete(`/equipos/${id}/definitivo`);

// ── Repuestos ─────────────────────────────────────────────────────────────────
// Sin parámetros → para selectores en formularios (carga todos)
// Con parámetros { busqueda, page, size } → para el gestor paginado
export const getRepuestos = (params = {}) =>
    Object.keys(params).length === 0
        ? api.get(`/repuestos${PAGE_ALL}`)
        : api.get(`/repuestos${buildQuery({ page: 0, size: 20, ...params })}`);
export const crearRepuesto  = (data) => api.post('/repuestos', data);
export const editarRepuesto = (id, data) => api.put(`/repuestos/${id}`, data);
export const eliminarRepuesto = (id) => api.delete(`/repuestos/${id}`);

// ── Servicios ─────────────────────────────────────────────────────────────────
// Sin parámetros → carga todo (compatibilidad con formularios/historial)
// Con parámetros → paginación real con filtros (tipo, estado, busqueda, desde, hasta, page, size, sort)
export const getServicios = (params = {}) =>
    Object.keys(params).length === 0
        ? api.get(`/servicios?page=0&size=500&sort=fechaServicio,desc`)
        : api.get(`/servicios${buildQuery({ page: 0, size: 20, sort: 'fechaServicio,desc', ...params })}`);

// Stats resumen del panel — separado de la lista paginada
export const getServiciosResumen = (tipo) =>
    api.get(`/servicios/resumen${tipo ? `?tipo=${tipo}` : ''}`);

export const crearServicio  = (data) => api.post('/servicios', data);
export const editarServicio = (id, data) => api.put(`/servicios/${id}`, data);
export const eliminarServicio = (id) => api.delete(`/servicios/${id}`);

// ── Ventas ────────────────────────────────────────────────────────────────────
export const getVentas  = () => api.get(`/ventas?page=0&size=500`);
export const crearVenta = (data) => api.post('/ventas', data);

// ── Gastos ────────────────────────────────────────────────────────────────────
export const getGastos  = () => api.get(`/gastos?page=0&size=500`);
export const crearGasto = (data) => api.post('/gastos', data);
export const eliminarGasto = (id) => api.delete(`/gastos/${id}`);

// ── Mi Espacio ────────────────────────────────────────────────────────────────
export const getMiEspacio    = () => api.get('/mi-espacio');
export const guardarMiEspacio = (espacioJson) => api.put('/mi-espacio', { espacioJson });

// ── Admin: Usuarios ───────────────────────────────────────────────────────────
export const getUsuarios        = () => api.get('/admin/usuarios');
export const crearUsuario       = (data) => api.post('/admin/usuarios', data);
export const editarUsuario      = (id, data) => api.put(`/admin/usuarios/${id}`, data);
export const cambiarPassword    = (id, data) => api.put(`/admin/usuarios/${id}/password`, data);
export const eliminarUsuario    = (id) => api.delete(`/admin/usuarios/${id}`);

export default api;