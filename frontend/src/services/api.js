import axios from 'axios';

const api = axios.create({
    // Tu IP de servidor
    baseURL: 'http://100.72.16.36:8080/api', 
});

// --- CLIENTES ---
export const getClientes = () => api.get('/clientes');

// --- SEDES ---
export const getSedes = () => api.get('/sedes');

// --- EQUIPOS ---
export const getEquipos = () => api.get('/equipos');

// --- REPUESTOS / INSUMOS ---
export const getRepuestos = () => api.get('/repuestos'); 

// --- SERVICIOS (EL HISTORIAL) ---
export const getServicios = () => api.get('/servicios');

/**
 * CREAR SERVICIO (PRESUPUESTO O VENTA)
 * Axios detectará automáticamente si es JSON o FormData
 */
export const crearServicio = (data) => {
    return api.post('/servicios', data);
};

/**
 * ACTUALIZAR ESTADO (PARA EL BOTÓN DE COBRAR 💰)
 */
export const patchEstadoServicio = (id, nuevoEstado) => {
    return api.patch(`/servicios/${id}/estado`, { estado: nuevoEstado });
};

/**
 * ELIMINAR REGISTRO (PARA EL BOTÓN 🗑️)
 */
export const deleteServicio = (id) => {
    return api.delete(`/servicios/${id}`);
};

export default api;