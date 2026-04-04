import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    headers: { 'Content-Type': 'application/json' }
});
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