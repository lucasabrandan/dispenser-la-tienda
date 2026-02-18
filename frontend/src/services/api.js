import axios from 'axios';

// ACA ESTABA EL PROBLEMA:
// Antes seguro no tenía baseURL o apuntaba mal.
// Ahora forzamos que vaya al puerto 8080 del Backend.
const api = axios.create({
    baseURL: 'http://localhost:8080/api', 
});

// Exportamos las funciones específicas para que el código quede limpio
export const getServicios = () => api.get('/servicios');
export const getSedes = () => api.get('/sedes');
export const getEquipos = () => api.get('/equipos');
export const crearServicio = (data) => api.post('/servicios', data);

// Exportamos la instancia por defecto para usos genéricos (api.get, api.post)
export default api;