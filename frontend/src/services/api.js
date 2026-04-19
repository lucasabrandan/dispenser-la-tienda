import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    headers: { 'Content-Type': 'application/json' }
});

// Adjunta el token JWT en cada request si existe
api.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
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
// ── Paginación estándar ──────────────────────────────────────────────────────
const PAGE = '?page=0&size=1000';

// ── Clientes ─────────────────────────────────────────────────────────────────
export const getClientes  = () => api.get(`/clientes${PAGE}`);
export const crearCliente = (data) => api.post('/clientes', data);
export const editarCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`);

// ── Sedes ─────────────────────────────────────────────────────────────────────
export const getSedes   = () => api.get(`/sedes${PAGE}`);
export const crearSede  = (data) => api.post('/sedes', data);
export const editarSede = (id, data) => api.put(`/sedes/${id}`, data);
export const eliminarSede = (id) => api.delete(`/sedes/${id}`);
export const eliminarSedeDefinitivo = (id) => api.delete(`/sedes/${id}/definitivo`);

// ── Equipos ───────────────────────────────────────────────────────────────────
export const getEquipos   = () => api.get(`/equipos${PAGE}`);
export const crearEquipo  = (data) => api.post('/equipos', data);
export const editarEquipo = (id, data) => api.put(`/equipos/${id}`, data);
export const archivarEquipo = (id) => api.delete(`/equipos/${id}`);
export const restaurarEquipo = (id) => api.patch(`/equipos/${id}/restaurar`);
export const eliminarEquipoDefinitivo = (id) => api.delete(`/equipos/${id}/definitivo`);

// ── Repuestos ─────────────────────────────────────────────────────────────────
export const getRepuestos   = () => api.get(`/repuestos${PAGE}`);
export const crearRepuesto  = (data) => api.post('/repuestos', data);
export const editarRepuesto = (id, data) => api.put(`/repuestos/${id}`, data);
export const eliminarRepuesto = (id) => api.delete(`/repuestos/${id}`);

// ── Servicios ─────────────────────────────────────────────────────────────────
export const getServicios   = () => api.get(`/servicios${PAGE}`);
export const crearServicio  = (data) => api.post('/servicios', data);
export const editarServicio = (id, data) => api.put(`/servicios/${id}`, data);
export const eliminarServicio = (id) => api.delete(`/servicios/${id}`);

// ── Ventas ────────────────────────────────────────────────────────────────────
export const getVentas  = () => api.get(`/ventas${PAGE}`);
export const crearVenta = (data) => api.post('/ventas', data);

// ── Gastos ────────────────────────────────────────────────────────────────────
export const getGastos  = () => api.get(`/gastos${PAGE}`);
export const crearGasto = (data) => api.post('/gastos', data);
export const eliminarGasto = (id) => api.delete(`/gastos/${id}`);

export default api;